import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
import {routeGameDragId, routeTransferError} from "../../lib/constellations.ts";

test("shared games have distinct drag IDs and unsafe transfers are rejected", () => {
  assert.notEqual(routeGameDragId("a", 1), routeGameDragId("b", 1));
  const source = {id: "a", games: [{game_id: 1, status: "current"}]};
  assert.equal(routeTransferError(source, {id: "b", games: []}, 1), null);
  assert.match(routeTransferError(source, {id: "b", games: [{game_id: 1}]}, 1), /already in/);
  assert.match(routeTransferError(source, {id: "b", games: [{game_id: 2, status: "current"}]}, 1), /now-playing/);
  assert.match(routeTransferError(source, {id: "b", games: Array.from({length: 100}, (_, i) => ({game_id: i + 2}))}, 1), /100 games/);
});

test("transfers persist both lists atomically, preserve metadata, and enforce revisions and server-only access", async () => {
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role bypassrls; create table games(id bigint primary key); insert into games select generate_series(1,105); grant all on games to service_role; create table game_pipeline(game_id bigint,position integer,created_at timestamptz);");
    for (const name of ["20261006152124_play_constellations.sql", "20261006190000_reorder_play_routes.sql", "20261008185222_move_play_route_game.sql"])
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    await db.exec("set role service_role");
    const create = async name => (await db.query("select mutate_play_route($1::jsonb) id", [JSON.stringify({action: "create", name})])).rows[0].id;
    const source = await create("Source"), target = await create("Target"), empty = await create("Empty"), other = await create("Other");
    const route = async id => (await db.query("select * from play_routes where id=$1", [id])).rows[0];
    const save = async (id, games) => db.query("select mutate_play_route($1::jsonb)", [JSON.stringify({...await route(id), action: "save", games})]);
    await save(source, [{game_id: 1, status: "completed"}, {game_id: 2, status: "current"}, {game_id: 3, status: "upcoming"}]);
    await save(target, [{game_id: 4, status: "upcoming"}, {game_id: 5, status: "completed"}]);
    await save(other, [{game_id: 1, status: "upcoming"}]);
    const snapshot = async () => ({routes: (await db.query("select * from play_routes order by id")).rows, games: (await db.query("select * from play_route_games order by id")).rows});
    const initial = await snapshot();
    const payload = async (from, to, game, before) => ({source_id: from, source_revision: (await route(from)).revision, destination_id: to, destination_revision: (await route(to)).revision, game_id: game, before_game_id: before});
    const move = body => db.query("select move_play_route_game($1::jsonb)", [JSON.stringify(body)]);
    const request = await payload(source, target, 1, 5);
    await move(request);
    const list = async id => (await db.query("select game_id::int,position,status from play_route_games where route_id=$1 order by position", [id])).rows;
    assert.deepEqual(await list(target), [{game_id: 4,position: 1,status: "upcoming"},{game_id: 1,position: 2,status: "completed"},{game_id: 5,position: 3,status: "completed"}]);
    assert.deepEqual((await list(source)).map(g => [g.game_id,g.position]), [[2,1],[3,2]]);
    const moved = (await db.query("select * from play_route_games where route_id=$1 and game_id=1", [target])).rows[0];
    const original = initial.games.find(g => g.route_id === source && g.game_id === 1);
    assert.equal(moved.id, original.id); assert.deepEqual(moved.created_at, original.created_at);
    assert.equal((await route(source)).revision, request.source_revision + 1);
    assert.equal((await route(target)).revision, request.destination_revision + 1);
    assert.deepEqual((await list(other)).map(g => g.game_id), [1]);
    await move(await payload(source, empty, 2));
    assert.deepEqual(await list(empty), [{game_id: 2,position: 1,status: "current"}]);
    await move(await payload(source, empty, 3)); // Last source game, append to existing route.
    assert.deepEqual(await list(source), []);
    assert.deepEqual((await list(empty)).map(g => [g.game_id,g.position]), [[2,1],[3,2]]);
    async function rejected(body, pattern) {
      const before = await snapshot();
      await assert.rejects(move(body), pattern);
      assert.deepEqual(await snapshot(), before);
    }
    await rejected(request, /Route changed/); // Both revisions are now obsolete.
    const fresh = await payload(target, source, 1);
    await rejected({...fresh, source_revision: fresh.source_revision - 1}, /Route changed/);
    await rejected({...fresh, destination_revision: fresh.destination_revision - 1}, /Route changed/);
    await rejected({...fresh, game_id: 105}, /Route changed/);
    await rejected({...fresh, before_game_id: 105}, /Route changed/);
    await rejected(await payload(target, other, 1), /already in/);
    await rejected({...fresh, destination_id: target}, /Invalid transfer/);
    await save(source, [{game_id: 6, status: "current"}]);
    await rejected(await payload(empty, source, 2), /now-playing/);
    await save(source, Array.from({length: 100}, (_, i) => ({game_id: i+6,status: "upcoming"})));
    await rejected(await payload(empty, source, 3), /100 games/);
    await db.exec("reset role");
    // Force a failure after both lists have been deleted to verify transaction rollback.
    await db.exec(`create function reject_fixture_insert() returns trigger language plpgsql as $$ begin if new.game_id=1 and new.route_id='${empty}'::uuid then raise exception 'Fixture insert rejected'; end if; return new; end $$; create trigger reject_fixture_insert before insert on play_route_games for each row execute function reject_fixture_insert(); set role service_role;`);
    await rejected(await payload(target, empty, 1), /Fixture insert rejected/);
    await db.exec("reset role");
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(move(fresh), /permission denied/);
      await assert.rejects(db.query("select * from play_route_games"), /permission denied/);
      await db.exec("reset role");
    }
    assert.equal((await db.query("select count(*)::int n from games")).rows[0].n,105);
  } finally {await db.close();}
});

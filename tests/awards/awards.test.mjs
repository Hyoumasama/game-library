import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { matchAwardGame, normalizeAwardTitle, awardStats, summarizeAwards } from "../../lib/awards.ts";
const migration = await readFile("supabase/migrations/20261008170017_game_awards.sql", "utf8");
const fixture = { organization:"tga", year:2025, ceremony_name:"Fixture",status:"published",verified:true,verification_notes:"Test fixture only",source_url:"https://example.org",categories:[{key:"game-of-the-year",name:"Game of the Year",display_order:0,entries:[{key:"base",nominee_name:"Example",nominee_type:"game",status:"winner"},{key:"edition",nominee_name:"Example Deluxe Edition",nominee_type:"game",status:"nominee"}]}] };
test("matching preserves editions, accents, identifiers and ambiguity", () => {
  const entry={nominee_type:"game",nominee_name:"Example"};
  assert.equal(matchAwardGame(entry,[{id:1,title:"Example Deluxe Edition"}]),null);
  assert.equal(matchAwardGame(entry,[{id:1,title:"Example"},{id:2,title:"Example"}]),null);
  assert.equal(matchAwardGame({...entry,external_game_id:10},[{id:1,title:"Example",igdb_id:10},{id:2,title:"Example",igdb_id:11}]),1);
  assert.equal(matchAwardGame({...entry,external_game_id:10},[{id:1,title:"Example Remake",igdb_id:10}]),null);
  assert.equal(matchAwardGame({nominee_type:"person",nominee_name:"Example"},[{id:1,title:"Example"}]),null);
  assert.equal(normalizeAwardTitle("  Example™  II "),"example ii");
  assert.notEqual(normalizeAwardTitle("Pokémon"),normalizeAwardTitle("Pokemon"));
});
test("unique-game totals include performance credits without duplicating games", () => {
  const entries=[{id:"1",nominee_name:"Example",nominee_type:"game",game_title:"Example",game_id:1,owned:true,status:"winner",category_key:"game-of-the-year",category_name:"Game of the Year",year:2025},{id:"2",nominee_name:"Actor",nominee_type:"person",game_title:"Example",game_id:1,owned:true,status:"nominee",category_key:"best-performance",year:2025}];
  assert.deepEqual(awardStats(entries),{categories:2,games:1,libraryGames:1,winningGames:1,nominations:2,wins:1,goty:1});
  assert.equal(summarizeAwards(entries).goty,true);
  assert.equal(summarizeAwards(entries).nominations,2);
  assert.equal(awardStats([entries[1]]).games,1);
});
test("migration, idempotent imports, RLS, future links, correction rollback and manual rejection", async () => {
  const db=new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role bypassrls; create table games(id bigint primary key,title text,igdb_id bigint,status text,cover_url text,steam_vertical_cover text); create table canonical_games(id uuid primary key,title text,igdb_id bigint); create table game_identity_links(game_id bigint primary key references games(id) on delete cascade,canonical_game_id uuid references canonical_games(id) on delete cascade,confidence numeric); grant all on games,canonical_games,game_identity_links to service_role; insert into games values(1,'Example',10,'Unplayed',null,null);");
    await db.exec(migration); await db.exec(migration);
    for(const title of ["Pokémon’s™\u00a0 II", "Example‘Name®", "  Example  II "]) assert.equal((await db.query("select award_normalize_title($1) as title",[title])).rows[0].title,normalizeAwardTitle(title));
    for(let i=0;i<2;i++) await db.query("select import_award_event($1::jsonb)",[JSON.stringify(fixture)]);
    assert.equal((await db.query("select count(*)::int n from award_entries")).rows[0].n,2);
    assert.equal((await db.query("select game_id from award_entries where entry_key='base'")).rows[0].game_id,1);
    assert.equal((await db.query("select count(*)::int n from games")).rows[0].n,1);
    await db.exec("insert into games values(2,'Example Deluxe Edition',11,'Wishlist',null,null)");
    assert.equal((await db.query("select game_id from award_entries where entry_key='edition'")).rows[0].game_id,2);
    assert.equal((await db.query("select owned from award_details where nominee_name='Example Deluxe Edition'")).rows[0].owned,false);
    await db.exec("insert into games values(3,'Example',10,'Unplayed',null,null)");
    assert.equal((await db.query("select game_id from award_entries where entry_key='base'")).rows[0].game_id,null);
    await db.exec("insert into canonical_games values('00000000-0000-0000-0000-000000000001','Example',10); insert into game_identity_links values(1,'00000000-0000-0000-0000-000000000001',1),(3,'00000000-0000-0000-0000-000000000001',1)");
    assert.equal((await db.query("select game_id from award_entries where entry_key='base'")).rows[0].game_id,1);
    assert.equal((await db.query("select match_method from award_entries where entry_key='base'")).rows[0].match_method,"canonical");
    assert.deepEqual((await db.query("select library_game_ids from award_details where nominee_name='Example'")).rows[0].library_game_ids.sort(),[1,3]);
    await db.exec("update award_entries set match_method='blocked',game_id=null where entry_key='edition'; update games set title='Example Deluxe Edition' where id=2");
    assert.equal((await db.query("select game_id from award_entries where entry_key='edition'")).rows[0].game_id,null);
    const invalid=structuredClone(fixture);invalid.categories[0].entries[1].status="winner";
    await assert.rejects(db.query("select import_award_event($1::jsonb)",[JSON.stringify(invalid)]));
    assert.equal((await db.query("select status from award_events")).rows[0].status,"published");
    await assert.rejects(db.query("select import_award_event($1::jsonb)",[JSON.stringify({...fixture,categories:null})]));
    await assert.rejects(db.query("select import_award_event($1::jsonb)",[JSON.stringify({...fixture,categories:[fixture.categories[0],fixture.categories[0]]})]));
    const corrected=structuredClone(fixture); corrected.categories[0].entries.reverse(); corrected.categories[0].entries[0].status="winner";corrected.categories[0].entries[1].status="nominee";
    await db.query("select import_award_event($1::jsonb)",[JSON.stringify(corrected)]);
    assert.equal((await db.query("select entry_key from award_entries where status='winner'")).rows[0].entry_key,"edition");
    for(const role of ["anon","authenticated"]) {
      await db.exec(`set role ${role}`);
      for(const table of ["award_events","award_categories","award_event_categories","award_entries","award_details"]) await assert.rejects(db.query(`select * from ${table}`),/permission denied/);
      await assert.rejects(db.query("update award_entries set game_id=1"));
      await assert.rejects(db.query("select import_award_event($1::jsonb)",[JSON.stringify(fixture)]));
      await db.exec("reset role");
    }
    // The artificial 2025 fixture contains a protected rejection. Remove this test-only
    // event explicitly before importing real history; replacement must not erase it.
    await db.exec("delete from award_events where ceremony_name='Fixture'");
    // Import every historical fixture twice, including honorary multi-recipient categories.
    for(let year=2014;year<=2025;year++) {
      const event=JSON.parse(await readFile(`data/awards/tga-${year}.json`,"utf8"));
      assert.equal(event.status,"published");assert.equal(event.verified,true);assert.equal(event.gaps.length,0);
      for(let i=0;i<2;i++) await db.query("select import_award_event($1::jsonb)",[JSON.stringify(event)]);
      assert.equal((await db.query("select count(*)::int n from award_entries e join award_events v on v.id=e.award_event_id where v.year=$1",[year])).rows[0].n,event.categories.reduce((n,c)=>n+c.entries.length,0));
    }
    const seed=await readFile("supabase/migrations/20261008172122_seed_game_awards_history.sql","utf8");
    await db.exec(seed);await db.exec(seed);
    const history=JSON.parse(await readFile("data/awards/history-report.json","utf8"));
    assert.equal((await db.query("select count(*)::int n from award_entries")).rows[0].n,history.reduce((n,y)=>n+y.entries,0));
    assert.equal((await db.query("select count(*)::int n from award_events where status='published'")).rows[0].n,12);
  } finally { await db.close(); }
});

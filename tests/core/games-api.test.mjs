import test from "node:test";
import assert from "node:assert/strict";
import { reset, tables, calls, failNext } from "./database.mjs";
import { POST } from "../../app/api/admin/games/route.ts";
import { GET, PATCH, DELETE } from "../../app/api/admin/games/[id]/route.ts";

const body = { title: "Test Game", genres: ["Adventure"], status: "Unplayed", score: "80", hoursPlayed: "2.5", earnedAwards: 5, totalAwards: 10 };
const request = (method, value = body) => new Request("http://test.local/api/admin/games", { method, body: JSON.stringify(value), headers: { "Content-Type": "application/json" } });
const params = { params: Promise.resolve({ id: "42" }) };

test("add game persists original library fields and achievements", async () => {
  reset();
  const response = await POST(request("POST"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
  const game = tables.get("games")[0];
  assert.equal(game.title, "Test Game"); assert.equal(game.slug, "test-game");
  assert.equal(game.score, 80); assert.equal(game.hours_played, 2.5);
  assert.deepEqual(game.genres, ["Adventure"]);
  assert.equal(tables.get("game_achievements")[0].game_id, game.id);
  assert.equal(tables.get("game_achievements")[0].completion_percentage, 50);
  assert.deepEqual(calls.map((c) => c.table), ["games", "game_achievements"]);
});
test("failed achievement creation rolls back the new game", async () => {
  reset(); failNext("game_achievements", "upsert", "Cannot save achievements");
  const response = await POST(request("POST"));
  assert.equal(response.status, 500); assert.deepEqual(tables.get("games"), []);
});
test("invalid add payload does not touch the database", async () => {
  reset();
  assert.equal((await POST(request("POST", { title: "Test" }))).status, 400);
  assert.equal((await POST(request("POST", { title: "", genres: [] }))).status, 400);
  assert.deepEqual(calls, []);
});
test("read game returns the library record and achievements", async () => {
  reset(); tables.set("games", [{ id: 42, title: "Existing" }]);
  tables.set("game_achievements", [{ game_id: 42, earned_awards: 3 }]);
  const response = await GET(new Request("http://test.local"), params);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).game.title, "Existing");
});
test("edit game updates only the selected library record", async () => {
  reset(); tables.set("games", [{ id: 42, title: "Existing" }, { id: 43, title: "Other" }]);
  const response = await PATCH(request("PATCH", { ...body, title: "Updated" }), params);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).game.title, "Updated");
  assert.equal(tables.get("games")[1].title, "Other");
  assert.equal(tables.get("game_achievements")[0].game_id, 42);
  assert.deepEqual(calls.map((c) => c.table), ["games", "game_achievements"]);
});
test("delete game removes its original dependent rows and preserves other games", async () => {
  reset(); tables.set("games", [{ id: 42 }, { id: 43 }]);
  tables.set("game_achievements", [{ game_id: 42 }, { game_id: 43 }]);
  tables.set("monthly_play_logs", [{ game_id: 42 }, { game_id: 43 }]);
  const response = await DELETE(new Request("http://test.local", { method: "DELETE" }), params);
  assert.equal(response.status, 200);
  assert.deepEqual(tables.get("games"), [{ id: 43 }]);
  assert.deepEqual(tables.get("game_achievements"), [{ game_id: 43 }]);
  assert.deepEqual(tables.get("monthly_play_logs"), [{ game_id: 43 }]);
  assert.deepEqual(calls.map((c) => c.table), ["game_achievements", "monthly_play_logs", "games"]);
});

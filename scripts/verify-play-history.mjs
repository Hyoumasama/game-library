import assert from "node:assert/strict";
async function load(query) {
  const response = await fetch(`http://localhost:3101/api/games-lite?${query}`);
  assert.equal(response.status, 200);
  return response.json();
}
const data = await load("status=Never%20Played");
assert.ok(data.total > 0);
assert.equal(data.total, data.stats.total_games);
assert.ok(data.games.every(g => g.status === "Unplayed" && !g.completed_elsewhere));
const legacy = await load("playHistory=never-played");
assert.deepEqual(data.games.map(g => g.id), legacy.games.map(g => g.id));
console.log(JSON.stringify({ total: data.total, statsTotal: data.stats.total_games, pageCount: data.games.length, legacyMatches: true }));

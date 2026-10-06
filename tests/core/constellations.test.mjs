import test from "node:test";
import assert from "node:assert/strict";
import {
  displayState,
  orderedGames,
  getConnectionState,
} from "../../lib/constellations.ts";

test("connections use either endpoint status with current taking priority", () => {
  assert.equal(getConnectionState("completed", "current"), "current");
  assert.equal(getConnectionState("current", "normal"), "current");
  assert.equal(getConnectionState("completed", "normal"), "completed");
  assert.equal(getConnectionState("normal", "completed"), "completed");
  assert.equal(getConnectionState("normal", "current"), "current");
  assert.equal(getConnectionState("normal", "normal"), "normal");
});
const entries = (statuses) =>
  statuses.map((status, i) => ({
    game_id: i + 1,
    position: i + 1,
    status,
    game: { id: i + 1 },
  }));
test("library Playing and Completed drive node states without writing route data", () => {
  const games = entries(["upcoming", "upcoming", "upcoming", "upcoming"]);
  games[0].game.status = "Completed";
  games[1].game.status = "Playing";
  assert.deepEqual(games.map((_, i) => displayState(games, i)), ["completed", "current", "normal", "normal"]);
  assert.ok(games.every(g => g.status === "upcoming"));
});
test("unplayed games remain normal without choosing a next game", () => {
  const games = entries(["completed", "upcoming", "upcoming"]);
  assert.deepEqual(
    games.map((_, i) => displayState(games, i)),
    ["completed", "normal", "normal"],
  );
  assert.equal(games[1].status, "upcoming");
});
test("current does not promote another game to a next state", () => {
  const games = entries(["upcoming", "current", "completed", "upcoming"]);
  assert.deepEqual(
    games.map((_, i) => displayState(games, i)),
    ["normal", "current", "completed", "normal"],
  );
});
test("reordering retains route statuses and assigns contiguous positions", () => {
  const games = entries(["completed", "current", "upcoming"]);
  const reordered = orderedGames([games[2], games[0], games[1]]);
  assert.deepEqual(
    reordered.map((g) => [g.game_id, g.position, g.status]),
    [
      [3, 1, "upcoming"],
      [1, 2, "completed"],
      [2, 3, "current"],
    ],
  );
});

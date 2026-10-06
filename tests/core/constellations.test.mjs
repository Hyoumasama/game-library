import test from "node:test";
import assert from "node:assert/strict";
import { displayState, orderedGames } from "../../lib/constellations.ts";
const entries = (statuses) =>
  statuses.map((status, i) => ({
    game_id: i + 1,
    position: i + 1,
    status,
    game: { id: i + 1 },
  }));
test("no current is inferred; first unfinished game is visually next", () => {
  const games = entries(["completed", "upcoming", "upcoming"]);
  assert.deepEqual(
    games.map((_, i) => displayState(games, i)),
    ["completed", "next", "upcoming"],
  );
  assert.equal(games[1].status, "upcoming");
});
test("next follows explicit current and skips completed games", () => {
  const games = entries(["upcoming", "current", "completed", "upcoming"]);
  assert.deepEqual(
    games.map((_, i) => displayState(games, i)),
    ["upcoming", "current", "completed", "next"],
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

import test from "node:test";
import assert from "node:assert/strict";
import { parseRefreshOptions, matchesRefreshScope, needsRefresh, metadataPatch, releaseCutoff } from "../../lib/metadataRefresh.ts";

const options = { types: ["metadata", "hltb", "metacritic"], scope: "all", months: 3, includeUpcoming: false, mode: "missing" };
const now = new Date("2026-11-15T12:00:00Z");
test("refresh selection covers release boundaries, upcoming/TBA and owned scope", () => {
  const game = { id: 1, title: "Game", status: "Wishlist", release: "2026-08-15" };
  assert.equal(matchesRefreshScope(game, options, now), true);
  assert.equal(matchesRefreshScope({ ...game, release: "2026-08-14" }, options, now), false);
  for (const release of ["2027-03-01", null]) {
    assert.equal(matchesRefreshScope({ ...game, release }, options, now), false);
    assert.equal(matchesRefreshScope({ ...game, release }, { ...options, includeUpcoming: true }, now), true);
  }
  assert.equal(matchesRefreshScope(game, { ...options, scope: "owned" }, now), false);
  assert.equal(matchesRefreshScope({ ...game, status: "Completed" }, { ...options, scope: "owned" }, now), true);
  assert.equal(matchesRefreshScope({ ...game, release: "1998-01-01" }, { ...options, months: 0 }, now), true);
  assert.equal(releaseCutoff(1, new Date("2026-03-31T12:00:00Z")), "2026-02-28");
});
test("missing-only patches preserve filled fields and all mode never erases on empty source data", () => {
  const game = { id: 1, title: "Game", summary: "My text", score: 0, genres: [], hltb_main: 5 };
  const incoming = { summary: "New text", score: 85, genres: ["RPG"], hltb_main: null, publisher: "" };
  assert.deepEqual(metadataPatch(game, incoming, "missing"), { score: 85, genres: ["RPG"] });
  assert.deepEqual(metadataPatch(game, incoming, "all"), { summary: "New text", score: 85, genres: ["RPG"] });
  assert.equal(needsRefresh({ ...game, score: 85 }, "metacritic", "missing"), false);
  assert.equal(needsRefresh({ ...game, hltb_locked: true }, "hltb", "all"), false);
  assert.equal(needsRefresh({ ...game, hltb_locked: true }, "metadata", "all"), true);
});
test("refresh options reject invalid and unbounded requests", () => {
  assert.deepEqual(parseRefreshOptions(options), options);
  for (const patch of [{ types: [] }, { types: ["unknown"] }, { months: -1 }, { months: 1.5 }, { months: 1201 }, { scope: "invalid" }, { mode: "invalid" }, { includeUpcoming: "true" }]) {
    assert.throws(() => parseRefreshOptions({ ...options, ...patch }), /Invalid/);
  }
});

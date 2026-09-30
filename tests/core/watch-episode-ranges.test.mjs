import test from "node:test";
import assert from "node:assert/strict";
import { formatEpisodeRanges, parseEpisodeRanges } from "../../lib/watchEpisodeRanges.ts";

const twelve = Array.from({ length: 12 }, (_, index) => index + 1);

test("parses all, empty and ranges", () => {
  assert.deepEqual(parseEpisodeRanges("all", twelve), { episodes: twelve });
  assert.deepEqual(parseEpisodeRanges("  ", twelve), { episodes: [] });
  assert.deepEqual(parseEpisodeRanges("1-3, 5, 7 - 8, 3", twelve), { episodes: [1, 2, 3, 5, 7, 8] });
});

test("rejects bad or out-of-season ranges", () => {
  assert.ok("error" in parseEpisodeRanges("1-13", twelve));
  assert.ok("error" in parseEpisodeRanges("5-2", twelve));
  assert.ok("error" in parseEpisodeRanges("one", twelve));
});

test("formats owned episodes back to ranges", () => {
  assert.equal(formatEpisodeRanges([], twelve), "");
  assert.equal(formatEpisodeRanges(twelve, twelve), "all");
  assert.equal(formatEpisodeRanges([5, 1, 2, 3, 7, 8], twelve), "1-3, 5, 7-8");
  assert.deepEqual(parseEpisodeRanges(formatEpisodeRanges([1, 2, 4], twelve), twelve), { episodes: [1, 2, 4] });
});

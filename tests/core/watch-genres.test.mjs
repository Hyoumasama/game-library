import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWatchGenres } from "../../lib/watchGenres.ts";

test("folds movie genres into the TMDB TV pairs and drops Animation", () => {
  assert.deepEqual(
    normalizeWatchGenres(["Animation", "Action", "Adventure", "Science Fiction", "Fantasy", "Comedy"]),
    ["Action & Adventure", "Sci-Fi & Fantasy", "Comedy"]
  );
  assert.deepEqual(
    normalizeWatchGenres(["Action & Adventure", "action", "War", "War & Politics", " Drama "]),
    ["Action & Adventure", "War & Politics", "Drama"]
  );
  assert.deepEqual(normalizeWatchGenres("Comedy"), []);
});

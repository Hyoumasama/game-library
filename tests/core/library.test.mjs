import test from "node:test";
import assert from "node:assert/strict";
import { mapDbGameToUiGame, getAchievementBadge } from "../../lib/gameMappers.ts";
import { buildGamePayload, buildAchievementPayload, parseAdminGameMetadata } from "../../lib/server/adminGamePayload.ts";

test("library mapping preserves original game details and cover preference", () => {
  const record = { id: 42, title: "Game", release: "2001-09-24", status: "Completed", cover_url: "cover", steam_vertical_cover: "vertical", developer: "Studio", screenshots: "image1,image2", game_achievements: [{ completion_percentage: 100 }] };
  const mapped = mapDbGameToUiGame(record);
  assert.equal(mapped.id, 42); assert.equal(mapped.Title, "Game");
  assert.equal(mapped.Release, "2001-09-24"); assert.equal(mapped.Status, "Completed");
  assert.equal(mapped.Cover, "vertical"); assert.equal(mapped.developer, "Studio");
  assert.equal(mapped.screenshots, "image1,image2"); assert.equal(mapped.achievement_badge, "100completion");
  assert.equal(mapped.game_achievements, undefined);
});
test("achievement badges support original joined shapes", () => {
  assert.equal(getAchievementBadge(null), null);
  assert.equal(getAchievementBadge({ platinum: 1 }), "platinum");
  assert.equal(getAchievementBadge([{ platinum: 1, completion_percentage: 100 }]), "100completion");
});
test("admin payload preserves artwork, dates and external identifiers", () => {
  const payload = buildGamePayload({ title: " Game ", genres: [], release: "2001-09-24", igdbId: "481", igdbSlug: "game", steamAppId: "123", coverUrl: "cover", screenshots: "shot", developer: "Studio", dateStarted: "2026-01-01" });
  assert.equal(payload.title, "Game"); assert.equal(payload.release, "2001-09-24");
  assert.equal(payload.igdb_id, "481"); assert.equal(payload.steam_appid, "123");
  assert.equal(payload.igdb_slug, "game");
  assert.equal(payload.cover_url, "cover"); assert.equal(payload.screenshots, "shot");
  assert.equal(payload.date_started, "2026-01-01");
});
test("achievement payload clamps completion and numeric values", () => {
  const payload = buildAchievementPayload({ earnedAwards: 20, totalAwards: 10, bronze: -1, platinum: true }, 42);
  assert.equal(payload.game_id, 42); assert.equal(payload.completion_percentage, 100);
  assert.equal(payload.bronze, 0); assert.equal(payload.platinum, 1);
});

test("omitted admin metadata means preserve existing links", () => {
  assert.deepEqual(parseAdminGameMetadata({}), {
    franchise: null,
    relationships: null,
  });
});

test("explicit metadata clears remain distinguishable from omission", () => {
  assert.deepEqual(parseAdminGameMetadata({ franchise: null }), {
    franchise: { clear: true },
    relationships: null,
  });
  assert.deepEqual(parseAdminGameMetadata({ relationships: [] }), {
    franchise: null,
    relationships: [],
  });
});

test("franchise-only and relationship-only updates preserve the other side", () => {
  assert.deepEqual(parseAdminGameMetadata({ franchise: { id: "f1", name: " Halo " } }), {
    franchise: { id: "f1", name: "Halo" },
    relationships: null,
  });
  assert.deepEqual(parseAdminGameMetadata({ relationships: [{ id: "e1", relationType: "sequel_of", relatedGameId: "g2" }] }), {
    franchise: null,
    relationships: [{ id: "e1", relationType: "sequel_of", relatedGameId: "g2" }],
  });
});

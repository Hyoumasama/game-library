import test from "node:test";
import assert from "node:assert/strict";
import { state, HltbRateLimitError } from "./sources.mjs";
import { refreshMetadataGame } from "../../lib/server/metadataRefresh.ts";
import { POST } from "../../app/api/admin/metadata-refresh/route.ts";
import { createAdminSessionValue } from "../../lib/adminAuth.ts";

process.env.ADMIN_SESSION_SECRET = "isolated-metadata-test";
const options = { types: ["hltb", "metacritic"], scope: "all", months: 0, includeUpcoming: true, mode: "missing" };
test.beforeEach(async () => {
  state.games = [{ id: 1, title: "Game", release: "2026-01-01", hltb_locked: false, hltb_id: 99, hltb_main: 10, hltb_main_extra: null, score: 85 }];
  state.hltb = { hltbId: 99, main: 20, mainExtra: 30, completionist: null, mainCount: 40 };
  state.metacritic = { score: 90, url: "https://www.metacritic.com/game/test/" };
  state.calls = []; state.beforeWrite = null; state.authenticated = true; state.cookie = await createAdminSessionValue();
});
test("real refresh service fills only missing fields using the linked HLTB ID", async () => {
  const result = await refreshMetadataGame(structuredClone(state.games[0]), options);
  assert.equal(state.games[0].hltb_main, 10);
  assert.equal(state.games[0].hltb_main_extra, 30);
  assert.equal(state.games[0].score, 85);
  assert.deepEqual(state.calls, ["hltb-id"]);
  assert.equal(result.results[0].status, "updated");
});
test("locks and concurrent edits survive source lookup", async () => {
  state.beforeWrite = () => { state.games[0].hltb_locked = true; };
  let result = await refreshMetadataGame(structuredClone(state.games[0]), options);
  assert.equal(result.results[0].status, "skipped");
  assert.equal(state.games[0].hltb_main_extra, null);
  state.games[0].hltb_locked = false;
  state.beforeWrite = () => { state.games[0].hltb_main_extra = 7; };
  result = await refreshMetadataGame(structuredClone(state.games[0]), options);
  assert.equal(result.results[0].status, "skipped");
  assert.equal(state.games[0].hltb_main_extra, 7);
});
test("all mode updates score and preserves times missing at source", async () => {
  state.games[0].hltb_completionist = 100;
  await refreshMetadataGame(structuredClone(state.games[0]), { ...options, mode: "all" });
  assert.equal(state.games[0].score, 90);
  assert.equal(state.games[0].hltb_main, 20);
  assert.equal(state.games[0].hltb_completionist, 100);
});
test("source failures are reported and HLTB rate limits halt the run", async () => {
  state.hltb = new HltbRateLimitError("Too many requests");
  const result = await refreshMetadataGame(structuredClone(state.games[0]), options);
  assert.equal(result.halt, true);
  assert.equal(result.results[0].status, "failed");
  assert.equal(state.calls.includes("metacritic"), false);
});
test("IGDB metadata updates use the stored ID and preserve missing source values and Adult artwork rules", async () => {
  const originalFetch = globalThis.fetch;
  process.env.IGDB_CLIENT_ID = "test-client";
  process.env.IGDB_CLIENT_SECRET = "test-secret";
  state.games[0] = { ...state.games[0], igdb_id: 42, genres: ["Adult"], summary: "Keep this summary", screenshots: "steam-image" };
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("oauth2/token")) return Response.json({ access_token: "fixture", expires_in: 3600 });
    assert.equal(String(url), "https://api.igdb.com/v4/games");
    assert.match(init.body, /where id = 42/);
    return Response.json([{ id: 42, slug: "test-game", genres: [{ name: "Role-playing (RPG)" }], screenshots: [{ image_id: "igdb-shot" }], involved_companies: [{ developer: true, company: { name: "Studio" } }] }]);
  };
  try {
    const result = await refreshMetadataGame(structuredClone(state.games[0]), { ...options, types: ["metadata"], mode: "all" });
    assert.equal(result.results[0].status, "updated");
    assert.equal(state.games[0].summary, "Keep this summary");
    assert.equal(state.games[0].developer, "Studio");
    assert.equal(state.games[0].screenshots, "steam-image");
    assert.deepEqual(state.games[0].genres, ["RPG", "Adult"]);
  } finally { globalThis.fetch = originalFetch; }
});
test("unlinked IGDB games are skipped without changing their stored metadata", async () => {
  const original = structuredClone(state.games[0]);
  const result = await refreshMetadataGame(structuredClone(original), { ...options, types: ["metadata"], mode: "all" });
  assert.equal(result.results[0].message, "No linked IGDB game");
  assert.deepEqual(state.games[0], original);
});
function request(body) { return POST(new Request("http://localhost/api/admin/metadata-refresh", { method: "POST", body: JSON.stringify(body) })); }
test("route rejects unauthenticated requests and invalid options before touching data", async () => {
  state.authenticated = false;
  assert.equal((await request({ action: "preview", options })).status, 401);
  state.authenticated = true;
  assert.equal((await request({ action: "refresh", options, id: -1 })).status, 400);
});
test("preview pages beyond 1000 rows without dropping IDs as fields fill", async () => {
  state.games = Array.from({ length: 1205 }, (_, index) => ({ id: index + 1, title: "Game", score: 0 }));
  const response = await request({ action: "preview", options: { ...options, types: ["metacritic"] } });
  const preview = await response.json();
  assert.equal(preview.total, 1205);
  assert.equal(preview.ids.at(-1), 1205);
  const refreshed = await request({ action: "refresh", options: { ...options, types: ["metacritic"] }, id: 1 });
  assert.equal((await refreshed.json()).results[0].status, "updated");
  assert.equal(preview.ids.length, 1205);
});

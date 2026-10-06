import assert from "node:assert/strict";
import { createAdminSessionValue } from "../lib/adminAuth.ts";
const base = "http://localhost:3100";
const cookie = `admin_auth=${await createAdminSessionValue()}`;
async function get() {
  const response = await fetch(`${base}/api/play-routes`);
  assert.equal(response.status, 200);
  return (await response.json()).routes;
}
async function write(body, status = 200) {
  const response = await fetch(`${base}/api/play-routes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify(body),
  });
  assert.equal(response.status, status, await response.clone().text());
  return response.json();
}
const before = await get();
const created = [];
try {
  const unauthorized = await fetch(`${base}/api/play-routes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create", name: "Unauthorized" }),
  });
  assert.equal(unauthorized.status, 401);
  const library = await (await fetch(`${base}/api/pipeline/library`)).json();
  assert.ok(library.games.length >= 2);
  const ids = library.games.slice(0, 2).map((g) => g.id);
  for (let i = 0; i < 2; i++) {
    const result = await write({
      action: "create",
      name: `Verification ${Date.now()} ${i}`,
      icon: "✦",
      accent: "#67e8f9",
      description: "Temporary verification route",
    });
    created.push(result.id);
  }
  for (const id of created) {
    const route = (await get()).find((r) => r.id === id);
    await write({
      ...route,
      action: "save",
      games: ids.map((game_id) => ({ game_id, status: "upcoming" })),
    });
  }
  let route = (await get()).find((r) => r.id === created[0]);
  const stale = { ...route };
  await write({
    ...route,
    action: "save",
    games: [
      { game_id: ids[1], status: "current" },
      { game_id: ids[0], status: "completed" },
    ],
  });
  route = (await get()).find((r) => r.id === created[0]);
  assert.deepEqual(
    route.games.map((g) => [g.game_id, g.position, g.status]),
    [
      [ids[1], 1, "current"],
      [ids[0], 2, "completed"],
    ],
  );
  await write({ ...stale, action: "save" }, 409);
  await write(
    {
      ...route,
      action: "save",
      games: [
        { game_id: ids[0], status: "upcoming" },
        { game_id: ids[0], status: "upcoming" },
      ],
    },
    400,
  );
  assert.equal(
    (await get()).find((r) => r.id === created[0]).revision,
    route.revision,
  );
  await write(
    {
      ...route,
      action: "save",
      games: [{ game_id: Number.MAX_SAFE_INTEGER, status: "upcoming" }],
    },
    400,
  );
  await write({
    ...route,
    action: "save",
    games: [{ game_id: ids[1], status: "current" }],
  });
  assert.equal((await get()).find((r) => r.id === created[0]).games.length, 1);
  console.log(
    "PASS: auth, create, shared games, refresh persistence, reorder, status, conflict, duplicate/non-library rejection, rollback, remove",
  );
} finally {
  for (const id of created) {
    const route = (await get()).find((r) => r.id === id);
    if (route) await write({ ...route, action: "delete" });
  }
  const after = await get();
  assert.deepEqual(after, before);
  console.log("PASS: delete and original routes unchanged");
}
const page = await fetch(`${base}/play-pipeline`);
assert.equal(page.status, 200);
assert.ok((await page.text()).includes("Play Constellations"));
console.log("PASS: page renders");

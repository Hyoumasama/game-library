import { test } from "node:test";
import assert from "node:assert/strict";
import { GET } from "../../app/api/admin/steam-search/route.ts";

test("Steam search keeps results when one details request fails", async (t) => {
  t.mock.method(console, "error", () => {});
  t.mock.method(globalThis, "fetch", async (url) => {
    if (url.includes("storesearch")) {
      return Response.json({ items: [
        { id: 10, name: "Counter-Strike", tiny_image: "cover.jpg" },
        { id: 20, name: "Team Fortress Classic" },
      ] });
    }
    if (url.includes("appids=10&")) return new Response("Unavailable", { status: 429 });
    return Response.json({ 20: { success: true, data: { name: "Team Fortress Classic", developers: ["Valve"] } } });
  });
  const response = await GET(new Request("http://localhost/api/admin/steam-search?query=Valve"));
  const { results } = await response.json();
  assert.equal(response.status, 200);
  assert.equal(results.length, 2);
  assert.equal(results[0].title, "Counter-Strike");
  assert.equal(results[0].coverUrl, "cover.jpg");
  assert.equal(results[1].developer, "Valve");
});

test("Steam search reports upstream errors instead of an empty successful search", async (t) => {
  t.mock.method(console, "error", () => {});
  t.mock.method(globalThis, "fetch", async () => new Response("Unavailable", { status: 503 }));
  for (const query of ["portal", "620"]) {
    const response = await GET(new Request(`http://localhost/api/admin/steam-search?query=${query}`));
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /temporarily unavailable/);
  }
});

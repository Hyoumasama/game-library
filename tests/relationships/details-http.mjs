// Read-only checks against production-rendered pages and current Supabase-backed APIs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const data = JSON.parse(
  readFileSync("data/relationships/semantic-after.json", "utf8"),
);
const base = process.env.RELATIONSHIP_TEST_URL || "http://localhost:3001";
const ids = [
  4843, 298526, 481, 222341, 222486, 673, 121503, 880, 19686, 89354, 143030,
  143619, 517, 117170,
];
const tested = [];
for (const canonical of data.canonical_games.filter(
  (c) =>
    ids.includes(c.igdb_id) ||
    c.normalized_title === "kingdom come deliverance royal edition" ||
    c.normalized_title === "stellar blade demo" ||
    c.normalized_title === "marvel s wolverine" ||
    c.normalized_title === "nickelodeon all star brawl",
)) {
  const r = await fetch(
    `${base}/api/game-relationships?canonical=${canonical.id}`,
    { signal: AbortSignal.timeout(60000) },
  );
  assert.equal(r.status, 200, canonical.title);
  const { detail } = await r.json();
  const copies = data.game_identity_links.filter(
    (l) => l.canonical_game_id === canonical.id,
  );
  assert.equal(detail.copies.length, copies.length, canonical.title);
  for (const edge of detail.relationships) {
    const owned = data.game_identity_links.filter(
      (l) => l.canonical_game_id === edge.other.id,
    );
    assert.equal(edge.other.owned_count, owned.length);
    assert.equal(
      edge.other.library_game_id,
      owned.length ? Math.min(...owned.map((l) => l.game_id)) : null,
    );
  }
  if (canonical.normalized_title === "marvel s wolverine")
    assert.ok(!detail.series.some((s) => s.name === "Marvel's Spider-Man"));
  for (const f of detail.franchises)
    assert.ok(
      [
        "primary",
        "appearance",
        "crossover",
        "hierarchy",
        "unspecified",
      ].includes(f.membership_role),
    );
  const route = copies.length
    ? `/game/${copies[0].game_id}`
    : `/canonical/${canonical.id}`;
  const page = await fetch(`${base}${route}`, {
    signal: AbortSignal.timeout(60000),
  });
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /relationships-heading/);
  if (!copies.length) assert.doesNotMatch(html, /aria-label="Owned copies"/);
  tested.push({
    title: canonical.title,
    canonical: canonical.id,
    route,
    copies: copies.length,
    relationships: detail.relationships.length,
  });
}
console.log(JSON.stringify({ pass: true, cases: tested }, null, 2));

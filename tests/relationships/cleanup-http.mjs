import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const data = JSON.parse(
  readFileSync("data/relationships/cleanup-after.json", "utf8"),
);
const base = process.env.RELATIONSHIP_TEST_URL || "http://localhost:3001";
const pairs = [
  [
    "Enslaved: Odyssey to the West Premium Edition",
    "ENSLAVED: Odyssey to the West ",
    "edition_of",
  ],
  ["Sundered: Eldritch Edition", "Sundered", "enhanced_edition_of"],
  [
    "Star Wars Battlefront II: Celebration Edition",
    "Star Wars Battlefront II",
    "edition_of",
  ],
  ["Dishonored: Definitive Edition", "Dishonored", "edition_of"],
  ["The Talos Principle: Gold Edition", "The Talos Principle", "edition_of"],
  ["Agony UNRATED", "Agony", "enhanced_edition_of"],
  ["Dark Deity: Complete Edition", "Dark Deity", "edition_of"],
  [
    "Kingdom Come: Deliverance Royal Edition",
    "Kingdom Come: Deliverance",
    "edition_of",
  ],
  [
    "Middle-earth: Shadow of War - Definitive Edition",
    "Middle-earth: Shadow of War",
    "edition_of",
  ],
  [
    "Ori and the Blind Forest: Definitive Edition",
    "Ori and the Blind Forest",
    "enhanced_edition_of",
  ],
  [
    "Sid Meier's Civilization VI: Platinum Edition",
    "Sid Meier's Civilization VI",
    "edition_of",
  ],
  [
    "Styx: Shards of Darkness - Deluxe Edition",
    "Styx: Shards of Darkness",
    "edition_of",
  ],
  ["Half-Life 2: Episode One", "Half-Life 2", "episode_of"],
  ["Half-Life 2: Episode Two", "Half-Life 2", "episode_of"],
  ["Hard Reset Redux", "Hard Reset", "remaster_of"],
  [
    "Little Nightmares Enhanced Edition",
    "Little Nightmares",
    "enhanced_edition_of",
  ],
  ["Mafia: Definitive Edition", "Mafia", "remake_of"],
  ["Mafia II: Definitive Edition", "Mafia II", "remaster_of"],
  ["Metro Last Light Redux", "Metro: Last Light", "remaster_of"],
  [
    "The Outer Worlds: Spacer's Choice Edition",
    "The Outer Worlds",
    "remaster_of",
  ],
];
for (const [source, target, type] of pairs) {
  const a = data.canonical_games.find((c) => c.title === source),
    b = data.canonical_games.find((c) => c.title === target);
  assert.ok(a && b, `${source} / ${target}`);
  assert.notEqual(a.id, b.id);
  const response = await fetch(
    `${base}/api/game-relationships?canonical=${a.id}`,
  );
  assert.equal(response.status, 200);
  const { detail } = await response.json();
  const edges = detail.relationships.filter(
    (e) => e.source_game_id === a.id && e.target_game_id === b.id,
  );
  assert.equal(edges.length, 1, source);
  assert.equal(edges[0].relation_type, type, source);
  assert.ok(
    detail.copies.every((g) => g.title.trim() === source.trim()),
    `Mixed copies on ${source}`,
  );
  const page = await fetch(`${base}/canonical/${a.id}`);
  assert.equal(page.status, 200);
}
console.log(
  "PASS: 12 live canonical splits, 8 specific relationship corrections, public detail APIs and canonical pages",
);

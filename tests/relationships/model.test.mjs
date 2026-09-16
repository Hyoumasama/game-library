import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPlan,
  versionCandidate,
} from "../../scripts/relationships/planner.mjs";
import {
  relationshipLabel,
  relationTypes,
} from "../../lib/relationships/model.ts";
import { relationshipPayload } from "../../lib/relationships/validation.ts";
const game = (
  id,
  title,
  igdb_id = null,
  steam_appid = null,
  release = "2020-01-01",
) => ({ id, title, igdb_id, steam_appid, release, platform: "PC" });
test("duplicate ownership copies share a canonical game while all library rows get links", () => {
  const p = buildPlan([game(1, "Example", 10), game(2, "Example", 10)]);
  assert.equal(p.canonical.length, 1);
  assert.equal(p.links.length, 2);
  assert.equal(p.links[0].canonical_game_id, p.links[1].canonical_game_id);
  assert.equal(p.report.duplicate_copies, 1);
});
test("singleton creation is deterministic and title similarity cannot collapse identities", () => {
  const g = [game(1, "Game"), game(2, "Game")];
  const p = buildPlan(g);
  assert.equal(p.canonical.length, 2);
  assert.deepEqual(p, buildPlan(g));
});
test("Steam exact matches map safely without IGDB", () => {
  const p = buildPlan([game(1, "Game", null, 12), game(2, "Game", null, 12)]);
  assert.equal(p.canonical.length, 1);
  assert.equal(p.links[0].match_type, "steam_exact");
});
test("ambiguous identifier matches are isolated for review", () => {
  const p = buildPlan([game(1, "Agony", 10), game(2, "Agony UNRATED", 10)]);
  assert.equal(p.canonical.length, 2);
  assert.equal(p.reviews.filter((r) => r.kind === "identity").length, 1);
  assert.equal(
    p.reviews.filter((r) => r.proposed_relation === "enhanced_edition_of")
      .length,
    1,
  );
  assert.equal(p.report.automatically_accepted, 0);
});
test("conflicting release years cannot collapse Silent Hill identities", () => {
  const p = buildPlan([
    game(1, "Silent Hill 2", 10, null, "2001-01-01"),
    game(2, "Silent Hill 2", 10, null, "2024-01-01"),
  ]);
  assert.equal(p.canonical.length, 2);
  assert.equal(p.reviews[0].kind, "identity");
});
test("Steam cannot override conflicting IGDB identities", () => {
  const p = buildPlan([game(1, "Game", 10, 100), game(2, "Game", 20, 100)]);
  assert.equal(p.canonical.length, 2);
  assert.equal(p.reviews.length, 1);
});
test("rerun preserves existing mappings and reviewed manual identities", () => {
  const games = [game(1, "Game", 10), game(2, "Game", 10)];
  const p = buildPlan(games);
  const rerun = buildPlan(games, p.links, p.canonical);
  assert.equal(rerun.canonical.length, 0);
  assert.equal(rerun.links.length, 0);
});
test("remaster and edition candidates are never accepted from a suffix alone", () => {
  const p = buildPlan([
    game(1, "Alan Wake", 1),
    game(2, "Alan Wake Remastered", 2),
  ]);
  assert.equal(p.reviews[0].proposed_relation, "remaster_of");
  assert.equal(p.versions[0].version_type, "remaster");
  assert.equal(p.report.automatically_accepted, 0);
  assert.equal(
    versionCandidate("Death Stranding: Director's Cut").type,
    "enhanced_edition_of",
  );
  assert.equal(
    versionCandidate("Dishonored: Definitive Edition").type,
    "edition_of",
  );
});
test("numbered titles alone never propose sequels", () => {
  const p = buildPlan([
    game(1, "Unverified Numbered Game", 1),
    game(2, "Unverified Numbered Game 2", 2),
  ]);
  assert.equal(p.reviews.filter((r) => r.proposed_relation === "sequel_of").length, 0);
});
for (const [type, forward, inverse] of [
  ["sequel_of", "Sequel to", "Sequel"],
  ["remaster_of", "Remaster of", "Remaster"],
  ["expansion_of", "Expansion for", "Expansion"],
  ["edition_of", "Edition of", "Edition"],
  ["demo_of", "Demo of", "Demo"],
  ["playtest_of", "Playtest of", "Playtest"],
  ["beta_of", "Beta of", "Beta"],
  ["prologue_of", "Prologue of", "Prologue"],
])
  test(`${type} derives forward and reverse display from one row`, () => {
    const r = { source_game_id: "derived", relation_type: type };
    assert.equal(relationshipLabel(r, "derived"), forward);
    assert.equal(relationshipLabel(r, "original"), inverse);
  });
test("validation rejects self relationships, unknown types, and invalid confidence", () => {
  const id = "11111111-1111-4111-a111-111111111111",
    other = "22222222-2222-4222-a222-222222222222";
  const valid = {
    source_game_id: id,
    target_game_id: other,
    relation_type: "sequel_of",
    confidence: 1,
    source: "manual",
  };
  assert.equal(relationshipPayload(valid).relation_type, "sequel_of");
  assert.throws(() => relationshipPayload({ ...valid, target_game_id: id }));
  assert.throws(() =>
    relationshipPayload({ ...valid, relation_type: "same_game" }),
  );
  assert.throws(() => relationshipPayload({ ...valid, confidence: 1.1 }));
  assert.equal(relationTypes.length, 19);
  for (const type of ["demo_of", "playtest_of", "beta_of", "prologue_of"])
    assert.equal(
      relationshipPayload({ ...valid, relation_type: type }).relation_type,
      type,
    );
});

import { buildEnrichmentPlan } from "../../scripts/relationships/enrichment-planner.mjs";
test("explicit verified IGDB remaster is auto accepted with correct direction", () => {
  const canonical = [
    {
      id: "base",
      igdb_id: 1,
      title: "Alan Wake",
      normalized_title: "alan wake",
      release_date: "2010-01-01",
    },
    {
      id: "derived",
      igdb_id: 2,
      title: "Alan Wake Remastered",
      normalized_title: "alan wake remastered",
      release_date: "2021-01-01",
    },
  ];
  const external = [
    {
      id: 1,
      name: "Alan Wake",
      first_release_date: 1262304000,
      remasters: [2],
    },
    { id: 2, name: "Alan Wake Remastered", first_release_date: 1609459200 },
  ];
  const p = buildEnrichmentPlan(canonical, external);
  assert.equal(p.relationships[0].source_game_id, "derived");
  assert.equal(p.relationships[0].target_game_id, "base");
  assert.equal(p.relationships[0].relation_type, "remaster_of");
  assert.equal(p.reviews.length, 0);
});
test("IGDB title conflicts remain review candidates instead of production relationships", () => {
  const p = buildEnrichmentPlan(
    [
      { id: "base", igdb_id: 1, title: "Base", normalized_title: "base" },
      {
        id: "bad",
        igdb_id: 2,
        title: "Different",
        normalized_title: "different",
      },
    ],
    [
      { id: 1, name: "Base", expansions: [2] },
      { id: 2, name: "Expansion" },
    ],
  );
  assert.equal(p.relationships.length, 0);
  assert.equal(p.reviews[0].proposed_relation, "expansion_of");
});
test("franchise membership never implies direct sequel relationships", () => {
  const p = buildEnrichmentPlan(
    [
      {
        id: "game",
        igdb_id: 1,
        title: "Star Wars Jedi: Survivor",
        normalized_title: "star wars jedi survivor",
      },
    ],
    [
      {
        id: 1,
        name: "Star Wars Jedi: Survivor",
        collections: [{ id: 10, name: "Star Wars Jedi" }],
        franchises: [{ id: 20, name: "Star Wars" }],
      },
    ],
  );
  assert.equal(p.relationships.length, 0);
  assert.equal(p.franchises.length, 1);
  assert.equal(p.series.length, 1);
  assert.equal(p.series_memberships[0].canonical_game_id, "game");
});

test("smart apostrophes in edition names are recognized", () => {
  assert.equal(
    versionCandidate("Death Stranding: Director\u2019s Cut").type,
    "enhanced_edition_of",
  );
});
test("suspicious IGDB edition parent naming is review-only", () => {
  const p = buildEnrichmentPlan(
    [
      {
        id: "a",
        igdb_id: 1,
        title: "Road Trip USA",
        normalized_title: "road trip usa",
      },
      {
        id: "b",
        igdb_id: 2,
        title: "Road Trip USA 2 CE",
        normalized_title: "road trip usa 2 ce",
      },
    ],
    [
      { id: 1, name: "Road Trip USA" },
      { id: 2, name: "Road Trip USA 2 CE", version_parent: 1 },
    ],
  );
  assert.equal(p.relationships.length, 0);
  assert.equal(p.reviews[0].proposed_relation, "edition_of");
});

import {
  canReuseIdentity,
  releaseMarkers,
} from "../../scripts/relationships/planner.mjs";
for (const marker of [
  "Edition",
  "Definitive Edition",
  "Complete Edition",
  "Gold Edition",
  "Royal Edition",
  "Platinum Edition",
  "Deluxe Edition",
  "Premium Edition",
  "Enhanced Edition",
  "Remastered",
  "Remake",
  "Redux",
  "Director's Cut",
  "GOTY",
  "Celebration Edition",
  "UNRATED",
  "Demo",
  "Playtest",
  "Beta",
  "Prologue",
]) {
  test(`${marker} cannot collapse into base through shared external identifiers`, () => {
    assert.ok(releaseMarkers(`Example ${marker}`));
    const p = buildPlan([
      game(1, "Example", 10, 100),
      game(2, `Example ${marker}`, 10, 100),
    ]);
    assert.equal(p.canonical.length, 2);
    assert.notEqual(p.links[0].canonical_game_id, p.links[1].canonical_game_id);
  });
}
test("an existing incorrect manual mapping cannot pull a new edition copy into the base", () => {
  const canonical = {
    id: "base",
    title: "Example",
    normalized_title: "example",
    igdb_id: 10,
    steam_appid: 100,
    release_date: "2020-01-01",
  };
  const p = buildPlan(
    [
      game(1, "Example Deluxe Edition", 10, 100),
      game(2, "Example Deluxe Edition", 10, 100),
    ],
    [{ game_id: 1, canonical_game_id: "base" }],
    [canonical],
  );
  assert.notEqual(p.links[0].canonical_game_id, "base");
  assert.equal(p.links.length, 1);
});
test("genuine copies reuse the verified full release despite another variant sharing its ID", () => {
  const c = {
    id: "edition",
    title: "Example Deluxe Edition",
    normalized_title: "example deluxe edition",
    igdb_id: 10,
    steam_appid: 100,
    release_date: "2020-01-01",
  };
  assert.equal(canReuseIdentity(game(2, c.title, 10, 100), c), true);
  const p = buildPlan(
    [game(2, c.title, 10, 100)],
    [],
    [c, { ...c, id: "base", title: "Example", normalized_title: "example" }],
  );
  assert.equal(p.canonical.length, 0);
  assert.equal(p.links[0].canonical_game_id, "edition");
});
test("punctuation-equivalent reboots still require matching IDs and years", () => {
  const c = {
    title: "Star Wars Battlefront II",
    igdb_id: 26401,
    steam_appid: 1237950,
    release_date: "2017-11-17",
  };
  assert.equal(
    canReuseIdentity(
      game(1, "Star Wars: Battlefront II", 142, 6060, "2005-10-31"),
      c,
    ),
    false,
  );
});

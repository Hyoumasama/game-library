import test from "node:test";
import assert from "node:assert/strict";
import { buildRelatedEntries } from "../../lib/relatedEntries.ts";

const game = (id, release_date = null) => ({ id, title: id, release_date, cover_url: null, library_game_id: null });
const relation = (source_game_id, target_game_id, relation_type) => ({ source_game_id, target_game_id, relation_type });

for (const [current, previous, next] of [["Halo 2", "Halo CE", "Halo 3"], ["Nioh 2", "Nioh", "Nioh 3"]]) {
  test(`${current} derives both installment directions without reverse rows`, () => {
    const entries = buildRelatedEntries(current, [relation(next, current, "sequel_of"), relation(current, previous, "sequel_of")], [game(previous), game(next)]);
    assert.deepEqual(entries.map(e => [e.title, e.label]), [[previous, "Previous Installment"], [next, "Next Installment"]]);
  });
}
test("F.E.A.R. shows next installment before expansions, sorted by release", () => {
  const entries = buildRelatedEntries("fear", [relation("perseus", "fear", "expansion_of"), relation("extraction", "fear", "expansion_of"), relation("fear2", "fear", "sequel_of")], [game("perseus", "2007-11-06"), game("extraction", "2006-10-24"), game("fear2", "2009-02-10")]);
  assert.deepEqual(entries.map(e => [e.title, e.label]), [["fear2", "Next Installment"], ["extraction", "Expansion"], ["perseus", "Expansion"]]);
});
test("prequel_of labels both directions as installment chronology", () => {
  const relations = [relation("sky-3rd", "cold-steel", "prequel_of")];
  assert.deepEqual(
    buildRelatedEntries("sky-3rd", relations, [game("cold-steel")]).map(e => [e.title, e.label]),
    [["cold-steel", "Next Installment"]]
  );
  assert.deepEqual(
    buildRelatedEntries("cold-steel", relations, [game("sky-3rd")]).map(e => [e.title, e.label]),
    [["sky-3rd", "Previous Installment"]]
  );
});
for (const [type, outgoing, incoming] of [
  ["edition_of", "Base Game", "Other Edition"], ["enhanced_edition_of", "Base Game", "Enhanced Edition"],
  ["remake_of", "Original Version", "Remake"], ["remaster_of", "Original Version", "Remastered Version"],
  ["dlc_of", "Base Game", "DLC"], ["expansion_of", "Base Game", "Expansion"],
  ["standalone_expansion_of", "Base Game", "Standalone Expansion"], ["spinoff_of", "Related Game", "Spin-off"],
  ["demo_of", "Full Game", "Demo"], ["playtest_of", "Full Game", "Playtest"], ["beta_of", "Full Game", "Beta"],
  ["collection_contains", "Included Game", "Included In Collection"], ["episode_of", "Base Game", "Episode"],
  ["reboot_of", "Original Series", "Reboot"],
]) {
  test(`${type} labels both directions`, () => {
    const relations = [relation("source", "target", type)];
    assert.equal(buildRelatedEntries("source", relations, [game("target")])[0].label, outgoing);
    assert.equal(buildRelatedEntries("target", relations, [game("source")])[0].label, incoming);
  });
}
test("no relationships, chronology, unrelated rows and dangling identities produce no entries", () => {
  assert.deepEqual(buildRelatedEntries("current", [], []), []);
  assert.deepEqual(buildRelatedEntries("current", [relation("current", "other", "story_before"), relation("x", "other", "sequel_of"), relation("current", "missing", "sequel_of")], [game("other")]), []);
});
test("duplicates collapse and linked library routes survive display mapping", () => {
  const other = { ...game("other"), library_game_id: 42 };
  const row = relation("current", "other", "edition_of");
  const entries = buildRelatedEntries("current", [row, row], [other]);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].library_game_id, 42);
});

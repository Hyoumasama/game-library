import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  displayRelationship,
  gameDestination,
  groupRelationships,
  sortMemberships,
} from "../../lib/relationships/presentation.ts";
// Compile repository JSX in-memory; no browser/test framework dependency is required.
registerHooks({
  resolve(specifier, context, next) {
    if (
      specifier.startsWith(".") &&
      context.parentURL &&
      !/\.[a-z]+$/i.test(specifier)
    ) {
      for (const extension of [".tsx", ".ts"]) {
        const target = new URL(specifier + extension, context.parentURL);
        if (existsSync(target)) return next(target.href, context);
      }
    }
    if (specifier === "next/link" || specifier === "next/image")
      return next(`${specifier}.js`, context);
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith(".tsx"))
      return {
        format: "module",
        shortCircuit: true,
        source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
          compilerOptions: {
            jsx: ts.JsxEmit.ReactJSX,
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
          },
        }).outputText,
      };
    return next(url, context);
  },
});
const { default: Sections } =
  await import("../../components/games/GameRelationshipSections.tsx");
const empty = () => ({
  canonical: { id: "current", title: "Current" },
  version: null,
  copies: [],
  series: [],
  franchises: [],
  relationships: [],
});
const edge = (
  type,
  outgoing = true,
  other = { id: "other", title: "Other", release_date: "2001-01-01" },
) => ({
  id: Math.random().toString(),
  source_game_id: outgoing ? "current" : other.id,
  target_game_id: outgoing ? other.id : "current",
  relation_type: type,
  other,
});
const render = (d) =>
  renderToStaticMarkup(React.createElement(Sections, { detail: d }));
test("empty sections never render headings", () => {
  assert.doesNotMatch(render(empty()), /aria-label|<h3/);
});
test("sequel directions show installment order rather than narrative claims", () => {
  assert.equal(displayRelationship("sequel_of", true), "Previous installment");
  assert.equal(displayRelationship("sequel_of", false), "Next installment");
});
test("version and edition directions have human labels", () => {
  for (const [type, out, reverse] of [
    ["edition_of", "Edition of", "Other edition"],
    ["enhanced_edition_of", "Enhanced edition of", "Enhanced edition"],
    ["remake_of", "Remake of", "Remake"],
    ["remaster_of", "Remaster of", "Remastered version"],
  ]) {
    assert.equal(displayRelationship(type, true), out);
    assert.equal(displayRelationship(type, false), reverse);
  }
});
test("duplicate edges to one canonical render one card and preserve labels", () => {
  const d = empty();
  d.relationships = [edge("edition_of"), edge("remaster_of")];
  assert.equal(groupRelationships(d).versions.length, 1);
  assert.equal(groupRelationships(d).versions[0].labels.length, 2);
  assert.equal((render(d).match(/href="\/canonical\/other"/g) || []).length, 1);
});
test("installments sort by release with unknown dates last", () => {
  const d = empty();
  d.relationships = [
    edge("sequel_of", false, {
      id: "late",
      title: "Later",
      release_date: "2020-01-01",
    }),
    edge("sequel_of", true, {
      id: "early",
      title: "Earlier",
      release_date: "1998-01-01",
    }),
    edge("sequel_of", false, {
      id: "unknown",
      title: "Unknown",
      release_date: null,
    }),
  ];
  assert.deepEqual(
    groupRelationships(d).installments.map((c) => c.game.id),
    ["early", "late", "unknown"],
  );
});
test("preview and spin-off content are separate from expansions; collections are retained", () => {
  const d = empty();
  d.relationships = [
    "dlc_of",
    "demo_of",
    "playtest_of",
    "prologue_of",
    "spinoff_of",
    "collection_contains",
  ].map((t, i) => edge(t, false, { id: String(i), title: t }));
  const g = groupRelationships(d);
  assert.equal(g.expansions.length, 1);
  assert.equal(g.previews.length, 2);
  assert.equal(g.related.length, 3);
  assert.match(render(d), /Demos &amp; Previews/);
});
test("owned copies stay grouped by identity with store aliases", () => {
  const d = empty();
  d.copies = [
    { id: 1, title: "Current", store: "Store A", platform: "PC" },
    { id: 2, title: "Library alias", store: "Store B", platform: "PC" },
  ];
  const html = render(d);
  assert.match(html, /Owned copies/);
  assert.match(html, /Library alias/);
  assert.equal((html.match(/href="\/game\//g) || []).length, 2);
});
test("historical identities have no owned section and use valid canonical routes", () => {
  const d = empty();
  d.relationships = [
    edge("sequel_of", true, {
      id: "original",
      title: "DOOM (1993)",
      owned_count: 0,
    }),
  ];
  const html = render(d);
  assert.doesNotMatch(html, /aria-label="Owned copies"/);
  assert.match(html, /Not owned/);
  assert.equal(
    gameDestination(d.relationships[0].other),
    "/canonical/original",
  );
  assert.equal(gameDestination({ id: "a", library_game_id: 10 }), "/game/10");
});
test("franchise roles sort and render differently without losing crossover memberships", () => {
  const d = empty();
  d.franchises = [
    { id: "a", name: "Guest", membership_role: "appearance" },
    { id: "p", name: "Marvel", membership_role: "primary" },
    { id: "c", name: "Crossover", membership_role: "crossover" },
  ];
  assert.equal(sortMemberships(d.franchises)[0].name, "Marvel");
  const html = render(d);
  assert.match(html, /data-membership-role="primary"/);
  assert.match(html, /data-membership-role="appearance"/);
  assert.match(html, /text-xs text-zinc-400/);
  assert.match(html, /Crossover/);
});
test("series use stable order and display no invented series route", () => {
  const d = empty();
  d.series = [
    { id: "b", name: "Secondary", sort_order: 2 },
    { id: "a", name: "Main", sort_order: 0 },
  ];
  assert.equal(sortMemberships(d.series)[0].name, "Main");
  assert.doesNotMatch(render(d), /href=/);
});
test("server relationship fetch failure renders a recoverable fallback", async () => {
  process.env.SUPABASE_URL ||= "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= "unit-test-key";
  const { supabase } = await import("../../lib/supabase.ts");
  const { default: Server } =
    await import("../../components/games/GameRelationshipsServer.tsx");
  const original = supabase.from,
    log = console.error;
  try {
    supabase.from = () => {
      throw new Error("Simulated unavailable relationship data");
    };
    console.error = () => {};
    const result = await Server({ gameId: 1 });
    const html = renderToStaticMarkup(result);
    assert.match(html, /Connections are temporarily unavailable/);
    assert.match(html, /Try again/);
  } finally {
    supabase.from = original;
    console.error = log;
  }
});
test("data layer paginates ownership, batches peers and preserves direct franchise roles", async () => {
  const { supabase } = await import("../../lib/supabase.ts");
  const { getRelationshipDetail } =
    await import("../../lib/server/relationships/data.ts");
  const original = supabase.from,
    calls = [];
  const canonical = (id) => ({
    id,
    title: id,
    metadata: {},
    release_date: null,
  });
  const f = { id: "franchise", name: "Primary IP" };
  const copies = Array.from({ length: 501 }, (_, i) => ({
    game: { id: i + 1, title: "current", store: "Store", platform: "PC" },
  }));
  try {
    supabase.from = (table) => {
      const state = { table };
      const q = {
        select(columns) {
          state.columns = columns;
          return q;
        },
        eq(key, value) {
          state.eq = [key, value];
          return q;
        },
        in(key, values) {
          state.in = [key, values];
          return q;
        },
        or() {
          return q;
        },
        order() {
          return q;
        },
        range(start, end) {
          state.range = [start, end];
          return q;
        },
        maybeSingle() {
          state.single = true;
          return q;
        },
        then(resolve, reject) {
          calls.push({ ...state });
          let data = [];
          if (table === "canonical_games")
            data = state.single
              ? canonical("current")
              : ["peer", "history"].map(canonical);
          if (table === "game_identity_links")
            data = state.eq
              ? copies
              : [
                  {
                    canonical_game_id: "peer",
                    game: { id: 2, cover_url: "https://example.com/cover.jpg" },
                  },
                  { canonical_game_id: "peer", game: { id: 4 } },
                ];
          if (table === "game_relationships")
            data = [
              {
                ...edge("sequel_of", true, canonical("peer")),
                other: undefined,
                target_game_id: "peer",
              },
              {
                ...edge("remake_of", true, canonical("history")),
                other: undefined,
                target_game_id: "history",
              },
            ];
          if (table === "canonical_game_series")
            data = [
              {
                sort_order: 0,
                series: { id: "s", name: "Series", franchise_id: f.id },
              },
            ];
          if (table === "canonical_game_franchises")
            data = [{ franchise: f, membership_role: "primary" }];
          if (table === "game_franchises") data = [f];
          if (table === "game_versions") data = { name: "Deluxe edition" };
          if (state.range)
            data = data.slice(state.range[0], state.range[1] + 1);
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return q;
    };
    const result = await getRelationshipDetail("current");
    assert.equal(result.copies.length, 501);
    assert.equal(result.copies[500].version_label, "Deluxe edition");
    const peer = result.relationships.find((r) => r.other.id === "peer").other;
    assert.equal(peer.owned_count, 2);
    assert.equal(peer.library_game_id, 2);
    assert.equal(
      result.relationships.find((r) => r.other.id === "history").other
        .owned_count,
      0,
    );
    assert.equal(result.franchises[0].membership_role, "primary");
    assert.equal(
      calls.filter((c) => c.table === "game_identity_links" && c.in).length,
      1,
    );
    assert.equal(calls.filter((c) => c.table === "games").length, 0);
  } finally {
    supabase.from = original;
  }
});

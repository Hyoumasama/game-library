import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Render the real TSX components without starting Next or accessing the database.
const hook = registerHooks({
  resolve(specifier, context, next) {
    return next(
      specifier === "next/image" ? "next/image.js" : specifier,
      context,
    );
  },
  load(url, context, next) {
    if (!url.endsWith(".tsx")) return next(url, context);
    return {
      format: "module",
      shortCircuit: true,
      source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }).outputText,
    };
  },
});
const { default: ConstellationRoute, ConstellationConnections } =
  await import("../../components/constellations/ConstellationRoute.tsx");
hook.deregister();

test("each connection half follows its own game status without hovering", () => {
  const html = renderToStaticMarkup(
    createElement(ConstellationConnections, {
      states: ["completed", "completed", "current", "normal", "normal"],
      active: null,
    }),
  );
  assert.equal((html.match(/class="connection-stroke"/g) || []).length, 8);
  assert.equal((html.match(/<filter /g) || []).length, 1);
  assert.equal(
    (html.match(/class="connection-segment[^"]*has-current/g) || []).length,
    2,
  );
  assert.equal(
    (html.match(/class="connection-segment[^"]*lit/g) || []).length,
    0,
  );
  const strokes = [
    ...html.matchAll(/class="connection-stroke"[^>]+stroke="([^"]+)"/g),
  ].map((match) => match[1]);
  assert.deepEqual(strokes.slice(0, 2), ["#f5c451", "#f5c451"]);
  for (const stroke of strokes.slice(2, 6)) assert.match(stroke, /^url\(#.+-blend\)$/);
  assert.deepEqual(strokes.slice(6), ["var(--route-color)", "var(--route-color)"]);
  assert.equal((html.match(/class="connection-energy"/g) || []).length, 2);
  // Mixed states blend endpoint colors continuously without a transparent midpoint.
  assert.equal((html.match(/<linearGradient /g) || []).length, 4);
  assert.doesNotMatch(html, /<mask |stop-opacity="0"/);
  assert.match(html, /stop-color="#f5c451"/);
  assert.match(html, /stop-color="#f4f7ff"/);
});

test("saved accents, selected state and multi-group connections survive route rendering", () => {
  for (const accent of [
    "#8b5cf6",
    "#67e8f9",
    "#f97316",
    "#ffffff",
    "#000000",
  ]) {
    const route = {
      id: "route",
      name: "Test route",
      icon: "✦",
      accent,
      description: "",
      games: Array.from({ length: 8 }, (_, i) => ({
        game_id: i + 1,
        position: i + 1,
        status: i === 0 ? "completed" : i === 5 ? "current" : "upcoming",
        game: { id: i + 1, title: `Game ${i + 1}` },
      })),
    };
    const html = renderToStaticMarkup(
      createElement(ConstellationRoute, {
        route,
        selected: 6,
        isAdmin: false,
        disabled: false,
        onSelect() {},
        onAdd() {},
        onEdit() {},
      }),
    );
    assert.ok(html.includes(`--route-color:${accent}`));
    assert.match(html, /star-node state-current selected/);
    assert.match(html, /star-node state-normal/);
    assert.doesNotMatch(html, /NEXT|star-position|Continued from #/);
    assert.match(html, /star-node state-completed/);
    assert.equal((html.match(/class="connection-stroke"/g) || []).length, 14);
    const ids = [...html.matchAll(/<filter[^>]+id="([^"]+)"/g)].map(
      (match) => match[1],
    );
    assert.equal(new Set(ids).size, ids.length);
    // Current game #6 emphasizes its preceding segment and both halves of #6 → #7.
    assert.equal(
      (html.match(/class="connection-segment[^"]*has-current/g) || []).length,
      2,
    );
  }
});

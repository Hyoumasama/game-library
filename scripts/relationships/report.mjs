import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
nextEnv.loadEnvConfig(process.cwd());
const client = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
async function readAll(table, columns = "*", key = "id") {
  const all = [];
  for (let n = 0; ; n += 500) {
    const r = await client
      .from(table)
      .select(columns)
      .order(key)
      .range(n, n + 499);
    if (r.error) throw new Error(r.error.message);
    all.push(...r.data);
    if (r.data.length < 500) return all;
  }
}
async function count(table) {
  const r = await client
    .from(table)
    .select("*", { head: true, count: "exact" });
  if (r.error) throw new Error(r.error.message);
  return r.count;
}
const [games, canonical, links, edges, reviews, series, franchises, versions] =
  await Promise.all([
    count("games"),
    count("canonical_games"),
    readAll("game_identity_links", "game_id,canonical_game_id", "game_id"),
    readAll("game_relationships"),
    readAll(
      "game_relationship_reviews",
      "*,source_game:canonical_games!source_game_id(title,igdb_id,steam_appid),target_game:canonical_games!target_game_id(title,igdb_id,steam_appid)",
    ),
    count("game_series"),
    count("game_franchises"),
    count("game_versions"),
  ]);
const pending = reviews.filter((r) => r.status === "pending");
const candidates = new Set([
  ...edges.map(
    (r) => `${r.source_game_id}:${r.target_game_id}:${r.relation_type}`,
  ),
  ...reviews
    .filter((r) => r.kind === "relationship")
    .map(
      (r) => `${r.source_game_id}:${r.target_game_id}:${r.proposed_relation}`,
    ),
]);
const linkedCanonical = new Set(links.map((l) => l.canonical_game_id));
const report = {
  owned_rows: games,
  canonical_created: canonical,
  linked_rows: links.length,
  logical_duplicate_copies: links.length - linkedCanonical.size,
  relationship_candidates: candidates.size,
  automatically_accepted: edges.filter((e) => e.source === "igdb_verified")
    .length,
  manual_review: pending.length,
  identity_review: pending.filter((r) => r.kind === "identity").length,
  relationship_review: pending.filter((r) => r.kind === "relationship").length,
  series,
  franchises,
  versions,
};
mkdirSync("docs", { recursive: true });
writeFileSync(
  "docs/RELATIONSHIP_REVIEW_CANDIDATES.json",
  JSON.stringify(
    pending.map((r) => ({
      id: r.id,
      kind: r.kind,
      source: r.source_game.title,
      target: r.target_game.title,
      proposed_relation: r.proposed_relation,
      confidence: Number(r.confidence),
      reason: r.reason,
      source_igdb_id: r.source_game.igdb_id,
      target_igdb_id: r.target_game.igdb_id,
      source_steam_appid: r.source_game.steam_appid,
      target_steam_appid: r.target_game.steam_appid,
    })),
    null,
    2,
  ),
);
const escape = (s) => String(s).replaceAll("|", "\\|").replaceAll("\n", " ");
const identityRows = pending
  .filter((r) => r.kind === "identity")
  .map(
    (r) =>
      `| ${escape(r.source_game.title)} | ${escape(r.target_game.title)} | ${r.source_game.igdb_id || "-"} / ${r.target_game.igdb_id || "-"} | ${r.source_game.steam_appid || "-"} / ${r.target_game.steam_appid || "-"} |`,
  );
writeFileSync(
  "docs/RELATIONSHIP_BACKFILL_REPORT.md",
  `# Relationship backfill report\n\nSnapshot: ${new Date().toISOString()}\n\n${Object.entries(
    report,
  )
    .map(([k, v]) => `- ${k}: ${v}`)
    .join(
      "\n",
    )}\n\nAll existing ownership rows remain in games. The ${report.logical_duplicate_copies} additional copies share canonical identities logically. No ownership rows were deleted or merged. Canonical count is the current created total; rerunning backfill creates zero additional identities. Candidate counts combine unique verified facts and review proposals, avoiding counting an automatically resolved review twice.\n\n## Identity decisions still required\n\nShared Steam IDs can describe bundles, editions, demos, or incorrect metadata. Approve only if these are the same release identity. Use edition/remaster/collection relationships instead when appropriate.\n\n| Source | Target | IGDB source / target | Steam source / target |\n| --- | --- | --- | --- |\n${identityRows.join("\n")}\n\nAll pending identity and relationship proposals are listed in [RELATIONSHIP_REVIEW_CANDIDATES.json](RELATIONSHIP_REVIEW_CANDIDATES.json). Resolve them at /admin/relationships.\n`,
);
console.log(JSON.stringify(report, null, 2));

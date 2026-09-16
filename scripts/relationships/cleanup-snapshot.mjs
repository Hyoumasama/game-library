import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
nextEnv.loadEnvConfig(process.cwd());
const client = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const phase = process.argv[2];
if (!["before", "after"].includes(phase))
  throw new Error("Use before or after");
async function all(table) {
  const rows = [];
  for (let n = 0; ; n += 500) {
    const { data, error } = await client
      .from(table)
      .select("*")
      .order(
        table === "game_identity_links"
          ? "game_id"
          : table.startsWith("canonical_game_")
            ? "canonical_game_id"
            : "id",
      )
      .range(n, n + 499);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
const tables = [
  "games",
  "canonical_games",
  "game_identity_links",
  "game_versions",
  "game_relationships",
  "game_relationship_reviews",
  "game_series",
  "game_franchises",
  "canonical_game_series",
  "canonical_game_franchises",
];
const values = await Promise.all(tables.map(all));
const snapshot = Object.fromEntries(tables.map((t, i) => [t, values[i]]));
const digest = (rows) =>
  createHash("sha256")
    .update(JSON.stringify(rows.map((r) => JSON.stringify(r)).sort()))
    .digest("hex");
const { data: audit, error } = await client.rpc(
  "audit_game_relationship_integrity",
);
if (error) throw new Error(error.message);
snapshot.audit = audit;
snapshot.games_checksum = digest(snapshot.games);
mkdirSync("data/relationships", { recursive: true });
writeFileSync(
  `data/relationships/cleanup-${phase}.json`,
  JSON.stringify(snapshot, null, 2),
);
const report = {
  phase,
  counts: audit.counts,
  games_checksum: snapshot.games_checksum,
};
if (phase === "after") {
  const before = JSON.parse(
    readFileSync("data/relationships/cleanup-before.json", "utf8"),
  );
  if (before.games_checksum !== snapshot.games_checksum)
    throw new Error("Ownership row content changed");
  for (const t of ["game_series", "game_franchises"])
    if (digest(before[t]) !== digest(snapshot[t]))
      throw new Error(`${t} changed`);
  for (const t of ["canonical_game_series", "canonical_game_franchises"]) {
    const current = new Set(snapshot[t].map(JSON.stringify));
    if (before[t].some((r) => !current.has(JSON.stringify(r))))
      throw new Error(`Existing ${t} membership lost`);
  }
  const protectedEdges = before.game_relationships.filter(
    (e) =>
      e.relation_type === "collection_contains" ||
      ["demo_of", "playtest_of", "beta_of", "prologue_of"].includes(
        e.relation_type,
      ) ||
      [e.source_game_id, e.target_game_id].some((id) =>
        before.canonical_games.some(
          (c) => c.id === id && /^(f\.e\.a\.r\.|dead space)/i.test(c.title),
        ),
      ),
  );
  const current = new Set(snapshot.game_relationships.map(JSON.stringify));
  if (protectedEdges.some((e) => !current.has(JSON.stringify(e))))
    throw new Error("Protected relationship changed");
  report.preservation = {
    ownership_checksum_unchanged: true,
    taxonomies_unchanged: true,
    existing_memberships_preserved: true,
    protected_relationships_preserved: protectedEdges.length,
  };
  report.mapping_changes = snapshot.game_identity_links
    .filter((l) =>
      before.game_identity_links.some(
        (b) =>
          b.game_id === l.game_id &&
          b.canonical_game_id !== l.canonical_game_id,
      ),
    )
    .map((l) => ({
      game_id: l.game_id,
      title: snapshot.games.find((g) => g.id === l.game_id)?.title,
      before: before.game_identity_links.find((b) => b.game_id === l.game_id)
        .canonical_game_id,
      after: l.canonical_game_id,
    }));
  report.removed_version_descriptors = before.game_versions.filter(
    (v) => !snapshot.game_versions.some((x) => x.id === v.id),
  );
  report.removed_relationships = before.game_relationships
    .filter((e) => !snapshot.game_relationships.some((x) => x.id === e.id))
    .map((e) => ({
      ...e,
      source_title: before.canonical_games.find(
        (c) => c.id === e.source_game_id,
      )?.title,
      target_title: before.canonical_games.find(
        (c) => c.id === e.target_game_id,
      )?.title,
    }));
}
writeFileSync(
  `docs/RELATIONSHIP_CLEANUP_${phase.toUpperCase()}.json`,
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));

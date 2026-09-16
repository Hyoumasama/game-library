import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";
import { mkdirSync, writeFileSync } from "node:fs";
import { buildEnrichmentPlan } from "./enrichment-planner.mjs";
nextEnv.loadEnvConfig(process.cwd());
const client = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
async function readAll(table, columns = "*") {
  const rows = [];
  for (let n = 0; ; n += 500) {
    const r = await client
      .from(table)
      .select(columns)
      .order("id")
      .range(n, n + 499);
    if (r.error) throw new Error(r.error.message);
    rows.push(...r.data);
    if (r.data.length < 500) return rows;
  }
}
const canonical = await readAll("canonical_games");
const clientId = process.env.IGDB_CLIENT_ID,
  clientSecret = process.env.IGDB_CLIENT_SECRET;
if (!clientId || !clientSecret)
  throw new Error("IGDB credentials required for enrichment");
const tokenResponse = await fetch("https://id.twitch.tv/oauth2/token", {
  method: "POST",
  body: new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  }),
  signal: AbortSignal.timeout(20000),
});
const token = await tokenResponse.json();
if (!tokenResponse.ok || !token.access_token)
  throw new Error(`IGDB authentication failed (${tokenResponse.status})`);
const ids = [
  ...new Set(
    canonical
      .map((c) => c.igdb_id)
      .filter((id) => Number.isSafeInteger(id) && id > 0),
  ),
];
const metadata = [];
for (let n = 0; n < ids.length; n += 100) {
  const response = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token.access_token}`,
      Accept: "application/json",
    },
    body: `fields name,alternative_names.name,first_release_date,remakes,remasters,dlcs,expansions,standalone_expansions,expanded_games,bundles,version_parent,collections.name,franchise.name,franchises.name; where id = (${ids.slice(n, n + 100).join(",")}); limit 100;`,
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(
      `IGDB metadata failed (${response.status}); no writes applied`,
    );
  metadata.push(...(await response.json()));
  await new Promise((resolve) => setTimeout(resolve, 300));
}
const existingFranchises = await readAll("game_franchises"),
  existingSeries = await readAll("game_series");
const plan = buildEnrichmentPlan(canonical, metadata);
// Reuse existing taxonomies by their external ID or slug rather than overwrite manual names.
for (const f of plan.franchises) {
  const current = existingFranchises.find(
    (x) => x.igdb_franchise_id === f.igdb_franchise_id || x.slug === f.slug,
  );
  if (current) {
    for (const m of plan.franchise_memberships)
      if (m.franchise_id === f.id) m.franchise_id = current.id;
    f.id = current.id;
  }
}
for (const s of plan.series) {
  const current = existingSeries.find((x) => x.slug === s.slug);
  if (current) {
    for (const m of plan.series_memberships)
      if (m.series_id === s.id) m.series_id = current.id;
    s.id = current.id;
  }
}
mkdirSync("data/relationships", { recursive: true });
writeFileSync(
  "data/relationships/enrichment-plan.json",
  JSON.stringify(plan, null, 2),
);
if (process.argv.includes("--apply")) {
  const r = await client.rpc("apply_game_relationship_enrichment", { plan });
  if (r.error) throw new Error(r.error.message);
}
console.log(
  JSON.stringify(
    {
      mode: process.argv.includes("--apply") ? "applied" : "dry-run",
      ...plan.report,
    },
    null,
    2,
  ),
);

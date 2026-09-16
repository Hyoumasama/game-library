import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";
import { writeFileSync, mkdirSync } from "node:fs";
import { buildPlan } from "./planner.mjs";
nextEnv.loadEnvConfig(process.cwd());
const client = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
async function readAll(table, columns = "*") {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .order(
        table === "games"
          ? "id"
          : table === "game_identity_links"
            ? "game_id"
            : "id",
      )
      .range(offset, offset + 499);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
const [games, links, canonical] = await Promise.all([
  readAll("games", "id,title,igdb_id,steam_appid,release,platform"),
  readAll("game_identity_links"),
  readAll("canonical_games"),
]);
const plan = buildPlan(games, links, canonical);
mkdirSync("data/relationships", { recursive: true });
writeFileSync(
  "data/relationships/backfill-plan.json",
  JSON.stringify(plan, null, 2),
);
if (process.argv.includes("--apply")) {
  const { error } = await client.rpc("apply_game_identity_backfill", { plan });
  if (error) throw new Error(error.message);
}
writeFileSync(
  "data/relationships/backfill-report.json",
  JSON.stringify(plan.report, null, 2),
);
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

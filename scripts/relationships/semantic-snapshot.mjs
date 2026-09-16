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
  `data/relationships/semantic-${phase}.json`,
  JSON.stringify(snapshot, null, 2),
);
const report = {
  phase,
  counts: audit.counts,
  games_checksum: snapshot.games_checksum,
};
if(phase==='after'){
 const before=JSON.parse(readFileSync('data/relationships/semantic-before.json','utf8'));
 if(before.games_checksum!==snapshot.games_checksum||snapshot.games.length!==2234)throw new Error('Ownership preservation failed');
 report.games_preserved=true;
 for(const table of ['canonical_games','game_relationships','game_versions','game_series','game_franchises']){
 report[table+'_removed']=before[table].filter(r=>!snapshot[table].some(x=>x.id===r.id));
 report[table+'_added']=snapshot[table].filter(r=>!before[table].some(x=>x.id===r.id));
 report[table+'_changed']=snapshot[table].filter(r=>before[table].some(x=>x.id===r.id&&JSON.stringify(x)!==JSON.stringify(r)));
 }
 for(const table of ['canonical_game_series','canonical_game_franchises']){
 const key=r=>table==='canonical_game_series'?`${r.canonical_game_id}:${r.series_id}`:`${r.canonical_game_id}:${r.franchise_id}`;
 report[table+'_removed']=before[table].filter(r=>!snapshot[table].some(x=>key(x)===key(r)));
 report[table+'_added']=snapshot[table].filter(r=>!before[table].some(x=>key(x)===key(r)));
 report[table+'_changed']=snapshot[table].filter(r=>before[table].some(x=>key(x)===key(r)&&JSON.stringify(x)!==JSON.stringify(r)));
 }
 report.mapping_changes=snapshot.game_identity_links.filter(r=>before.game_identity_links.some(x=>x.game_id===r.game_id&&x.canonical_game_id!==r.canonical_game_id));
}
writeFileSync(`docs/SEMANTIC_CLEANUP_${phase.toUpperCase()}.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({phase,counts:report.counts,games_checksum:report.games_checksum},null,2));

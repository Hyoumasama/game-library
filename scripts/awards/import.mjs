import { readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { matchAwardGame } from "../../lib/awards.ts";
import { loadAwardsLibrary } from "./library.mjs";
import { createHash } from "node:crypto";
const args=process.argv.slice(2), apply=args.includes("--apply");
const paths=args.filter(a=>!a.startsWith("--"));
if(!paths.length) throw Error("Usage: node --env-file=.env.local --experimental-strip-types scripts/awards/import.mjs data/awards/tga-2025.json [--apply]");
// --apply is an explicit write choice. Point AWARDS_SUPABASE_* at a development database.
const url=process.env.AWARDS_SUPABASE_URL || process.env.SUPABASE_URL;
const key=process.env.AWARDS_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if(apply && !process.env.AWARDS_SUPABASE_URL) throw Error("Set AWARDS_SUPABASE_URL explicitly before applying; default production configuration is read-only.");
if(apply && (!process.env.AWARDS_APP_URL || !process.env.AWARDS_ADMIN_SESSION)) throw Error("Set AWARDS_APP_URL and AWARDS_ADMIN_SESSION for the authenticated import route; it invalidates application caches after the transaction.");
const db=createClient(url,key); const games=await loadAwardsLibrary(db);
const report=[];
for(const path of paths) {
  const event=JSON.parse(await readFile(path,"utf8"));
  if(!event.categories?.length || event.gaps?.length) throw Error(`${path}: unresolved extraction gaps`);
  if(new Set(event.categories.map(c=>c.key)).size!==event.categories.length) throw Error(`${path}: duplicate category keys`);
  for(const c of event.categories) {
    if(new Set(c.entries.map(e=>e.key)).size!==c.entries.length || (!c.honorary && c.entries.filter(e=>e.status==="winner").length!==1)) throw Error(`${path}: invalid ${c.name}`);
  }
  if(event.status==="published" && (!event.verified || !event.verification_notes)) throw Error("Publishing requires documented official verification");
  if(apply) {
    const proof=JSON.parse(await readFile('data/awards/verification/publication.json','utf8')).find(p=>p.year===event.year);
    if(!proof?.verified || proof.sha256!==createHash('sha256').update(JSON.stringify(event)).digest('hex'))throw Error(`${path}: payload is not the verified application snapshot`);
  }
  const matches=event.categories.flatMap(c=>c.entries.map(e=>({category:c.key,nominee:e.nominee_name,type:e.nominee_type,game_id:matchAwardGame(e,games)})));
  const eligible=matches.filter(e=>e.type==="game" || (e.type==="person" && event.categories.some(c=>c.entries.some(x=>x.nominee_name===e.nominee && x.game_title))));
  if(apply) {
    const response=await fetch(new URL('/api/admin/awards',process.env.AWARDS_APP_URL),{method:'POST',headers:{'Content-Type':'application/json',Cookie:`admin_auth=${process.env.AWARDS_ADMIN_SESSION}`},body:JSON.stringify({year:event.year,expectedDatabaseUrl:url})});
    if(!response.ok)throw Error(`Import failed (${response.status}): ${await response.text()}`);
  }
  const result={year:event.year,applied:apply,matched:eligible.filter(e=>e.game_id).length,unmatched:eligible.filter(e=>!e.game_id).length,nonGame:matches.length-eligible.length,matches};
  report.push(result); console.log({year:result.year,applied:apply,matched:result.matched,unmatched:result.unmatched,nonGame:result.nonGame});
}
await writeFile("data/awards/matching-report.local.json",JSON.stringify(report,null,2)+"\n");

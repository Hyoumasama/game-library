// Read-only production inventory audit. Generated inventory/matching files stay gitignored.
import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile } from "node:fs/promises";
import { matchAwardGame, normalizeAwardTitle } from "../../lib/awards.ts";
import { loadAwardsLibrary } from "./library.mjs";
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
const games=await loadAwardsLibrary(db);
await writeFile("data/awards/library.local.json",JSON.stringify(games));
const years=[];
for(let year=2014;year<=2025;year++) {
  const event=JSON.parse(await readFile(`data/awards/tga-${year}.json`,"utf8"));
  const entries=event.categories.flatMap(c=>c.entries);
  const eligible=entries.filter(e=>e.nominee_type==="game" || e.nominee_type==="person" && e.game_title);
  const matched=eligible.filter(e=>matchAwardGame(e,games));
  const ambiguous=eligible.filter(e=>!matchAwardGame(e,games) && games.filter(g=>normalizeAwardTitle(g.title)===normalizeAwardTitle(e.game_title || e.nominee_name)).length>1);
  years.push({year,categories:event.categories.length,entries:entries.length,matched:matched.length,unmatched:eligible.length-matched.length,ambiguous:ambiguous.length,nonGame:entries.length-eligible.length,status:event.status});
}
const report={inventorySize:games.length,years,totals:years.reduce((a,y)=>{for(const k of ['entries','matched','unmatched','ambiguous','nonGame'])a[k]=(a[k]||0)+y[k];return a;},{})};
await writeFile("data/awards/library-audit.json",JSON.stringify(report,null,2)+"\n");console.log(report);

import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { agrees, sourceCategory } from './check-source-facts.mjs';
import { matchAwardGame, normalizeAwardTitle } from '../../lib/awards.ts';
const sources=JSON.parse(await readFile('data/awards/verification/sources.json','utf8'));
const games=JSON.parse(await readFile('data/awards/library.local.json','utf8'));
const sha=text=>createHash('sha256').update(text).digest('hex');
const notes={
 2014:'Nominees cross-checked against the contemporary Polygon announcement. The honorary joint recipient is recorded once, regardless of name order.',
 2015:'Fan creation titles retain creator credits. Industry Icon is a joint honorary recipient. The final fan-creation list has four nominees; the extra preliminary GI entry is excluded.',
 2016:'Direction entries represent the games credited to the nominated studios. Enderal was confirmed after the live show by SureAI, quoting the organizer. Rescinded AM2R and Pokémon Uranium entries are excluded. GI incorrectly reports Overcooked for Multiplayer; Polygon incorrectly marks Forza Horizon 3 for Family. Official results take precedence.',
 2017:'Industry Icon confirmed by the official rewind highlight and Atari Women. Historical esport and streamer handles retain correct identities despite reporting variations.',
 2018:'Myth restored to Content Creator nominees. Esports hosts are people. JJoNak and ppasarel names corrected. Honorary recipients checked separately from competitive categories.',
 2019:'Polygon confirms six Art Direction nominees and Outer Wilds for Direction; Gematsu omits Sekiro and mislabels Outer Worlds respectively. The five Global Gaming Citizen groups include two E3 honorees, as covered in the annual record. Players’ Voice uses the four final-round games.',
 2020:'Players’ Voice uses the final five games. Jennifer Hazel verified through the commissioned filmmaker; Adam Gazzaley through the organizer video; Latinx in Gaming through contemporary live coverage. Reporting typos do not change game titles.',
 2021:'Players’ Voice final five confirmed by Push Square; winner by Xbox Wire. Drag community is one honoree group, with Deere and Samira as members. The Zelda nomination is the then-untitled sequel, not the original Breath of the Wild.',
 2022:'Players’ Voice uses the final five, cross-checked against contemporary Washington Post coverage. Future Class membership and sponsored profiles are not competitive award nominations.',
 2023:'Official rewind erroneously lists Genshin Impact for Players’ Voice; contemporary GI results confirm Baldur’s Gate 3. ImperialHal is the sixth esports athlete, confirmed by Nerd Street. Village VR Mode retains its mode identity. XTQZZZ’s request to withdraw does not establish an accepted rescission; the final lists retain him.',
 2024:'Amir Satvat confirmed through the organizer video. Laura Carter confirmed through the organizer statement embedded in contemporary coverage. Expansion labels removed where the official nomination credits the ongoing base game.',
 2025:'Nominees and winners compared against Gematsu and GI; official 2025 rewind is unavailable. Girls Make Games confirms the Game Changer award directly. Megabonk’s withdrawn debut nomination is excluded. GI reporting typos (Wurthering, Blooom, FC25) do not override the actual nominees.',
};
const years=[],ambiguous=[];
for(let year=2014;year<=2025;year++){
 const path=`data/awards/tga-${year}.json`,event=JSON.parse(await readFile(path,'utf8')),src=sources.filter(s=>s.id.endsWith('-'+year));
 const cats=event.categories.map(c=>{
  const facts=src.flatMap(s=>{const f=sourceCategory(s,c);return f?[{...f,source:s.id,url:s.url}]:[];});
  if(year===2016&&c.honorary&&c.key==='industry-icon-award')facts.push({source:'official-2016',url:event.official_source_url,name:c.name,winner:'Hideo Kojima',nominees:['Hideo Kojima']});
  const entries=c.entries.map(e=>{
   const game_id=matchAwardGame(e,games),eligible=e.nominee_type==='game'||e.nominee_type==='person'&&!!e.game_title;
   const candidates=eligible&&!game_id?games.filter(g=>normalizeAwardTitle(g.title)===normalizeAwardTitle(e.game_title||e.nominee_name)):[];
   if(candidates.length>1)ambiguous.push({year,category:c.key,entry_key:e.key,title:e.game_title||e.nominee_name,decision:'Keep unlinked: candidates represent distinct canonical identities; ceremony year alone does not verify an IGDB identifier.',candidates:candidates.map(g=>({id:g.id,title:g.title,igdb_id:g.igdb_id,canonical_game_id:g.canonical_game_id}))});
   return {...e,game_id,owned:game_id!=null&&games.find(g=>g.id===game_id)?.status!=='Wishlist',match_status:!eligible?'not-game':game_id?'matched':candidates.length>1?'ambiguous':'unresolved'};
  });
  const winners=c.entries.filter(e=>e.status==='winner');
  const winnerFacts=facts.flatMap(f=>(f.winners||[f.winner]).filter(Boolean).map(w=>({...f,winner:w})));
  const winning=winners.map(e=>({entry_key:e.key,sources:winnerFacts.filter(f=>agrees(e,f.winner)).map(f=>f.source)}));
  let nominationFact=facts.find(f=>f.nominees.length===c.entries.length&&c.entries.every(e=>f.nominees.some(t=>agrees(e,t)))&&f.nominees.every(t=>c.entries.some(e=>agrees(e,t))));
  // Honorary categories have recipients, no losing nominees. Verify each recipient independently.
  const honorComplete=c.honorary&&winners.length===c.entries.length&&winning.every(w=>w.sources.length);
  if(honorComplete&&!nominationFact)nominationFact={source:'recipient-records',nominees:c.entries.map(e=>e.nominee_name)};
  const gaps=[];
  if(!nominationFact)gaps.push('Complete nominee list has not been independently reconciled');
  for(const w of winning)if(!w.sources.length)gaps.push(`Winner requires evidence: ${c.entries.find(e=>e.key===w.entry_key).nominee_name}`);
  if(new Set(c.entries.map(e=>e.key)).size!==c.entries.length)gaps.push('Duplicate entry keys');
  return {key:c.key,name:c.name,honorary:c.honorary,nominations:entries.length,winners:winners.length,matched:entries.filter(e=>e.match_status==='matched').length,unresolved:entries.filter(e=>['unresolved','ambiguous'].includes(e.match_status)).length,non_game:entries.filter(e=>e.match_status==='not-game').length,nominee_source:nominationFact?.source||null,source_nominees:nominationFact?.nominees||[],winner_evidence:winning,missing_data:gaps,entries};
 });
 const missing=cats.flatMap(c=>c.missing_data.map(g=>`${c.name}: ${g}`));
 if(new Set(cats.map(c=>c.key)).size!==cats.length)missing.push('Duplicate category keys');
 const verified=missing.length===0;
 if(process.argv.includes('--publish')){
  event.status=verified?'published':'incomplete';event.verified=verified;
  event.verification_notes=verified?`Verified 2026-10-08. Category and entry evidence: data/awards/verification/report.json; sources: data/awards/verification/sources.json. ${notes[year]}`:'';
  event.data_notes=notes[year];
  await writeFile(path,JSON.stringify(event,null,2)+'\n');
 }
 years.push({year,status:event.status,verified,categories:cats.length,nominations:cats.reduce((n,c)=>n+c.nominations,0),winners:cats.reduce((n,c)=>n+c.winners,0),matched:cats.reduce((n,c)=>n+c.matched,0),unresolved:cats.reduce((n,c)=>n+c.unresolved,0),non_game:cats.reduce((n,c)=>n+c.non_game,0),missing_data:missing,notes:notes[year],sha256:sha(JSON.stringify(event)),category_details:cats});
 console.log(year,verified?'verified':'INCOMPLETE',missing.join('; '));
}
await writeFile('data/awards/verification/report.json',JSON.stringify({verified_at:'2026-10-08',inventory_size:games.length,sources_sha256:sha(JSON.stringify(sources)),years,ambiguous},null,2)+'\n');
await writeFile('data/awards/history-report.json',JSON.stringify(years.map(y=>({year:y.year,categories:y.categories,entries:y.nominations,gaps:y.missing_data})),null,2)+'\n');
await writeFile('data/awards/verification/publication.json',JSON.stringify(years.map(y=>({year:y.year,verified:y.verified,status:y.status,sha256:y.sha256})),null,2)+'\n');
const auditYears=years.map(y=>({year:y.year,categories:y.categories,entries:y.nominations,matched:y.matched,unmatched:y.unresolved,ambiguous:ambiguous.filter(a=>a.year===y.year).length,nonGame:y.non_game,status:y.status}));
await writeFile('data/awards/library-audit.json',JSON.stringify({inventorySize:games.length,years:auditYears,totals:auditYears.reduce((a,y)=>{for(const k of ['entries','matched','unmatched','ambiguous','nonGame'])a[k]=(a[k]||0)+y[k];return a;},{})},null,2)+'\n');

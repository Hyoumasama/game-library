import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const data=JSON.parse(readFileSync('data/relationships/semantic-after.json','utf8'));
const base=process.env.RELATIONSHIP_TEST_URL||'http://localhost:3001';
const pairs=[
 [8851,3512,'expansion_of'],[1162,912,'remake_of'],[826,825,'sequel_of'],[121503,673,'sequel_of'],
 [222341,481,'remake_of'],[222486,481,'sequel_of'],[5328,1985,'prologue_of'],[107300,19474,'spinoff_of'],
 [134581,19565,'sequel_of'],[143030,89354,'expansion_of'],[53818,1164,'edition_of'],[19686,880,'remake_of'],
 [158980,385,'remaster_of'],[158981,16474,'remaster_of'],[158982,77234,'remaster_of'],
 [236663,1105,'remaster_of'],[329132,6782,'remaster_of']
];
for(const [source,target,type]of pairs){
 const s=data.canonical_games.filter(c=>c.igdb_id===source),t=data.canonical_games.filter(c=>c.igdb_id===target);
 assert.equal(s.length,1);assert.equal(t.length,1);
 const r=await fetch(`${base}/api/game-relationships?canonical=${s[0].id}`,{signal:AbortSignal.timeout(30000)});
 assert.equal(r.status,200);const {detail}=await r.json();
 assert.equal(detail.relationships.filter(e=>e.source_game_id===s[0].id&&e.target_game_id===t[0].id&&e.relation_type===type).length,1,`${source}->${target}`);
}
for(const c of data.canonical_games.filter(c=>c.metadata?.historical)){
 const r=await fetch(`${base}/api/game-relationships?canonical=${c.id}`,{signal:AbortSignal.timeout(30000)});
 assert.equal(r.status,200);const {detail}=await r.json();assert.equal(detail.copies.length,0,c.title);
 assert.equal((await fetch(`${base}/canonical/${c.id}`,{signal:AbortSignal.timeout(30000)})).status,200);
}
console.log('PASS: 17 semantic edges, historical identities expose zero owned copies, canonical pages');

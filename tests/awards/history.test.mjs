import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { matchAwardGame } from '../../lib/awards.ts';
const read=async path=>JSON.parse(await readFile(path,'utf8'));
test('every published ceremony has complete category evidence and an unchanged verification digest',async()=>{
 const proof=await read('data/awards/verification/publication.json'),report=await read('data/awards/verification/report.json'),sources=await read('data/awards/verification/sources.json');
 assert.equal(report.years.length,12);
 assert.equal(report.sources_sha256,createHash('sha256').update(JSON.stringify(sources)).digest('hex'));
 for(const year of report.years){
  const event=await read(`data/awards/tga-${year.year}.json`),p=proof.find(p=>p.year===year.year);
  assert.equal(p.status,'published');assert.equal(p.verified,true);assert.deepEqual(year.missing_data,[]);
  assert.equal(p.sha256,createHash('sha256').update(JSON.stringify(event)).digest('hex'));
  assert.equal(year.categories,event.categories.length);
  for(const c of year.category_details){
   assert.ok(c.nominee_source);assert.equal(c.source_nominees.length,c.nominations);
   assert.equal(new Set(c.entries.map(e=>e.key)).size,c.entries.length);
   assert.equal(c.winner_evidence.length,c.winners);
   for(const winner of c.winner_evidence)assert.ok(winner.sources.length);
   for(const e of c.entries)assert.equal(typeof e.owned,'boolean');
  }
 }
 assert.equal(report.years.reduce((n,y)=>n+y.nominations,0),1773);
});
test('all 16 reviewed ambiguities remain unlinked, including competing canonical editions',async()=>{
 const {ambiguous}=await read('data/awards/verification/report.json');assert.equal(ambiguous.length,16);
 for(const a of ambiguous){
  assert.ok(new Set(a.candidates.map(g=>g.canonical_game_id)).size>1);
  assert.equal(matchAwardGame({nominee_type:'game',nominee_name:a.title},a.candidates.map(g=>({...g,canonical_title:g.title,canonical_igdb_id:g.igdb_id,canonical_confidence:1}))),null);
 }
});

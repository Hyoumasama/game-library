import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, canReuseIdentity } from '../../scripts/relationships/planner.mjs';
import { buildEnrichmentPlan } from '../../scripts/relationships/enrichment-planner.mjs';

test('verified ownership aliases reuse corrected identities without overriding identifiers', () => {
  const c = {id:'hexen',title:'Hexen: Beyond Heretic',normalized_title:'hexen beyond heretic',igdb_id:3512,steam_appid:2360,release_date:'1995-10-30',metadata:{verified_ownership_aliases:[{title:'Heretic: Beyond Heretic',igdb_id:3512,steam_appid:2360,release_year:'1995'}]}};
  const g = {id:1,title:'Heretic: Beyond Heretic',igdb_id:3512,steam_appid:2360,release:'1995-10-30'};
  assert.equal(canReuseIdentity(g,c),true);
  assert.equal(canReuseIdentity({...g,igdb_id:123},c),false);
  assert.equal(canReuseIdentity({...g,steam_appid:999},c),false);
  assert.equal(canReuseIdentity({...g,release:'2025-01-01'},c),false);
  const p=buildPlan([g],[],[c]);
  assert.equal(p.canonical.length,0);
  assert.equal(p.links[0].canonical_game_id,'hexen');
});
test('edition proposals cannot cross verified reboot generations',()=>{
  const p=buildPlan([],[],[
    {id:'classic',title:'Tomb Raider',normalized_title:'tomb raider',igdb_id:912,metadata:{generation_key:'classic'}},
    {id:'goty',title:'Tomb Raider GOTY',normalized_title:'tomb raider goty',igdb_id:53818,metadata:{generation_key:'survivor'}}
  ]);
  assert.equal(p.reviews.length,0);
});
test('historical canonical has no ownership without an actual library entry',()=>{
  const p=buildPlan([],[],[{id:'original',title:'DOOM (1993)',normalized_title:'doom 1993',igdb_id:673,metadata:{historical:true}}]);
  assert.equal(p.links.length,0);
  assert.equal(p.report.canonical_total,0);
});
test('verified historical names reuse original work when ownership is later imported',()=>{
  const c={id:'original',title:'DOOM (1993)',normalized_title:'doom 1993',igdb_id:673,release_date:'1993-12-10',metadata:{historical:true,verified_identity_names:['doom']}};
  const g={id:2,title:'Doom',igdb_id:673,release:'1993-12-10'};
  assert.equal(buildPlan([g],[],[c]).canonical.length,0);
  assert.equal(canReuseIdentity({...g,igdb_id:7351,release:'2016-05-12'},c),false);
});
test('curated series exclusions survive enrichment while legitimate IP links remain',()=>{
  const c={id:'w',title:"Marvel's Wolverine",normalized_title:'marvel s wolverine',igdb_id:1,metadata:{excluded_series_names:["Marvel's Spider-Man"]}};
  const p=buildEnrichmentPlan([c],[{id:1,name:c.title,collections:[{id:10,name:"Marvel's Spider-Man"}],franchises:[{id:20,name:'Marvel'},{id:21,name:'Wolverine'}]}]);
  assert.equal(p.series_memberships.length,0);
  assert.equal(p.franchise_memberships.length,2);
  assert.equal(p.relationships.length,0);
});

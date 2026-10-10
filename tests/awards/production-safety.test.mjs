import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { matchAwardGame } from '../../lib/awards.ts';

// In-memory PostgreSQL only: no environment files, credentials or network target.
const schema = await readFile('supabase/migrations/20261008170017_game_awards.sql', 'utf8');
const seed = await readFile('supabase/migrations/20261008172122_seed_game_awards_history.sql', 'utf8');
const fixture = {
 organization:'safety', year:2025, ceremony_name:'Safety fixture', status:'published',
 verified:true, verification_notes:'Isolated test', source_url:'https://example.org',
 categories:[{key:'goty',name:'GOTY',display_order:0,entries:[
  {key:'winner',nominee_name:'Example',nominee_type:'game',game_title:'Example',status:'winner'},
  {key:'other',nominee_name:'Other',nominee_type:'game',game_title:'Other',status:'nominee'}
 ]}]
};
async function database() {
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create table games(id bigint primary key,title text,igdb_id bigint,status text,cover_url text,steam_vertical_cover text);
 create table canonical_games(id uuid primary key,title text,igdb_id bigint);
 create table game_identity_links(game_id bigint primary key references games(id) on delete cascade,canonical_game_id uuid references canonical_games(id) on delete cascade,confidence numeric);
 grant all on games,canonical_games,game_identity_links to service_role;
 grant select,insert,update,delete on games,canonical_games,game_identity_links to anon,authenticated;`);
 await db.exec(schema);
 return db;
}
const importEvent=(db,event=fixture)=>db.query('select public.import_award_event($1::jsonb)',[JSON.stringify(event)]);
const snapshot=async db=>(await db.query('select entry_key,nominee_name,game_title,game_id,canonical_game_id,status,match_method from award_entries order by entry_key')).rows;

test('SQL seed exactly matches all verified payload digests and expected counts',async()=>{
 assert.doesNotMatch(schema,/\\--|count\(\\\*\)|\u00a0/);
 const payloads=[...seed.matchAll(/\$awards_(\d{4})\$(.*?)\$awards_\1\$/gs)].map(m=>JSON.parse(m[2]));
 const manifest=JSON.parse(await readFile('data/awards/verification/publication.json','utf8'));
 assert.equal(payloads.length,12);
 let categories=0,entries=0,winners=0;
 for(const payload of payloads) {
  const json=JSON.parse(await readFile(`data/awards/tga-${payload.year}.json`,'utf8'));
  assert.deepEqual(payload,json);
  assert.equal(createHash('sha256').update(JSON.stringify(payload)).digest('hex'),manifest.find(m=>m.year===payload.year).sha256);
  categories+=payload.categories.length;
  for(const c of payload.categories) { entries+=c.entries.length; winners+=c.entries.filter(e=>e.status==='winner').length; }
 }
 assert.deepEqual({categories,entries,winners},{categories:355,entries:1773,winners:365});
});

test('limited-role library writes succeed without granting awards access; trusted reconciliation restores links',async()=>{
 const db=await database();
 try {
  await importEvent(db);
  for(const [index,role] of ['anon','authenticated'].entries()) {
   await db.exec(`set role ${role}; insert into games values(${index+1},'Example',10,'Wishlist',null,null);
    update games set status='Unplayed' where id=${index+1};
    insert into canonical_games values('00000000-0000-0000-0000-00000000000${index+1}','Example',10);
    insert into game_identity_links values(${index+1},'00000000-0000-0000-0000-00000000000${index+1}',1);
    update game_identity_links set confidence=0.5 where game_id=${index+1};
    update canonical_games set title='Example' where id='00000000-0000-0000-0000-00000000000${index+1}';
    delete from games where id=${index+1};`);
   for(const name of ['award_entries','award_details']) await assert.rejects(db.query(`select * from ${name}`),/permission denied/);
   await assert.rejects(db.query('select public.match_award_entries()'),/permission denied/);
   await assert.rejects(importEvent(db),/permission denied/);
   await db.exec('reset role');
  }
  await db.exec("set role authenticated; insert into games values(5,'Example',10,'Unplayed',null,null); reset role;");
  assert.equal((await db.query("select game_id from award_entries where entry_key='winner'")).rows[0].game_id,null);
  await db.exec('set role service_role; select public.match_award_entries();');
  assert.equal((await db.query("select game_id from award_entries where entry_key='winner'")).rows[0].game_id,5);
  await db.exec("update games set title='Renamed' where id=5");
  assert.equal((await db.query("select match_method from award_entries where entry_key='winner'")).rows[0].match_method,null);
 } finally {await db.close();}
});

test('manual and blocked decisions survive identical imports; removal and identity changes roll back',async()=>{
 const db=await database();
 try {
  await db.exec("insert into games values(1,'Example',10,'Unplayed',null,null)");
  await importEvent(db);
  await db.exec("update award_entries set match_method='manual' where entry_key='winner'; update award_entries set match_method='blocked' where entry_key='other'");
  const before=await snapshot(db);
  await importEvent(db);assert.deepEqual(await snapshot(db),before);
  for(const key of ['winner','other']) {
   const removed=structuredClone(fixture);removed.categories[0].entries=removed.categories[0].entries.filter(e=>e.key!==key);
   if(key==='winner') removed.categories[0].entries[0].status='winner';
   await assert.rejects(importEvent(db,removed),/protected manual\/blocked/);
   for(const [field,value] of [['nominee_name','Changed'],['game_title','Changed'],['nominee_type','person'],['external_game_id',999]]) {
    const changed=structuredClone(fixture);changed.categories[0].entries.find(e=>e.key===key)[field]=value;
    await assert.rejects(importEvent(db,changed),/protected manual\/blocked/);
   }
  }
  const omitted=structuredClone(fixture);omitted.categories=[{key:'new',name:'New',display_order:1,entries:[{key:'new',nominee_name:'New',nominee_type:'game',status:'winner'}]}];
  await assert.rejects(importEvent(db,omitted),/category containing protected/);
  assert.deepEqual(await snapshot(db),before);
  assert.equal((await db.query("select status from award_events where award_organization='safety'")).rows[0].status,'published');
  const corrected=structuredClone(fixture);corrected.categories[0].entries[0].status='nominee';corrected.categories[0].entries[1].status='winner';
  await importEvent(db,corrected);
  assert.equal((await db.query("select match_method from award_entries where entry_key='other'")).rows[0].match_method,'blocked');
 } finally {await db.close();}
});

test('unprotected obsolete entries and categories are removed; protected changes require explicit review',async()=>{
 const db=await database();
 try {
  await importEvent(db);
  const reduced=structuredClone(fixture);reduced.categories[0].entries.pop();
  await importEvent(db,reduced);assert.equal((await snapshot(db)).length,1);
  const replaced=structuredClone(fixture);replaced.categories[0].key='replacement';
  await importEvent(db,replaced);assert.equal((await snapshot(db)).length,2);
  assert.equal((await db.query('select count(*)::int n from award_event_categories')).rows[0].n,1);
  await assert.rejects(importEvent(db,{...fixture,status:null}),/Invalid event status/);
 } finally {await db.close();}
});

test('all twelve years seed twice under service_role; blocked history aborts the whole seed',async()=>{
 const db=await database();
 try {
  await db.exec('set role service_role');
  await db.exec(seed);await db.exec(seed);
  assert.equal((await db.query('select count(*)::int n from award_entries')).rows[0].n,1773);
  assert.equal((await db.query('select count(*)::int n from games')).rows[0].n,0);
  // Change an early year, then force a protected conflict in the final year.
  await db.exec("update award_events set ceremony_name='Keep on rollback' where year=2014; update award_entries set match_method='blocked',nominee_name='Reviewed identity' where id=(select e.id from award_entries e join award_events v on v.id=e.award_event_id where v.year=2025 limit 1)");
  await assert.rejects(db.exec(seed),/protected manual\/blocked/);
  await db.exec('rollback');
  assert.equal((await db.query('select ceremony_name from award_events where year=2014')).rows[0].ceremony_name,'Keep on rollback');
  assert.equal((await db.query("select count(*)::int n from award_entries where nominee_name='Reviewed identity' and match_method='blocked'")).rows[0].n,1);
 } finally {await db.close();}
});

test('seed preserves the complete cached library and agrees with the application matcher',async()=>{
 const games=JSON.parse(await readFile('data/awards/library.local.json','utf8'));
 const db=await database();
 try {
  await db.query(`insert into games select id,title,igdb_id,status,cover_url,steam_vertical_cover
   from jsonb_to_recordset($1::jsonb) as x(id bigint,title text,igdb_id bigint,status text,cover_url text,steam_vertical_cover text)`,[JSON.stringify(games)]);
  const canonicals=[...new Map(games.filter(g=>g.canonical_game_id).map(g=>[g.canonical_game_id,{id:g.canonical_game_id,title:g.canonical_title,igdb_id:g.canonical_igdb_id}])).values()];
  await db.query('insert into canonical_games select * from jsonb_to_recordset($1::jsonb) as x(id uuid,title text,igdb_id bigint)',[JSON.stringify(canonicals)]);
  const identities=games.filter(g=>g.canonical_game_id).map(g=>({game_id:g.id,canonical_game_id:g.canonical_game_id,confidence:g.canonical_confidence}));
  await db.query('insert into game_identity_links select * from jsonb_to_recordset($1::jsonb) as x(game_id bigint,canonical_game_id uuid,confidence numeric)',[JSON.stringify(identities)]);
  const before=(await db.query('select * from games order by id')).rows;
  await db.exec('set role service_role');await db.exec(seed);
  assert.deepEqual((await db.query('select * from games order by id')).rows,before);
  const entries=(await db.query('select * from award_entries')).rows;
  assert.equal(entries.length,1773);
  for(const entry of entries) assert.equal(entry.game_id,matchAwardGame(entry,games),entry.nominee_name);
 } finally {await db.close();}
});

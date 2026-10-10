// Isolated local preview database. Never connects to Supabase.
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import assert from "node:assert/strict";
import { matchAwardGame } from "../../lib/awards.ts";
const db=new PGlite();
await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create table games(id bigint primary key,title text,igdb_id bigint,status text,cover_url text,steam_vertical_cover text);create table canonical_games(id uuid primary key,title text,igdb_id bigint);create table game_identity_links(game_id bigint primary key references games(id),canonical_game_id uuid references canonical_games(id),confidence numeric);");
const games=JSON.parse(await readFile("data/awards/library.local.json","utf8"));
await db.query("insert into games select id,title,igdb_id,status,cover_url,steam_vertical_cover from jsonb_to_recordset($1) as x(id bigint,title text,igdb_id bigint,status text,cover_url text,steam_vertical_cover text)",[JSON.stringify(games)]);
const canonical=[...new Map(games.filter(g=>g.canonical_game_id).map(g=>[g.canonical_game_id,{id:g.canonical_game_id,title:g.canonical_title,igdb_id:g.canonical_igdb_id}])).values()];
await db.query("insert into canonical_games select * from jsonb_to_recordset($1) as x(id uuid,title text,igdb_id bigint)",[JSON.stringify(canonical)]);
await db.query("insert into game_identity_links select id,canonical_game_id,canonical_confidence from jsonb_to_recordset($1) as x(id bigint,canonical_game_id uuid,canonical_confidence numeric) where canonical_game_id is not null",[JSON.stringify(games)]);
await db.exec(await readFile("supabase/migrations/20261008170017_game_awards.sql","utf8"));
let expected=0;
for(let year=2014;year<=2025;year++) {
  const event=JSON.parse(await readFile(`data/awards/tga-${year}.json`,"utf8"));
  expected+=event.categories.flatMap(c=>c.entries).filter(e=>matchAwardGame(e,games)).length;
  await db.query("select import_award_event($1::jsonb)",[JSON.stringify(event)]);
}
const actual=(await db.query("select count(*)::int n from award_entries where game_id is not null")).rows[0].n;
assert.equal(actual,expected,"SQL and importer matching must agree");
assert.equal((await db.query("select count(*)::int n from games")).rows[0].n,games.length);
console.log(`Isolated preview: ${actual} linked awards; inventory unchanged at ${games.length} rows.`);
// Start one ceremony staged to test publication through the real authenticated application route.
if(process.argv.includes("--publication-test")) await db.exec("update award_events set status='incomplete' where year=2025");
const tables=new Map();
for(const table of ['award_events','award_details','games'])tables.set(table,(await db.query(`select * from ${table}`)).rows);
const requests=new Map();
const server=createServer(async (req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');const table=url.pathname.split('/').at(-1);requests.set(table,(requests.get(table)||0)+1);
  if(url.pathname==='/requests'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(Object.fromEntries(requests)));return;}
  if(req.method!=='GET' && req.method!=='HEAD') { // Existing read-only stats RPCs use POST.
    if(table==='import_award_event'&&process.argv.includes('--publication-test')){
      let body='';for await(const chunk of req)body+=chunk;
      try {const payload=JSON.parse(body).payload;await db.query('select import_award_event($1::jsonb)',[JSON.stringify(payload)]);for(const t of ['award_events','award_details'])tables.set(t,(await db.query(`select * from ${t}`)).rows);res.setHeader('Content-Type','application/json');res.end('null');}catch {res.writeHead(400);res.end(JSON.stringify({message:'Invalid fixture import'}));}return;
    }
    if(url.pathname.includes('/rpc/')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(table==='get_stats_years'?[{year:2026}]:table==='get_distributed_game_hours'?[]:table.includes('filters')?[{stores:[],years:[],completion_years:[],genres:[]}]:[{total_games:games.length,completed_games:0,total_hours:0,avg_score:0}]));return;}
    res.writeHead(405);res.end();return;
  }
  let rows=[...(tables.get(table)||[])];
  for(const [column,filter] of url.searchParams) {
    if(filter.startsWith('eq.'))rows=rows.filter(r=>String(r[column])===filter.slice(3));
    if(filter.startsWith('ilike.')){const term=filter.slice(6).replace(/^%|%$/g,'').toLowerCase();rows=rows.filter(r=>String(r[column]||'').toLowerCase().includes(term));}
    if(filter.startsWith('in.')){const values=filter.slice(4,-1).split(',');rows=rows.filter(r=>values.includes(String(r[column])));}
    if(filter.startsWith('ov.')){const ids=filter.slice(4,-1).split(',').map(Number);rows=rows.filter(r=>r[column]?.some(id=>ids.includes(Number(id))));}
  }
  if(url.searchParams.has('order')){const [column,dir]=url.searchParams.get('order').split('.');rows.sort((a,b)=>(a[column]<b[column]?-1:a[column]>b[column]?1:0)*(dir==='desc'?-1:1));}
  const total=rows.length,offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||1000);
  rows=rows.slice(offset,offset+limit);res.setHeader('Content-Type','application/json');res.setHeader('Content-Range',`${offset}-${offset+rows.length-1}/${total}`);
  res.end(JSON.stringify(req.headers.accept?.includes('vnd.pgrst.object')?rows[0]||null:rows));
});
const port=Number(process.env.AWARDS_PREVIEW_PORT || 4401);
server.listen(port,'127.0.0.1',()=>console.log(`Read-only fixture API ready on port ${port}`));
process.on('SIGINT',()=>{server.close();db.close().then(()=>process.exit());});

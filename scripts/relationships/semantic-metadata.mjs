// Read-only evidence collection. Never creates ownership or graph records.
import nextEnv from '@next/env';
import {readFileSync,writeFileSync} from 'node:fs';
nextEnv.loadEnvConfig(process.cwd());
const snapshot=JSON.parse(readFileSync('data/relationships/semantic-before.json','utf8'));
const endpointIds=new Set(snapshot.game_relationships.flatMap(e=>[e.source_game_id,e.target_game_id]));
const ids=[...new Set(snapshot.canonical_games.filter(c=>endpointIds.has(c.id)).map(c=>c.igdb_id).filter(Boolean))];
const auth=await fetch('https://id.twitch.tv/oauth2/token',{method:'POST',body:new URLSearchParams({client_id:process.env.IGDB_CLIENT_ID,client_secret:process.env.IGDB_CLIENT_SECRET,grant_type:'client_credentials'}),signal:AbortSignal.timeout(20000)});
const token=await auth.json();if(!auth.ok||!token.access_token)throw new Error('IGDB authentication failed');
async function query(body){const r=await fetch('https://api.igdb.com/v4/games',{method:'POST',headers:{'Client-ID':process.env.IGDB_CLIENT_ID,Authorization:`Bearer ${token.access_token}`},body,signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error(`IGDB evidence request failed: ${r.status}`);return r.json();}
const fields='name,url,first_release_date,version_parent,remakes,remasters,expanded_games,collections.name,franchise.name,franchises.name';
const metadata=[];for(let n=0;n<ids.length;n+=100){metadata.push(...await query(`fields ${fields}; where id=(${ids.slice(n,n+100).join(',')}); limit 100;`));}
const originals=await query(`fields ${fields}; where name=("Hexen: Beyond Heretic","Saints Row","Doom","Tomb Raider","Resident Evil 2","Final Fantasy","Final Fantasy II","Final Fantasy III","Metroid Prime","Ninja Gaiden II","Ninja Gaiden 2"); limit 100;`);
writeFileSync('data/relationships/semantic-igdb.json',JSON.stringify({metadata,originals},null,2));
console.log(JSON.stringify(originals.map(g=>({id:g.id,name:g.name,url:g.url,release:g.first_release_date?new Date(g.first_release_date*1000).toISOString().slice(0,10):null})),null,2));

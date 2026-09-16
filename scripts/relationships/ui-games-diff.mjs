// Read-only preservation diagnostic; full row values stay in ignored local data.
import nextEnv from '@next/env';
import {createClient}from '@supabase/supabase-js';
import {readFileSync,writeFileSync}from 'node:fs';
nextEnv.loadEnvConfig(process.cwd());
const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
const old=JSON.parse(readFileSync('data/relationships/semantic-after.json','utf8')).games;
const current=[];
for(let offset=0;;offset+=500){const {data,error}=await client.from('games').select('*').order('id').range(offset,offset+499);if(error)throw new Error(error.message);current.push(...data);if(data.length<500)break;}
const previous=new Map(old.map(g=>[g.id,g]));
const changes=current.flatMap(g=>{const before=previous.get(g.id);if(!before)return [{id:g.id,added:true}];const fields=Object.keys(g).filter(k=>JSON.stringify(g[k])!==JSON.stringify(before[k]));return fields.length?[{id:g.id,title:g.title,fields}]:[];});
writeFileSync('data/relationships/ui-games-current.json',JSON.stringify(current,null,2));
writeFileSync('data/relationships/ui-games-diff.json',JSON.stringify(changes,null,2));
console.log(JSON.stringify({count:current.length,changes},null,2));

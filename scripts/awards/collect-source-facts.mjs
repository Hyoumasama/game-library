// Extract factual nomination/result records; source HTML is kept locally and ignored.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import { giFacts, gematsuFacts, listFacts } from './review-sources.mjs';
await mkdir('data/awards/verification',{recursive:true});
const sources=[];
const add=(id,url,content,categories)=>sources.push({id,url,retrieved_at:'2026-10-08',sha256:createHash('sha256').update(content).digest('hex'),categories});
for(let year=2014;year<=2025;year++) {
 const official=JSON.parse(await readFile(`data/awards/official-${year}.local.json`,'utf8'));
 const cached=official.text.slice(official.text.indexOf('## Winners')).split('--------------------------------------------------------------------------------')[0];
 const categories=[];let current;
 if(official.text.includes('## Winners'))for(const line of cached.split('\n')){if(/^## /.test(line)&&line!=='## Winners'){current={name:line.slice(3),winner:null,nominees:[]};categories.push(current);}else if(/^### /.test(line)&&current)current.winner=line.slice(4);}
 add(`official-${year}`,official.url,official.text,categories);
 if(year!==2014){const raw=JSON.parse(await readFile(`data/awards/gematsu-${year}.local.json`,'utf8'));add(`gematsu-${year}`,raw.url,raw.text,gematsuFacts(raw.text));}
 if(year!==2019&&year!==2024){const raw=JSON.parse(await readFile(`data/awards/gi-${year}.local.json`,'utf8'));add(`gi-${year}`,raw.url,raw.html,giFacts(raw.html,year));}
 if([2014,2015,2016,2018,2019].includes(year)) {
  const raw=JSON.parse(await readFile(`data/awards/polygon-${year}.local.json`,'utf8'));
  const html=await readFile(`data/awards/polygon-${year}.html`,'utf8');
  if(year===2014||year===2015){const $=load(html);raw.categories=[];$('.content-block-regular').first().find('p').each((_,p)=>{const name=$(p).find('strong').first().text();if(!name)return;const clone=$(p).clone();clone.find('strong').first().remove();raw.categories.push({name,winner:clone.text().trim(),nominees:[]});});}
  if(year===2016){const $=load(html);raw.categories=[];let current;$('.content-block-regular').first().children('p,ul').each((_,el)=>{if($(el).is('p')&&$(el).find('strong').length){current={name:$(el).find('strong').text(),winner:null,nominees:[]};raw.categories.push(current);}else if($(el).is('ul')&&current){$(el).find('li').each((_,li)=>{const t=$(li).text().replace(/\s+/g,' ').trim();current.nominees.push(t.replace(/\s*[—–-]?\s*WINNER/i,''));if(/WINNER/i.test(t))current.winner=t.replace(/\s*[—–-]?\s*WINNER/i,'');});}});}
  if(year===2018)raw.categories=raw.categories.map(c=>({...c,winner:c.winner?.replace(/^Winner:\s*/i,''),nominees:c.nominees.map(n=>n.replace(/^Winner:\s*/i,''))}));
  add(`polygon-${year}`,raw.url,html,raw.categories);
 }
 if(year===2024){const raw=JSON.parse(await readFile('data/awards/auto-2024.local.json','utf8'));add('automaton-2024',raw.url,await readFile('data/awards/auto-2024.html','utf8'),raw.categories);}
}
await writeFile('data/awards/verification/sources.json',JSON.stringify(sources,null,2)+'\n');
console.log(sources.map(s=>`${s.id}: ${s.categories.length} categories`).join('\n'));

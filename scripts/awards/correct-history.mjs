// Explicit, reviewed corrections. No library records are created or changed.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const changes=[];
for(let year=2014;year<=2025;year++)if(JSON.parse(await readFile(`data/awards/tga-${year}.json`,'utf8')).verified)throw Error('Verified history is protected. Corrections require a new source review.');
for(let year=2014;year<=2025;year++) {
 const path=`data/awards/tga-${year}.json`,event=JSON.parse(await readFile(path,'utf8'));
 const change=(entry,field,value,reason)=>{if(entry[field]===value)return;changes.push({year,entry:entry.nominee_name,field,previous:entry[field],value,reason});entry[field]=value;};
 for(const c of event.categories)for(const e of c.entries){
  if(c.key==='best-esports-host'){change(e,'nominee_type','person','Hosts are people, not nominated games.');change(e,'game_title',null,'A host has no associated nominated game.');}
  if(e.nominee_type==='person'&&/esports|trending|creator/.test(c.key)&&e.nominee_name.includes('('))change(e,'nominee_name',e.nominee_name.split(' (')[0],'Remove affiliation text and malformed parentheses from person identity.');
  if(e.game_title && /^(Destiny 2: Beyond Light|Destiny 2: The Witch Queen|Diablo IV: Vessel of Hatred|Final Fantasy XIV: Dawntrail)$/.test(e.game_title)){
   const title=e.game_title.split(':')[0];change(e,'nominee_name',title,'Contemporary official nominee is the ongoing base game, not its expansion.');change(e,'game_title',title,'Retain the nominated base-game identity.');
  }
  if(year===2021&&c.key==='most-anticipated-game'&&e.game_title==='The Legend of Zelda: Breath of the Wild'){
   change(e,'nominee_name','The Legend of Zelda: Breath of the Wild sequel','2021 nomination was the unreleased sequel, not the 2017 original.');change(e,'game_title',e.nominee_name,'Keep the announced identity; do not force a link to the original.');
  }
  if(year===2023&&c.key==='best-vr-ar-game'&&e.game_title==='Resident Evil Village'){
   change(e,'nominee_name','Resident Evil Village VR Mode','Official rewind and contemporary winners identify VR Mode.');change(e,'game_title',e.nominee_name,'Avoid attributing a separately named mode to an uncertain edition.');
  }
  if(year===2014&&c.key==='best-fan-creation'&&e.nominee_name.includes("It's Dangerous"))change(e,'nominee_name','BEST Zelda Rap EVER!! – by Egoraptor','Contemporary Polygon, PCGamesN and Game Informer nominee lists agree on the nomination label.');
  if(year===2018&&c.key==='best-esports-player'&&e.nominee_name.includes('JJoNak'))change(e,'nominee_name','Bang "JJoNak" Sung-hyeon','Correct misspelled player name; retain the unique handle.');
  if(year===2018&&c.key==='best-esports-coach'&&e.nominee_name.includes('ppasarel'))change(e,'nominee_name','Cristian "ppasarel" Bănăseanu','Contemporary nominee record gives Cristian Bănăseanu.');
 }
 if(year===2018){const c=event.categories.find(c=>c.key==='content-creator-of-the-year');if(!c.entries.some(e=>e.nominee_name==='Myth')){c.entries.push({key:'',nominee_name:'Myth',nominee_type:'person',game_title:null,status:'nominee',image_url:null});changes.push({year,category:c.key,added:'Myth',reason:'All three contemporary nominee lists include Myth.'});}}
 if(year===2021){const c=event.categories.find(c=>c.key==='global-gaming-citizens');c.entries=c.entries.filter(e=>!['Deere','Samira Close'].includes(e.nominee_name));const e=c.entries.find(e=>e.nominee_name==='The Drag Stream Community');if(e)change(e,'nominee_name','The Drag Stream Community (Deere and Samira Close)','Nested members describe one honoree group; do not count them as additional awards.');}
 for(const c of event.categories)for(const e of c.entries)e.key=createHash('sha256').update(`${e.nominee_type}:${e.nominee_name}:${e.game_title||''}`).digest('hex').slice(0,24);
 await writeFile(path,JSON.stringify(event,null,2)+'\n');
}
await writeFile('data/awards/verification/corrections.json',JSON.stringify(changes,null,2)+'\n');console.log(`${changes.length} corrections recorded.`);

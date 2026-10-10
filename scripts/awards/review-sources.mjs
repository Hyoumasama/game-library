// Diagnostic comparison only. Never publishes or alters historical data.
import { readFile, writeFile } from 'node:fs/promises';
import { load } from 'cheerio';
export const textKey = text => text.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const aliases = {
  'bestmobilehandheld':'bestmobilegame','bestmobilehandheldgame':'bestmobilegame','bestmobile':'bestmobilegame',
  'bestscoresoundtrack':'bestscoreandmusic','bestscoremusic':'bestscoreandmusic','bestscoreandsoundtrack':'bestscoreandmusic','bestscorebestsoundtrack':'bestscoreandmusic','bestscore':'bestscoreandmusic',
  'bestroleplayinggame':'bestrpg','bestroleplaying':'bestrpg','bestactionadventure':'bestactionadventuregame','bestactionadventuregame':'bestactionadventuregame',
  'bestmultiplayer':'bestmultiplayergame','bestgamesdirection':'bestgamedirection','beststudiogamedirection':'bestgamedirection',
  'gamesforimpactaward':'gamesforimpact','gamesforchangeaward':'gamesforimpact','gamesforchange':'gamesforimpact',
  'bestindie':'bestindependentgame','bestindiegame':'bestindependentgame','bestindependent':'bestindependentgame',
  'bestvirtualrealityaugmentedreality':'bestvrargame','bestvrar':'bestvrargame','bestvrgame':'bestvrargame',
  'bestaction':'bestactiongame','bestfighting':'bestfightinggame','bestfamily':'bestfamilygame','bestsportsracing':'bestsportsracinggame',
  'bestsimulationstrategy':'bestsimstrategygame','bestsimstrategy':'bestsimstrategygame','mostanticipated':'mostanticipatedgame',
  'playersvoice':'playersvoice','playerschoice':'playersvoice','bestongoing':'bestongoinggame',
  'bestdebutgame':'bestdebutindiegame','bestdebut':'bestdebutindiegame','bestdebutindie':'bestdebutindiegame','bestdebutindependentgame':'bestdebutindiegame',
  'beststrategy':'bestsimstrategygame','bestsimstrategy':'bestsimstrategygame','beststrategygames':'bestsimstrategygame','beststrategygame':'bestsimstrategygame','bestsimulationstrategygame':'bestsimstrategygame',
  'freshindiegame':'bestdebutindiegame','freshindiedeveloper':'bestdebutindiegame','besteesportscoach':'bestesportscoach',
  'bestscoremusicpresentedbyspotify':'bestscoreandmusic','bestscoremusical':'bestscoreandmusic',
  'bestcommunitygame':'bestcommunitysupport','bestarvrgame':'bestvrargame','roleplayinggame':'bestrpg',
  'industryicon':'industryiconaward','bestsportsorracinggame':'bestsportsracinggame',
  'bestaudio':'bestaudiodesign','debutindiegame':'bestdebutindiegame','bestesportsgameoftheyear':'bestesportsgame',
  'studentgameaward':'beststudentgame','chinesefangameaward':'bestchinesegame',
  'bestesportsathlete':'bestesportsplayer','esportsplayeroftheyear':'bestesportsplayer','esportsteamoftheyear':'bestesportsteam','esportsgameoftheyear':'bestesportsgame',
  'bestesports':'bestesportsgame','contentcreator':'contentcreatoroftheyear',
};
export const categoryKey = name => { let key=textKey(name.replace(/: Presented.*|Presented by.*/i,''));return aliases[key] || key; };
export function listFacts(html,selector,mode) {
 const $=load(html),categories=[];let current;
 $(selector).children('h2,h3,p,ul').each((_,el)=>{
  const t=$(el).text().replace(/\s+/g,' ').trim();
  if($(el).is('h2,h3')){current={name:t,winner:null,nominees:[]};categories.push(current);}
  else if(current && $(el).is('ul')){$(el).find('li').each((_,li)=>{const text=$(li).text().replace(/\s+/g,' ').trim();const value=text.replace(/\s*[—–-]\s*Winner\s*$/i,'');current.nominees.push(value);if(/winner/i.test(text)||$(li).find('strong').length)current.winner=value;});}
  else if(current && /^WINNER:/i.test(t)){current.winner=t.replace(/^WINNER:\s*/i,'');if(mode==='auto')current.nominees.push(current.winner);}
 });return categories.filter(c=>c.nominees.length);
}
export function gematsuFacts(raw) {
  let current;const categories=[];
  for(const line of raw.replace(/(?=L\d+:)/g,'\n').split('\n')) {
    const clean=line.replace(/^L\d+:\s*/, '');
    if(current && clean && !clean.startsWith('>')) break;
    const text=clean.replace(/cite[^†]*†([^]*)/g,(_,s)=>s.split('†')[0]).replace(/^>\s*/, '').replace(/\s+/g,' ').trim();
    if(text.startsWith('* ')) { if(current && !text.includes('~~')) current.nominees.push(text.slice(2)); }
    else if(clean.startsWith('>') && !text.endsWith('.') && /^(Game of the Year|Developer of|Best |Beste |Most Anticipated|Industry Icon|Games for|Player.s |Trending Gamer|Content Creator|Fresh Indie|Innovation|[eE][sS]ports)/.test(text)) {
      current={name:text,nominees:[]};categories.push(current);
    }
  }
  return categories.filter(c=>c.nominees.length);
}
export function giFacts(html,year) {
  const $=load(html), categories=[];
  let current;
  if(year===2014) {
    $('p,ul').each((_,el)=> {const t=$(el).text().replace(/\s+/g,' ').trim();
      if($(el).is('p') && t.includes('Winner:')){const [name,winner]=t.split(/\s*-\s*Winner:\s*/);current={name:name.replace(/\s*-\s*\(Voted.*$/i,''),winner,nominees:[]};categories.push(current);}
      else if($(el).is('ul') && current)current.nominees.push(...$(el).find('li').map((i,li)=>$(li).text().trim()).get());
    });
  } else if(year===2018) {
    $('h2,p').each((_,el)=>{if($(el).is('h2')){current={name:$(el).text(),winner:null,nominees:[]};categories.push(current);}else if(current){const b=load($(el).html().replace(/<br\s*\/?\s*>/gi,'\n'));current.nominees=b.root().text().split('\n').map(s=>s.trim()).filter(Boolean);current.winner=$(el).find('strong').text().trim();}});
  } else if(year===2015 || year===2016 || year===2025) {
    const lines=$('p').map((_,p)=>$(p).html().replace(/<br\s*\/?\s*>/gi,'\n')).get();
    for(const block of lines){const b=load(block);const texts=b.root().text().split('\n').map(t=>t.trim()).filter(Boolean);
      for(const t of texts){if(/^(Game of the Year|Developer of|Best |Most Anticipated|Games for|Trending Gamer|Content Creator|eSports |Esports |Player.s Voice|Players. Voice|Innovation|\d+ Industry)/i.test(t)&&!t.includes('Winner:')&&!t.includes('WINNER')){current={name:t,winner:null,nominees:[]};categories.push(current);}else if(current){if(/^Winner:/.test(t)||/WINNER/.test(t))current.winner=t.replace(/^Winner:\s*|\s*[–-]?\s*\(?WINNER\)?/g,'');current.nominees.push(t.replace(/^Winner:\s*|\s*[–-]?\s*\(?WINNER\)?/g,''));}}
    }
  } else if(year===2017 || year===2021 || year===2022 || year===2023) {
    const lines=$('p').map((_,p)=>$(p).html().replace(/<br\s*\/?\s*>/gi,'\n')).get();
    for(const block of lines)for(const t of load(block).root().text().split('\n')){const m=t.match(/^(.*?)\s+[–-]\s+(.*)$/);if(m&&/^(Game of|Best |Players|Content|Most|Trending|Innovation|Games)/i.test(m[1]))categories.push({name:m[1],winner:m[2],nominees:[]});}
  } else if(year===2020) {
    $('p').each((_,p)=> {const t=$(p).text().trim();if(/^(Game of the Year|Best |Most Anticipated|Games for|Player.s Choice|Content Creator|Innovation)/.test(t)&&($(p).find('strong').length||$(p).html().includes('font-weight:700'))){current={name:t,winner:null,nominees:[]};categories.push(current);}else if(current&&!current.winner)current.winner=t;});
  }
  return categories;
}
if(process.argv[1]?.endsWith('review-sources.mjs')) {
 const report=[];
 for(let year=2014;year<=2025;year++) {
  const event=JSON.parse(await readFile(`data/awards/tga-${year}.json`,'utf8'));
  const gem=year!==2014?gematsuFacts(JSON.parse(await readFile(`data/awards/gematsu-${year}.local.json`,'utf8')).text):[];
  const gi=year!==2019&&year!==2024?giFacts(JSON.parse(await readFile(`data/awards/gi-${year}.local.json`,'utf8')).html,year):[];
  const cats=event.categories.map(c=>{
   const gc=gem.find(x=>categoryKey(x.name)===categoryKey(c.key));const ic=gi.find(x=>categoryKey(x.name)===categoryKey(c.key));
   const candidates=gc?.nominees || ic?.nominees || [];
   const missing=c.entries.filter(e=>!candidates.some(t=>textKey(t).includes(textKey(e.nominee_type==='person'?e.nominee_name.split(' as ')[0]:e.nominee_name))));
   const winner=c.entries.filter(e=>e.status==='winner').map(e=>e.nominee_name);
   return {key:c.key,name:c.name,count:c.entries.length,sourceCount:candidates.length,missing:missing.map(e=>e.nominee_name),expectedWinners:winner,sourceWinner:ic?.winner || null,sourceNominees:candidates};
  });
  report.push({year,categories:cats,sourceCategories:gem.map(c=>c.name)});
  console.log(year);for(const c of cats)if(c.missing.length||c.count!==c.sourceCount||!c.sourceWinner)console.log(c.key,`${c.count}/${c.sourceCount}`,JSON.stringify(c.missing), 'winner:', c.sourceWinner);
 }
 await writeFile('data/awards/source-review.local.json',JSON.stringify(report,null,2));
}

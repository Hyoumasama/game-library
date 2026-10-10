import { readFile, writeFile } from 'node:fs/promises';
import { categoryKey } from './review-sources.mjs';
const aliases={
 'hearthstoneheroesofwarcraft':'hearthstone','brokenageacti':'brokenagepart1','disneyinfinitymarvelsuperheroes':'disneyinfinity20',
 'supersmashbrosfornintendo3ds':'supersmashbrosfor3ds','supersmashbros3ds':'supersmashbrosfor3ds','supersmashbroswiiu':'supersmashbrosforwiiu',
 'walkingdeadseason2':'thewalkingdeadseason2','valiantheartsthegreatwar':'valianthearts','ultimatestreetfighter4':'ultrastreetfighter4',
 'blizzardentertainment':'blizzard','monolithproductions':'monolith','vanossgaming':'vanoss','1979revolutionblackfriday':'1979revolution',
 'tomclancysrainbowsixsiege':'rainbowsixsiege','tomclancysthedivision2':'thedivision2','rainbowsixsiege':'rainbowsixsiege',
 'killerinstinctseasonthree':'killerinstinctseason3','mlbtheshow2016':'mlbtheshow16','richsummer':'richsommer','torybaker':'troybaker',
 'jackspeticeye':'jacksepticeye','impulsuon':'impulsion',
 'reddeadredemption2':'reddeadredemption2','marvelsspiderman':'spiderman','stevenspohn':'stevespohn','honorofkings':'kingofglory','gumballsdungeons':'gumballs',
 'pubgmobile':'playerunknownsbattlegroundsmobile','skychildrenofthelight':'sky',
 'streetfightervarcadeedition':'streetfighter5arcade','mortalkombat11ultimateedition':'mortalkombat11ultimate',
 'bennstar':'benstarr','wurtheringwaves':'wutheringwaves','lostrecordsblooomrage':'lostrecordsbloomrage',
 'chicoryacolorfultale':'chicoryacolorfultale','jasonkelley':'jasonekelley',
 'playersvoice':'playersvoice',
 'sidmeierscivilization7':'civilization7','forzamotorsports7':'forzamotorsport7','technogamers':'technogamerz',
 'evanvanossfong':'vanoss','ultimateStreetFighter4':'ultrastreetfighter4','ultimatestreetfighteriv':'ultrastreetfighter4',
 'thewalkingdeadseasontwo':'thewalkingdeadseason2','gta5targets':'gtavtargets','gta5targetshoodoooperator':'gtavtargets',
 'marvelsspidermanmilesmorales':'spidermanmilesmorales','marvelsironmanvr':'ironmanvr',
 'sequeltolegendofzeldabreathofthewild':'thelegendofzeldabreathofthewildsequel','thelegendofzeldabreathofthewild2':'thelegendofzeldabreathofthewildsequel',
 'thelegendofzeldatearsofthekingdom':'zeldatearsofthekingdom','damwongaming':'dwggaming','damwonkia':'dwgkia',
 'sktelecomt1':'sktelecom1','navi':'natusvincere','zyw0o':'zywoo',
 'grandtheftauto5targets':'gtavtargets','dawongaming':'dwggaming','lathieves':'losangelesthieves',
 'sequeltoThelegendofzeldabreathofthewild':'thelegendofzeldabreathofthewildsequel',
 'sequeltothelegendofzeldabreathofthewild':'thelegendofzeldabreathofthewildsequel',
 'theinternational2021':'theinternational10','the2022midseasoninvitational':'2022midseasoninvitational',
 'valorantchampions2022':'2022valorantchampions','valorantchampions2023':'2023valorantchampions',
 'theinternationaldota2championships2023':'theinternational2023',
 'robertaandkenwilliams':'kenandrobertawilliams','westwoodstudioscofoundersbrettsperryandlouiscastle':'brettsperryandlouiscastle',
 'lorientestard':'clairobscurexpedition33',
};
export function identity(text) {
 let value=text.replace(/^Winner:\s*/i,'').replace(/\s*[—–-]\s*Winner\s*$/i,'').split(/\s+as\s+|\s+in\s+|\s+[–—]\s+by\s+|\s+-\s+|\s+Composer\s+|\s+Audio Director\s+/i)[0].replace(/\([^)]*\)?/g,'');
 value=value.replace(/\b(VII|VI|IV|III|II|V)\b/g,m=>({VII:'7',VI:'6',IV:'4',III:'3',II:'2',V:'5'})[m]);
 let key=value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');return aliases[key]||key;
}
export function agrees(entry,text) {
 const forGame=text.match(/\(for (.*?)\)/i)?.[1];if(forGame&&entry.game_title&&identity(entry.game_title)===identity(forGame))return true;
 const a=identity(entry.nominee_name),b=identity(text);if(a===b||a.startsWith(b)||b.startsWith(a))return true;
 const handle=entry.nominee_name.match(/["“']([^"”']+)["”']/)?.[1];if(handle){const source=text.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');if(source.includes(identity(handle)))return true;if(identity(handle)==='zywoo'&&source.startsWith('zyw0omathieuherbaut'))return true;if(identity(handle)==='infiltration'&&/^infiltratorlee(s|se)eonwoo/.test(source))return true;}
 // Reviewed ceremony-specific labels; these never affect library matching.
 if(/leagueoflegendsworldchampionship|overwatchleaguegrandfinals/.test(a))return a.replace(/20\d\d/g,'')===b.replace(/20\d\d/g,'');
 if(a==='2021valorantchampionstourstage2masters')return b==='valorantchampionstourstage2masters';
 if(a==='cloud9comebackwin')return b==='c9comebackwin';
 return false;
}
export function sourceCategory(source,category) {
 return source.categories.find(c=>categoryKey(c.name.replace(/:\s*$/,'').replace(/^VR\/AR AGame$/,'Best VR/AR Game').replace(/^(Action|Art|Audio|Community|Esports|Family|Fighting|Game Direction|Independent|Mobile|Multiplayer|Narrative|Ongoing|Performance|Role-Playing|Score|Sports|Strategy|VR\/AR)/,'Best $1'))===categoryKey(category.key));
}
if(process.argv[1]?.endsWith('check-source-facts.mjs')) {
const sources=JSON.parse(await readFile('data/awards/verification/sources.json','utf8')),issues=[];
for(let year=2014;year<=2025;year++){
 const event=JSON.parse(await readFile(`data/awards/tga-${year}.json`,'utf8'));
 const src=sources.filter(s=>s.id.endsWith('-'+year));
 for(const c of event.categories){const facts=src.map(s=>({source:s.id,...sourceCategory(s,c)})).filter(f=>f.name);
  const complete=facts.find(f=>f.nominees?.length===c.entries.length&&c.entries.every(e=>f.nominees.some(t=>agrees(e,t))));
  const winners=c.entries.filter(e=>e.status==='winner');const winning=facts.filter(f=>f.winner&&winners.every(e=>agrees(e,f.winner)));
  if(!complete||!winning.length){const f=facts.find(f=>f.nominees?.length)||facts[0];const issue={year,key:c.key,counts:f?`${c.entries.length}/${f.nominees?.length}`:'no category',missing:!complete?c.entries.filter(e=>!f?.nominees?.some(t=>agrees(e,t))).map(e=>e.nominee_name):[],winner:winning.length?'ok':winners.map(e=>e.nominee_name),sourceWinners:facts.filter(f=>f.winner).map(f=>`${f.source}: ${f.winner}`),sourceNominees:f?.nominees};issues.push(issue);console.log(JSON.stringify({...issue,sourceNominees:undefined}));}
 }
}
await writeFile('data/awards/verification-issues.local.json',JSON.stringify(issues,null,2));console.log('Unverified categories:',issues.length);
}

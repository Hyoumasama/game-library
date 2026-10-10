import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
const sources=JSON.parse(await readFile('data/awards/verification/sources.json','utf8'));
const add=(id,url,content,categories)=>{sources.push({id,url,retrieved_at:'2026-10-08',sha256:createHash('sha256').update(content).digest('hex'),categories});};
const html=await readFile('data/awards/polygon-nominees-2014.html','utf8'),dom=load(html),categories=[];
dom('.content-block-regular').first().find('p').each((_,p)=>{
 const name=dom(p).find('strong').first().text();if(!name)return;
 const block=dom(p).clone();block.find('strong').first().remove();
 const nominees=load(block.html().replace(/<br\s*\/?\s*>/gi,'\n')).root().text().split('\n').map(t=>t.trim()).filter(Boolean);
 categories.push({name,winner:null,nominees});
});
add('polygon-nominees-2014','https://www.polygon.com/2014/11/21/7259309/game-awards-2014-nominees',html,categories);
// Factual recipient/title lists transcribed from the linked records, not article prose.
const records=[
 ['washingtonpost-2022','https://www.washingtonpost.com/video-games/2022/12/08/game-awards/',[{name:"Players' Voice",winner:null,nominees:['God of War Ragnarok','Elden Ring','Stray','Sonic Frontiers','Genshin Impact']}]],
 ['siliconera-2020','https://www.siliconera.com/here-are-the-game-awards-2020-winners/',[{name:'Most Anticipated Game',winner:'Elden Ring',nominees:[]}]],
 ['wiser-2019','https://wiser.my/sekiro-shadows-die-twice-diumumkan-game-of-the-year-oleh-game-awards-2019',[{name:'Global Gaming Citizens',winners:['Fereshteh Forough, Code to Inspire','Damon Packwood, Gameheads',"Luke, Let's Be Well",'Vanessa Gill, Social Cipher','Stephen Machuga and Mat Bergendahl, StackUp'],nominees:['Fereshteh Forough, Code to Inspire','Damon Packwood, Gameheads',"Luke, Let's Be Well",'Vanessa Gill, Social Cipher','Stephen Machuga and Mat Bergendahl, StackUp']},{name:"Player's Voice",winner:'Fire Emblem: Three Houses',nominees:[]}]],
 ['nerdstreet-2023','https://nerdstreet.com/news/2023/11/game-awards-2023-esports-categories-nominees',[{name:'Best Esports Athlete',winner:null,nominees:['Lee "Faker" Sang-hyeok','Mathieu "ZywOo" Herbaut','Max "Demon1" Mazanov','Paco "HyDra" Rusiewiez','Park "Ruler" Jae-hyuk','Phillip "ImperialHal" Dosen']}]],
 ['atariwomen-2017','https://www.atariwomen.org/stories/carol-shaw/',[{name:'Industry Icon Award',winner:'Carol Shaw',nominees:['Carol Shaw']}]],
 ['gamedeveloper-2015','https://www.gamedeveloper.com/production/westwood-co-founders-recognized-as-industry-icons-at-the-game-awards',[{name:'Industry Icon Award',winner:'Brett Sperry and Louis Castle',nominees:['Brett Sperry and Louis Castle']}]],
 ['primagames-2020','https://primagames.com/featured/the-game-awards-2020-liveblog',[{name:'Global Gaming Citizens',winners:['Latinx in Gaming'],nominees:['Latinx in Gaming']}]],
 ['frater-2020','https://www.lukefrater.co.nz/recent-work',[{name:'Global Gaming Citizens',winners:['Jennifer Hazel'],nominees:['Jennifer Hazel']}]],
 ['kahlief-2021','https://www.kahliefadams.com/',[{name:'Global Gaming Citizens',winners:['Kahlief Adams'],nominees:['Kahlief Adams']}]],
 ['canaltech-2021','https://canaltech.com.br/games/samira-close-aparece-de-surpresa-no-the-game-awards-2021-204110/',[{name:'Global Gaming Citizens',winners:['The Drag Stream Community (Deere and Samira Close)'],nominees:['The Drag Stream Community (Deere and Samira Close)']}]],
 ['otakublend-2024','https://otakublend.com/the-game-awards-2024-recap/',[{name:'Global Gaming Citizens',winner:'Laura Carter',nominees:['Laura Carter']}]],
 ['destructoid-2020','https://www.destructoid.com/ghost-of-tsushima-won-the-audience-vote-at-the-game-awards/',[{name:"Player's Voice",winner:'Ghost of Tsushima',nominees:['Ghost of Tsushima','The Last of Us Part II','Hades','Doom Eternal','Spider-Man: Miles Morales']}]],
 ['pushsquare-2021','https://www.pushsquare.com/news/2021/12/the-game-awards-final-round-of-fan-voting-for-players-voice-award-live',[{name:"Players' Voice",winner:null,nominees:['Forza Horizon 5','Halo Infinite','It Takes Two','Metroid Dread','Resident Evil Village']}]],
 ['xboxwire-2021','https://news.xbox.com/en-us/2021/12/09/the-game-awards-2021-recap/',[{name:"Players' Voice",winner:'Halo Infinite',nominees:[]}]],
 ['psxbrasil-2023','https://psxbrasil.com.br/veja-os-finalistas-do-players-voice-do-the-game-awards-2023-trailer-do-evento/',[{name:"Players' Voice",winner:null,nominees:["Baldur's Gate 3",'Cyberpunk 2077: Phantom Liberty','Genshin Impact',"Marvel's Spider-Man 2",'Zelda: Tears of the Kingdom']}]],
 ['gameluster-2018','https://gameluster.com/game-awards-2018-winners/',[{name:'Global Gaming Citizens',winners:['Sadia Bashir','Steven Spohn','Lual Mayen'],nominees:['Sadia Bashir','Steven Spohn','Lual Mayen']}]],
 ['girlsmakegames-2025','https://www.linkedin.com/posts/girls-make-games_girlsmakegames-changethegame-thegameawards-activity-7405314759186608128-CW6W',[{name:'Game Changer',winner:'Girls Make Games',nominees:['Girls Make Games']}]],
 ['sureai-2016','https://forum.sureai.net/viewtopic.php?t=11756',[{name:'Best Fan Creation',winner:'Enderal: The Shards of Order',nominees:[]}]],
];
for(const [id,url,cats] of records){
 // Archive response fingerprints locally; inaccessible pages use the already reviewed factual transcription.
 let content=JSON.stringify(cats);try{const r=await fetch(url);if(r.ok){content=await r.text();await writeFile(`data/awards/${id}.html`,content);}}catch{}
 add(id,url,content,cats);
}
for(const [year,id,name,category] of [[2018,'OdJZspTm_wA','Greg Thomas','Industry Icon Award'],[2020,'ZV2s7BRa5VM','Adam Gazzaley','Global Gaming Citizens'],[2021,'dn0HWM6MOsM','Anisa Sanusi','Global Gaming Citizens'],[2024,'4QMXa97WzWM','Amir Satvat','Game Changer']]){
 const url=`https://www.youtube.com/watch?v=${id}`,r=await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);if(!r.ok)throw Error('Missing video metadata');const raw=await r.text();add(`video-${id}-${year}`,url,raw,[{name:category,winners:[name],nominees:[name]}]);
}
await writeFile('data/awards/verification/sources.json',JSON.stringify(sources,null,2)+'\n');

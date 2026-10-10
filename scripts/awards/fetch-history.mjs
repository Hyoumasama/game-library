// Secondary-source staging only: never auto-publish or claim official verification.
import { load } from "cheerio";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const order = ["game-of-the-year","best-game-direction","best-narrative","best-art-direction","best-score-and-music","best-audio-design","best-performance","innovation-in-accessibility","games-for-impact","best-ongoing-game","best-community-support","best-independent-game","best-debut-indie-game","best-mobile-game","best-vr-ar-game","best-action-game","best-action-adventure-game","best-rpg","best-fighting-game","best-family-game","best-sim-strategy-game","best-sports-racing-game","best-multiplayer-game"];
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const aliases = { "best-score-soundtrack":"best-score-and-music","best-score-music":"best-score-and-music", "best-role-playing-game":"best-rpg", "best-role-playing":"best-rpg", "best-action-adventure":"best-action-adventure-game", "best-esports-game":"best-esports-game", "best-sports-racing":"best-sports-racing-game", "best-sim-strategy":"best-sim-strategy-game", "best-vr-ar":"best-vr-ar-game", "best-mobile-handheld-game":"best-mobile-game", "best-debut-indie":"best-debut-indie-game", "best-debut-independent-game":"best-debut-indie-game" };
await mkdir("data/awards",{recursive:true});
const report=[];
// Refuse before any downloads or writes, including earlier years in a mixed archive.
for(let year=2014;year<=2025;year++) {
  let existing;try { existing=JSON.parse(await readFile(`data/awards/tga-${year}.json`,"utf8")); } catch(error) { if(error.code!=="ENOENT") throw error; }
  if(existing?.verified || existing?.status==="published") throw Error(`${year}: verified history is protected. Stage new research in a separate directory.`);
}
for(let year=2014;year<=2025;year++) {
  const source_url=`https://en.wikipedia.org/wiki/The_Game_Awards_${year}`;
  const response=await fetch(source_url); if(!response.ok) throw Error(`${year}: HTTP ${response.status}`);
  const html=await response.text(), $=load(html); $("style,sup,.mw-editsection").remove();
  const categories=[];
  $("table").each((_,table)=> {
    if(!$(table).hasClass("wikitable") || !$(table).find("th").toArray().some(th => /^(Game of the Year|Best |Most Anticipated|Industry Icon|Games for|Esports |Trending Gamer|Content Creator|Players' Voice)/.test($(th).text().trim()))) return;
    let names=[];
    $(table).find("tr").each((_,tr)=>{
      const headers=$(tr).children("th");
      if(headers.length) { names=headers.map((_,th)=>$(th).text().trim()).get(); return; }
      $(tr).children("td").each((i,td)=>{
        const name=names[i]; if(!name || !$(td).find("li").length) return;
        const key=aliases[slug(name)] || slug(name);
        const honorary=/industry icon|global gaming|game changer/i.test(name);
        const type=/performance|voice acting|esports (player|athlete|coach)|content creator|trending gamer/i.test(name)?"person":/esports team|developer of the year/i.test(name)?"team":/adaptation/i.test(name)?"adaptation":/esports (event|moment)/i.test(name)?"event":/fan creation|industry icon|global gaming|game changer/i.test(name)?"other":"game";
        const entries=[];
        $(td).find("li").each((_,li)=>{
          const node=$(li).clone(); node.children("ul,ol").remove();
          if(node.find("s,del").length) return; // Rescinded nominations are not final nominees.
          const text=node.text().replace(/[‡†*]/g,"").replace(/\s+/g," ").trim();
          const winner=honorary || node.find("b,strong").length>0;
          // Game titles are italicized; people/teams retain their actual identity.
          const italic=node.find("i").first().text().trim();
          let nominee_name=type === "game" ? italic || text.split(/\s[–—]\s/)[0] : type === "event" || type === "other" ? text : text.split(/\s[–—]\s/)[0];
          nominee_name=nominee_name.replace(/\s+/g," ").trim();
          if(!nominee_name) return;
          let game_title=type === "game" ? nominee_name : type === "person" && /performance|voice/i.test(name) ? italic || null : null;
          if(game_title) game_title=game_title.replace(/\s+/g," ").trim();
          if(type === "person" && game_title === nominee_name) game_title=null;
          const entryKey=createHash("sha256").update(`${type}:${nominee_name}:${game_title || ""}`).digest("hex").slice(0,24);
          entries.push({key:entryKey,nominee_name,nominee_type:type,game_title,status:winner?"winner":"nominee",image_url:null});
        });
        if(entries.length) categories.push({key,name,honorary,display_order:order.includes(key)?order.indexOf(key):100+categories.length,entries});
      });
    });
  });
  // Honorary recipients can be reported in prose instead of the nominees tables.
  const prose=$("p").map((_,p)=>$(p).text().replace(/\s+/g," ")).get().join("\n");
  const changer=prose.match(/Game Changer award honored ([^,.]+?)(?: for|, an)/i);
  if(changer && !categories.some(c=>c.key==="game-changer")) {
    const nominee_name=changer[1].trim(),nominee_type=prose.includes("given to the organization "+nominee_name)?"other":"person";
    categories.push({key:"game-changer",name:"Game Changer Award",honorary:true,display_order:200,entries:[{key:createHash("sha256").update(`${nominee_type}:${nominee_name}:`).digest("hex").slice(0,24),nominee_name,nominee_type,game_title:null,status:"winner",image_url:null}]});
  }
  const citizen=prose.match(/(?:^|\n)([^,.]+?), the founder[^\n]+?was named a Global Gaming Citizen/);
  if(citizen && !categories.some(c=>c.key==="global-gaming-citizens")) {
    const nominee_name=citizen[1].trim();
    categories.push({key:"global-gaming-citizens",name:"Global Gaming Citizens",honorary:true,display_order:201,entries:[{key:createHash("sha256").update(`person:${nominee_name}:`).digest("hex").slice(0,24),nominee_name,nominee_type:"person",game_title:null,status:"winner",image_url:null}]});
  }
  const gaps=[];
  for(const cat of categories) if(!cat.honorary && cat.entries.filter(e=>e.status==="winner").length!==1) gaps.push(`${cat.name}: winner extraction needs review`);
  if(new Set(categories.map(c=>c.key)).size!==categories.length) gaps.push("Duplicate category keys");
  const event={organization:"tga",year,ceremony_name:`The Game Awards ${year}`,ceremony_date:null,status:"incomplete",verified:false,verification_notes:"",source_url,official_source_url:`https://thegameawards.com/rewind/year-${year}`,data_notes:"Secondary-source archive. Official archive unavailable during import; category completeness and results require verification.",source_sha256:createHash("sha256").update(html).digest("hex"),categories,gaps};
  await writeFile(`data/awards/tga-${year}.json`,JSON.stringify(event,null,2)+"\n");
  report.push({year,categories:categories.length,entries:categories.reduce((n,c)=>n+c.entries.length,0),gaps});
  console.log(report.at(-1));
}
await writeFile("data/awards/history-report.json",JSON.stringify(report,null,2)+"\n");

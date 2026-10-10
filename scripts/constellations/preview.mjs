// Disposable loopback-only fixture; never reads .env or connects to Supabase.
import {PGlite} from "@electric-sql/pglite";
import {readFile} from "node:fs/promises";
import {createServer} from "node:http";
const db = new PGlite();
await db.exec("create role anon; create role authenticated; create role service_role bypassrls; create table games(id bigint primary key,title text,status text); insert into games values(1,'Alpha','Unplayed'),(2,'Beta','Unplayed'),(3,'Gamma','Unplayed'),(4,'Delta','Unplayed'); create table game_pipeline(game_id bigint,position integer,created_at timestamptz);");
for (const name of ["20261006152124_play_constellations.sql", "20261006190000_reorder_play_routes.sql", "20261008185222_move_play_route_game.sql"])
  await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
const ids = [1,2,3].map(n => `00000000-0000-0000-0000-00000000000${n}`);
async function reset() {
  await db.exec("delete from play_routes");
  for (const [i,name] of ["Source", "Destination", "Empty"].entries())
    await db.query("insert into play_routes(id,name,position) values($1,$2,$3)", [ids[i],name,i+1]);
  await db.query("insert into play_route_games(route_id,game_id,position,status) values($1,1,1,'completed'),($1,2,2,'current'),($1,3,3,'upcoming'),($2,4,1,'upcoming')", [ids[0],ids[1]]);
}
await reset();
async function rows() {
  const routes = (await db.query("select * from play_routes order by position")).rows;
  const games = (await db.query("select p.*,jsonb_build_object('id',g.id,'title',g.title,'status',g.status) games from play_route_games p join games g on g.id=p.game_id order by p.position")).rows;
  return routes.map(r => ({...r,play_route_games: games.filter(g => g.route_id === r.id)}));
}
const server = createServer(async (req,res) => {
  const path = new URL(req.url,"http://127.0.0.1").pathname;
  res.setHeader("Content-Type","application/json");
  try {
    if(path === "/fixture/reset" && req.method === "POST") {await reset(); res.end("{}"); return;}
    if(path === "/fixture/routes") {res.end(JSON.stringify(await rows())); return;}
    const name = path.split("/").at(-1);
    if(path.includes("/rpc/")) {
      if(name === "get_admin_game_options") {res.end('[{"stores":[],"platforms":[],"hardware":[]}]');return;}
      if(!["move_play_route_game", "mutate_play_route", "reorder_play_routes"].includes(name)) {res.writeHead(404);res.end("{}");return;}
      let body=""; for await(const chunk of req) body += chunk;
      const result = await db.query(`select public.${name}($1::jsonb) result`, [JSON.stringify(JSON.parse(body).payload)]);
      res.end(JSON.stringify(result.rows[0].result));return;
    }
    if(name === "play_routes") {res.end(JSON.stringify(await rows()));return;}
    res.end("[]");
  } catch(error) {
    res.writeHead(400);res.end(JSON.stringify({code: error.code || "XX000",message: error.message}));
  }
});
server.listen(4402,"127.0.0.1",()=>console.log("Disposable Constellations database ready on http://127.0.0.1:4402"));
process.on("SIGINT",()=>server.close(()=>db.close().then(()=>process.exit())));

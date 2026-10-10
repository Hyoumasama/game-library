import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionValue } from "@/lib/adminAuth";
import { supabase } from "@/lib/supabase";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS, revalidateGameCaches } from "@/lib/server/cacheTags";
import { verifiedAwardHistory } from "@/lib/server/awardHistory";
async function authorized() { return verifyAdminSessionValue((await cookies()).get(ADMIN_SESSION_COOKIE)?.value); }
export async function POST(request: Request) {
  if (!await authorized()) return Response.json({ error: "Admin login required" }, { status: 401 });
  let body;
  try { body=await request.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  if (!Number.isInteger(body?.year)) return Response.json({ error: "Select a verified ceremony year" }, { status: 400 });
  // The CLI must name its database, preventing an accidentally misconfigured application from importing elsewhere.
  if (body.expectedDatabaseUrl && body.expectedDatabaseUrl !== process.env.SUPABASE_URL) return Response.json({ error: "Application database does not match the requested target" }, { status: 409 });
  const event=verifiedAwardHistory(body.year);
  if (!event) return Response.json({ error: "Ceremony is unverified or its data changed after verification" }, { status: 409 });
  const { error }=await supabase.rpc("import_award_event", { payload: event });
  if (error) return Response.json({ error: "Unable to import ceremony" }, { status: 500 });
  revalidateTag(CACHE_TAGS.awards, { expire: 0 });
  revalidateGameCaches();
  return Response.json({ saved: true, year: event.year, status: event.status });
}
export async function GET(request: Request) {
  if (!await authorized()) return Response.json({ error: "Admin login required" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const search = params.get("search");
  if (search != null) {
    const term = search.trim().slice(0,100).replace(/[\\%_]/g, "\\$&");
    if (term.length < 2) return Response.json({ games: [] });
    const { data, error } = await supabase.from("games").select("id,title,platform,store,status").ilike("title", `%${term}%`).order("id").limit(20);
    if (error) return Response.json({ error: "Search failed" }, { status: 500 });
    return Response.json({ games: data });
  }
  const page = Math.max(1, Math.min(1000, Number(params.get("page")) || 1));
  const { data, error, count } = await supabase.from("award_entries").select("id,nominee_name,nominee_type,game_title,match_method,award_events(year),award_categories(name)", { count: "exact" }).is("game_id", null).in("nominee_type", ["game", "person"]).or("nominee_type.eq.game,game_title.not.is.null").order("id").range((page-1)*30,page*30-1);
  if (error) return Response.json({ error: "Unable to load review queue. Apply the awards migration and import first." }, { status: 500 });
  return Response.json({ entries: data, count, page });
}
export async function PATCH(request: Request) {
  if (!await authorized()) return Response.json({ error: "Admin login required" }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  if (!body || typeof body.entryId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.entryId) || !(body.gameId === null || Number.isSafeInteger(body.gameId) && body.gameId > 0)) return Response.json({ error: "Select an award and an existing game" }, { status: 400 });
  const entry = await supabase.from("award_entries").select("id,nominee_type,game_title").eq("id", body.entryId).maybeSingle();
  if (entry.error) return Response.json({ error: "Unable to check award" }, { status: 500 });
  if (!entry.data || (entry.data.nominee_type !== "game" && !(entry.data.nominee_type === "person" && entry.data.game_title))) return Response.json({ error: "This entry cannot link to a game" }, { status: 400 });
  if (body.gameId != null) {
    const game = await supabase.from("games").select("id").eq("id", body.gameId).maybeSingle();
    if (game.error) return Response.json({ error: "Unable to check game" }, { status: 500 });
    if (!game.data) return Response.json({ error: "Game does not exist" }, { status: 400 });
  }
  const { error } = await supabase.from("award_entries").update({ game_id: body.gameId, canonical_game_id: null, match_method: body.gameId == null ? "blocked" : "manual", updated_at: new Date().toISOString() }).eq("id", body.entryId);
  if (error) return Response.json({ error: "Unable to save link" }, { status: 500 });
  revalidateTag(CACHE_TAGS.awards, { expire: 0 }); revalidateGameCaches();
  return Response.json({ saved: true });
}

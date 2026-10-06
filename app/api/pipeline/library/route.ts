import { supabase } from "@/lib/supabase";
import { PIPELINE_GAME_FIELDS } from "@/lib/server/pipeline";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const search = (params.get("search") || "").trim().slice(0, 120);
  const page = Math.max(0, Math.min(10000, Number(params.get("page")) || 0));
  let query = supabase.from("games").select(PIPELINE_GAME_FIELDS);
  if (search) query = query.ilike("title", `%${search.replace(/[%_\\]/g, "\\$&")}%`);
  const { data, error } = await query.order("title").order("id").range(Math.floor(page) * 30, Math.floor(page) * 30 + 30);
  if (error) return Response.json({ error: "Unable to search library." }, { status: 500 });
  return Response.json({ games: (data || []).slice(0, 30), hasMore: (data || []).length > 30 });
}

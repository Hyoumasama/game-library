import { searchTmdb } from "@/lib/server/watch/tmdb";
import { supabase } from "@/lib/supabase";

// TMDB search for the Add Work modal: /api/admin/watch/search?q=frieren&type=tv
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim();
  const type = searchParams.get("type");

  if (type !== "tv" && type !== "movie") {
    return Response.json({ error: "type must be tv or movie" }, { status: 400 });
  }

  if (query.length < 2) return Response.json({ results: [] });

  try {
    const results = (await searchTmdb(query, type)).slice(0, 12);
    if (!results.length) return Response.json({ results: [] });

    const { data: existing, error } = await supabase
      .from("watch_media")
      .select("id, tmdb_id")
      .eq("tmdb_type", type)
      .in("tmdb_id", results.map((result) => result.id));
    if (error) throw error;

    const existingIds = new Map((existing || []).map((work) => [work.tmdb_id, work.id]));
    return Response.json({
      results: results.map((result) => ({
        ...result,
        existingMediaId: existingIds.get(result.id) ?? null,
      })),
    });
  } catch (error) {
    console.error("WATCH TMDB SEARCH ERROR:", error);
    return Response.json({ error: "TMDB search failed" }, { status: 502 });
  }
}

import { searchTmdb } from "@/lib/server/watch/tmdb";

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
    return Response.json({ results: (await searchTmdb(query, type)).slice(0, 12) });
  } catch (error) {
    console.error("WATCH TMDB SEARCH ERROR:", error);
    return Response.json({ error: "TMDB search failed" }, { status: 502 });
  }
}

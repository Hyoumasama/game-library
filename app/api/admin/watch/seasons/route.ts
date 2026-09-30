import { getTmdbSeasonOutline } from "@/lib/server/watch/works";

// Season list of a TMDB series for the Add Work modal's owned-episodes
// editor: /api/admin/watch/seasons?tmdbId=209867
export async function GET(request: Request) {
  const tmdbId = Number(new URL(request.url).searchParams.get("tmdbId"));

  if (!Number.isSafeInteger(tmdbId) || tmdbId <= 0) {
    return Response.json({ error: "Invalid tmdbId" }, { status: 400 });
  }

  try {
    return Response.json({ seasons: await getTmdbSeasonOutline(tmdbId) });
  } catch (error) {
    console.error("WATCH TMDB SEASONS ERROR:", error);
    return Response.json({ error: "TMDB lookup failed" }, { status: 502 });
  }
}

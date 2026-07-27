import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionValue,
} from "@/lib/adminAuth";
import { supabase } from "@/lib/supabase";
import {
  getTmdbImageUrl,
  getTmdbTvSeasonDetails,
} from "@/lib/server/watch/tmdb";
import { WatchSourceError } from "@/lib/server/watch/types";

function jsonError(error: string, status: number, headers?: HeadersInit) {
  return Response.json({ error }, { status, headers });
}

function parsePositiveInteger(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseSeasonNumber(value: string | null) {
  if (value == null || !/^\d+$/.test(value)) return null;

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function dateOrNull(value?: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const isAdmin = await verifyAdminSessionValue(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  );

  if (!isAdmin) {
    return jsonError("Admin authorization required", 401);
  }

  const { id: rawId } = await params;
  const id = parsePositiveInteger(rawId);

  if (!id) {
    return jsonError("id must be a positive integer", 400);
  }

  const { data: item, error: itemError } = await supabase
    .from("watch_import_items")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (itemError) return jsonError("Watch import item lookup failed", 500);
  if (!item) return jsonError("Watch import item not found", 404);

  const { searchParams } = new URL(request.url);
  const tmdbId = parsePositiveInteger(searchParams.get("tmdbId"));
  const seasonNumber = parseSeasonNumber(searchParams.get("seasonNumber"));

  if (!tmdbId) {
    return jsonError("tmdbId must be a positive integer", 400);
  }

  if (seasonNumber == null) {
    return jsonError("seasonNumber must be zero or a positive integer", 400);
  }

  try {
    const season = await getTmdbTvSeasonDetails(tmdbId, seasonNumber);

    return Response.json({
      season: {
        season_number: season.season_number || seasonNumber,
        title: season.name || null,
        overview: season.overview || null,
        poster_url: getTmdbImageUrl(season.poster_path),
        air_date: dateOrNull(season.air_date),
        episode_count: season.episodes?.length || 0,
        tmdb_season_id: season.id,
        episodes: (season.episodes || [])
          .filter((episode) => Number.isSafeInteger(episode.episode_number))
          .map((episode) => ({
            episode_number: episode.episode_number,
            tmdb_episode_id: episode.id,
            title: episode.name || null,
            overview: episode.overview || null,
            air_date: dateOrNull(episode.air_date),
            still_url: getTmdbImageUrl(episode.still_path),
            duration: episode.runtime || null,
          })),
      },
    });
  } catch (error) {
    if (error instanceof WatchSourceError) {
      if (error.status === 429) {
        return jsonError(
          `${error.source} rate limit reached`,
          429,
          error.retryAfter ? { "Retry-After": error.retryAfter } : undefined
        );
      }

      if (error.status === 404) return jsonError("Season not found", 404);

      return jsonError(`${error.source} season lookup failed`, 500);
    }

    console.error("Watch TMDB season lookup failed:", error);

    return jsonError("Watch TMDB season lookup failed", 500);
  }
}

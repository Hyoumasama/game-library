import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionValue,
} from "@/lib/adminAuth";
import { supabase } from "@/lib/supabase";
import {
  getAniListPreview,
  getTmdbPreview,
} from "@/lib/server/watch/manualMatch";
import { WatchSourceError } from "@/lib/server/watch/types";

function jsonError(error: string, status: number, headers?: HeadersInit) {
  return Response.json({ error }, { status, headers });
}

function parsePositiveInteger(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
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
  const source = searchParams.get("source");
  const candidateId = parsePositiveInteger(searchParams.get("candidateId"));
  const tmdbType = searchParams.get("tmdbType");

  if (source !== "tmdb" && source !== "anilist") {
    return jsonError("source must be tmdb or anilist", 400);
  }

  if (!candidateId) {
    return jsonError("candidateId must be a positive integer", 400);
  }

  if (source === "tmdb" && tmdbType !== "tv" && tmdbType !== "movie") {
    return jsonError("tmdbType must be tv or movie", 400);
  }

  if (source === "anilist" && tmdbType) {
    return jsonError("tmdbType is only valid for TMDB", 400);
  }

  try {
    const candidate =
      source === "tmdb"
        ? await getTmdbPreview(candidateId, tmdbType as "tv" | "movie")
        : await getAniListPreview(candidateId);

    if (!candidate) {
      return jsonError("Candidate not found", 404);
    }

    return Response.json({ candidate });
  } catch (error) {
    if (error instanceof WatchSourceError) {
      if (error.status === 429) {
        return jsonError(
          `${error.source} rate limit reached`,
          429,
          error.retryAfter ? { "Retry-After": error.retryAfter } : undefined
        );
      }

      if (error.status === 404) return jsonError("Candidate not found", 404);

      return jsonError(`${error.source} candidate lookup failed`, 500);
    }

    console.error("Watch candidate preview failed:", error);

    return jsonError("Watch candidate preview failed", 500);
  }
}

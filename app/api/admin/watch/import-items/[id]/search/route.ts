import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionValue,
} from "@/lib/adminAuth";
import { supabase } from "@/lib/supabase";
import { searchManualCandidates } from "@/lib/server/watch/manualMatch";
import { WatchSourceError } from "@/lib/server/watch/types";

function jsonError(error: string, status: number, headers?: HeadersInit) {
  return Response.json({ error }, { status, headers });
}

function parseId(value: string) {
  if (!/^\d+$/.test(value)) return null;

  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
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
  const id = parseId(rawId);

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
  const query = (searchParams.get("query") || "").trim();
  const tmdbType = searchParams.get("tmdbType") || "tv";

  if (source !== "tmdb" && source !== "anilist") {
    return jsonError("source must be tmdb or anilist", 400);
  }

  if (!query) {
    return jsonError("query is required", 400);
  }

  if (query.length > 200) {
    return jsonError("query is too long", 400);
  }

  if (source === "tmdb" && tmdbType !== "tv" && tmdbType !== "movie") {
    return jsonError("tmdbType must be tv or movie", 400);
  }

  if (source === "anilist" && searchParams.has("tmdbType")) {
    return jsonError("tmdbType is only valid for TMDB", 400);
  }

  try {
    const results = await searchManualCandidates({
      source,
      query,
      tmdbType: tmdbType as "tv" | "movie",
    });

    return Response.json({ results });
  } catch (error) {
    if (error instanceof WatchSourceError) {
      if (error.status === 429) {
        return jsonError(
          `${error.source} rate limit reached`,
          429,
          error.retryAfter ? { "Retry-After": error.retryAfter } : undefined
        );
      }

      return jsonError(`${error.source} search failed`, 500);
    }

    console.error("Watch manual search failed:", error);

    return jsonError("Watch manual search failed", 500);
  }
}

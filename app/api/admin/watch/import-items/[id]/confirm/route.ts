import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionValue,
} from "@/lib/adminAuth";
import { supabase } from "@/lib/supabase";
import {
  buildConfirmPayload,
  importItemColumns,
  type WatchImportItem,
} from "@/lib/server/watch/manualMatch";
import { WatchSourceError } from "@/lib/server/watch/types";

type ErrorDetails = Record<string, unknown>;

function jsonError(
  error: string,
  status: number,
  headers?: HeadersInit,
  details?: ErrorDetails
) {
  return Response.json(
    process.env.NODE_ENV === "development" && details
      ? { error, details }
      : { error },
    { status, headers }
  );
}

function parsePositiveInteger(value: unknown) {
  if (typeof value !== "number") return null;

  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function parseNonNegativeInteger(value: unknown) {
  if (typeof value !== "number") return null;

  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

type ParseOwnedEpisodesResult =
  | { ownedEpisodes: { seasonNumber: number; episodeNumber: number }[] }
  | { error: string };

function parseOwnedEpisodes(value: unknown): ParseOwnedEpisodesResult {
  if (!Array.isArray(value)) {
    return { ownedEpisodes: [] };
  }

  const seen = new Set<string>();
  const ownedEpisodes: { seasonNumber: number; episodeNumber: number }[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      return { error: "ownedEpisodes must contain objects" };
    }

    const record = item as Record<string, unknown>;
    const seasonNumber = parseNonNegativeInteger(record.seasonNumber);
    const episodeNumber = parsePositiveInteger(record.episodeNumber);

    if (seasonNumber == null || !episodeNumber) {
      return {
        error:
          "ownedEpisodes seasonNumber must be zero or a positive integer, and episodeNumber must be a positive integer",
      };
    }

    const key = `${seasonNumber}:${episodeNumber}`;

    if (seen.has(key)) {
      return { error: "ownedEpisodes must not contain duplicate episodes" };
    }

    seen.add(key);
    ownedEpisodes.push({ seasonNumber, episodeNumber });
  }

  return { ownedEpisodes };
}

function parseId(value: string) {
  if (!/^\d+$/.test(value)) return null;

  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parseSelection(body: any) {
  const source = body?.source;
  const candidateId = parsePositiveInteger(body?.candidateId);
  const candidateIds: (number | null)[] | null = Array.isArray(body?.candidateIds)
    ? body.candidateIds.map(parsePositiveInteger)
    : null;
  const tmdbType = body?.tmdbType;
  const ownedEpisodesResult = parseOwnedEpisodes(body?.ownedEpisodes);

  if ("error" in ownedEpisodesResult) {
    return { error: ownedEpisodesResult.error };
  }

  const ownedEpisodes = ownedEpisodesResult.ownedEpisodes;

  if (source !== "tmdb" && source !== "anilist") {
    return { error: "source must be tmdb or anilist" };
  }

  if (source === "tmdb" && !candidateId) {
    return { error: "candidateId must be a positive integer" };
  }

  if (source === "anilist" && !candidateIds) {
    return { error: "candidateIds must be an array" };
  }

  if (candidateIds?.some((id) => !id)) {
    return { error: "candidateIds must contain positive integers" };
  }

  if (candidateIds && candidateIds.length === 0) {
    return { error: "candidateIds must contain at least one AniList ID" };
  }

  if (candidateIds && candidateIds.length > 10) {
    return { error: "Select 10 AniList IDs or fewer" };
  }

  if (candidateIds && new Set(candidateIds).size !== candidateIds.length) {
    return { error: "AniList IDs must be unique" };
  }

  if (source === "tmdb" && tmdbType !== "tv" && tmdbType !== "movie") {
    return { error: "tmdbType must be tv or movie" };
  }

  if (source === "anilist" && tmdbType !== null && tmdbType !== undefined) {
    return { error: "tmdbType must be null for AniList" };
  }

  if ((source !== "tmdb" || tmdbType !== "tv") && ownedEpisodes.length > 0) {
    return { error: "ownedEpisodes are only valid for TMDB TV matches" };
  }

  return {
    selection:
      source === "tmdb"
        ? {
            tmdb: { id: candidateId!, type: tmdbType },
            anilistIds: [],
            includeSpecials: false,
            ownedEpisodes,
          }
        : {
            tmdb: null,
            anilistIds: candidateIds as number[],
            includeSpecials: false,
            ownedEpisodes: [],
          },
  };
}

function statusFromRpcError(message: string) {
  if (message.includes("IMPORT_ITEM_NOT_FOUND")) return 404;
  if (
    message.includes("SOURCE_IDENTITY_CONFLICT") ||
    message.includes("IMPORT_ITEM_ALREADY_MATCHED")
  ) {
    return 409;
  }
  if (message.includes("INVALID_")) return 400;

  return 500;
}

function serializeError(error: unknown) {
  if (!error || typeof error !== "object") {
    return { message: String(error || "") };
  }

  const record = error as Record<string, unknown>;

  return {
    message: record.message,
    code: record.code,
    details: record.details,
    hint: record.hint,
    stack: record.stack,
  };
}

function summarizeConfirmPayload(payload: Awaited<ReturnType<typeof buildConfirmPayload>>) {
  return {
    media: {
      title: payload.media.title,
      slug: payload.media.slug,
      media_type: payload.media.media_type,
      format: payload.media.format,
      tmdb_type: payload.media.tmdb_type,
      tmdb_id: payload.media.tmdb_id,
      anilist_id: payload.media.anilist_id,
      mal_id: payload.media.mal_id,
      total_episodes: payload.media.total_episodes,
    },
    seasons: payload.seasons.map((season) => ({
      season_number: season.season_number,
      title: season.title,
      anilist_id: season.anilist_id,
      tmdb_season_id: season.tmdb_season_id,
      episode_count: season.episode_count,
      episodes: season.episodes?.length || 0,
    })),
    sourceLinks: payload.sourceLinks.map((link) => ({
      source: link.source,
      source_id: link.source_id,
      source_type: link.source_type,
      relation_type: link.relation_type,
      part_number: link.part_number,
      episode_count: link.episode_count,
      episode_offset: link.episode_offset,
    })),
    ownedEpisodes: payload.ownedEpisodes,
  };
}

export async function POST(
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

  const body = await request.json().catch(() => null);
  const parsed = parseSelection(body);

  if (parsed.error || !parsed.selection) {
    return jsonError(parsed.error || "Invalid confirmation payload", 400);
  }

  const { data: item, error: itemError } = await supabase
    .from("watch_import_items")
    .select(importItemColumns)
    .eq("id", id)
    .maybeSingle();

  if (itemError) return jsonError("Watch import item lookup failed", 500);
  if (!item) return jsonError("Watch import item not found", 404);

  const importItem = item as unknown as WatchImportItem;

  if (importItem.status === "matched" && importItem.matched_media_id) {
    return jsonError("Import item is already matched", 409);
  }

  try {
    const payload = await buildConfirmPayload(
      importItem,
      parsed.selection
    );

    const { data, error } = await supabase.rpc("confirm_watch_import_match", {
      p_import_item_id: id,
      p_media: payload.media,
      p_seasons: payload.seasons,
      p_source_links: payload.sourceLinks,
      p_owned_episodes: payload.ownedEpisodes,
    });

    if (error) {
      const details = {
        rpc: "confirm_watch_import_match",
        operation: "watch-import-confirm",
        importItemId: id,
        selection: parsed.selection,
        payload: summarizeConfirmPayload(payload),
        error: serializeError(error),
      };

      console.error("[watch-import-confirm] Database transaction failed", details);

      return jsonError(
        error.message.includes(":") ? error.message.split(":")[0] : "Database transaction failed",
        statusFromRpcError(error.message),
        undefined,
        details
      );
    }

    return Response.json({ media_id: data });
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

      return jsonError(`${error.source} lookup failed`, 500);
    }

    const message = error instanceof Error ? error.message : "";

    if (message.startsWith("ANILIST_CANDIDATE_NOT_FOUND")) {
      return jsonError("AniList candidate not found", 404);
    }

    if (message.startsWith("TMDB_CANDIDATE_NOT_FOUND")) {
      return jsonError("TMDB candidate not found", 404);
    }

    if (message === "NO_SOURCE_SELECTED") {
      return jsonError("Select at least one source candidate", 400);
    }

    console.error("Watch import match confirmation failed:", error);

    return jsonError("Watch import match confirmation failed", 500);
  }
}

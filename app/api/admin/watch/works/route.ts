import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/server/cacheTags";
import { parseEpisodeRangesBody, parseWatchStatus } from "@/lib/server/watch/workPayload";
import { addWatchWork, WatchWorkError } from "@/lib/server/watch/works";
import { normalizeSources } from "@/lib/watchSources";

const formats = new Set(["series", "movie", "ova"]);

// Adds a work from TMDB. Body:
// { tmdbId, tmdbType: "tv" | "movie", format, watchStatus,
//   owned: { [season]: "all" | "1-12" }, watched: { [season]: ranges },
//   sources: ["Hard Disk", "Netflix", ...] }
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const tmdbId = Number(body?.tmdbId);
  const tmdbType = body?.tmdbType;
  const format = body?.format;

  if (!Number.isSafeInteger(tmdbId) || tmdbId <= 0) {
    return Response.json({ error: "Invalid tmdbId" }, { status: 400 });
  }

  if (tmdbType !== "tv" && tmdbType !== "movie") {
    return Response.json({ error: "tmdbType must be tv or movie" }, { status: 400 });
  }

  if (!formats.has(format)) {
    return Response.json({ error: "format must be series, movie or ova" }, { status: 400 });
  }

  let watchStatus: string;
  let owned: ReturnType<typeof parseEpisodeRangesBody>;
  let watched: ReturnType<typeof parseEpisodeRangesBody>;

  try {
    watchStatus = parseWatchStatus(body?.watchStatus);
    owned = parseEpisodeRangesBody(body?.owned);
    watched = parseEpisodeRangesBody(body?.watched);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }

  try {
    const result = await addWatchWork({
      tmdbId,
      tmdbType,
      format,
      watchStatus,
      owned,
      watched,
      sources: normalizeSources(body?.sources),
    });

    revalidateTag(CACHE_TAGS.watchLibrary, { expire: 0 });

    return Response.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof WatchWorkError) {
      return Response.json(
        { error: error.message, mediaId: error.mediaId },
        { status: error.status }
      );
    }

    console.error("ADD WATCH WORK ERROR:", error);
    return Response.json({ error: "Failed to add work" }, { status: 500 });
  }
}

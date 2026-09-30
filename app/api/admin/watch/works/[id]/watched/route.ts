import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/server/cacheTags";
import { setEpisodesWatched, WatchWorkError } from "@/lib/server/watch/works";

// Marks one episode or a whole season as watched / not watched from the work
// page. Body: { episodeId, watched } or { seasonNumber, watched }. Returns the
// entry's resulting { watch_status, episodes_watched }.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const mediaId = Number((await params).id);
  const body = await request.json().catch(() => null);
  const episodeId = Number(body?.episodeId);
  const seasonNumber = Number(body?.seasonNumber);

  if (!Number.isSafeInteger(mediaId) || mediaId <= 0) {
    return Response.json({ error: "Invalid work id" }, { status: 400 });
  }

  if (typeof body?.watched !== "boolean") {
    return Response.json({ error: "watched must be true or false" }, { status: 400 });
  }

  const target =
    body?.episodeId != null && Number.isSafeInteger(episodeId) && episodeId > 0
      ? { episodeId }
      : body?.seasonNumber != null && Number.isSafeInteger(seasonNumber) && seasonNumber >= 0
        ? { seasonNumber }
        : null;

  if (!target) {
    return Response.json({ error: "Give an episodeId or a seasonNumber" }, { status: 400 });
  }

  try {
    const entry = await setEpisodesWatched(mediaId, target, body.watched);

    revalidateTag(CACHE_TAGS.watchLibrary, { expire: 0 });

    return Response.json({ entry });
  } catch (error) {
    if (error instanceof WatchWorkError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error("SET EPISODES WATCHED ERROR:", error);
    return Response.json({ error: "Failed to update watched episodes" }, { status: 500 });
  }
}

import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/server/cacheTags";
import { parseEntryPatch, parseEpisodeRangesBody } from "@/lib/server/watch/workPayload";
import {
  deleteWatchWork,
  updateWatchWork,
  WatchWorkError,
} from "@/lib/server/watch/works";

function parseMediaId(id: string) {
  const mediaId = Number(id);

  return Number.isSafeInteger(mediaId) && mediaId > 0 ? mediaId : null;
}

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof WatchWorkError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  console.error(`${fallback.toUpperCase()}:`, error);
  return Response.json({ error: fallback }, { status: 500 });
}

// Updates the library entry and, when present, replaces the owned or watched
// episodes. Body: the entry fields plus optional
// { owned: { [season]: ranges }, watched: { [season]: ranges } }.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const mediaId = parseMediaId((await params).id);

  if (!mediaId) return Response.json({ error: "Invalid work id" }, { status: 400 });

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  let patch: ReturnType<typeof parseEntryPatch>;
  let owned: ReturnType<typeof parseEpisodeRangesBody> | undefined;
  let watched: ReturnType<typeof parseEpisodeRangesBody> | undefined;

  try {
    patch = parseEntryPatch(body);
    owned = "owned" in body ? parseEpisodeRangesBody(body.owned) : undefined;
    watched = "watched" in body ? parseEpisodeRangesBody(body.watched) : undefined;
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }

  try {
    await updateWatchWork(mediaId, patch, { owned, watched });

    revalidateTag(CACHE_TAGS.watchLibrary, { expire: 0 });

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Failed to update work");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const mediaId = parseMediaId((await params).id);

  if (!mediaId) return Response.json({ error: "Invalid work id" }, { status: 400 });

  try {
    await deleteWatchWork(mediaId);

    revalidateTag(CACHE_TAGS.watchLibrary, { expire: 0 });

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Failed to delete work");
  }
}

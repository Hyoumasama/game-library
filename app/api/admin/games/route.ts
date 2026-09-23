import { revalidateTag } from "next/cache";
import { supabase } from "@/lib/supabase";
import {
  buildAchievementPayload,
  buildGamePayload,
  parseAdminGameMetadata,
} from "@/lib/server/adminGamePayload";
import { CACHE_TAGS } from "@/lib/server/cacheTags";

export async function POST(request: Request) {
  const body = await request.json();
  let gamePayload: ReturnType<typeof buildGamePayload>;
  let metadata: ReturnType<typeof parseAdminGameMetadata>;
  const shouldSyncMetadata = Object.hasOwn(body, "franchise") || Object.hasOwn(body, "relationships");

  try {
    gamePayload = buildGamePayload(body);
    metadata = parseAdminGameMetadata(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid payload";

    return Response.json({ error: message }, { status: 400 });
  }

  if (!gamePayload.title) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  const { data: newGame, error } = await supabase
    .from("games")
    .insert(gamePayload)
    .select("id")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const { error: achievementError } = await supabase
    .from("game_achievements")
    .upsert(buildAchievementPayload(body, newGame.id), {
      onConflict: "game_id",
    });

  if (achievementError) {
    await supabase.from("games").delete().eq("id", newGame.id);

    return Response.json({ error: achievementError.message }, { status: 500 });
  }

  try {
    if (shouldSyncMetadata) {
      const { syncAdminGameMetadata } = await import("@/lib/server/adminGameMetadata");
      await syncAdminGameMetadata(newGame.id, metadata);
    }
  } catch (metadataError) {
    await supabase.from("games").delete().eq("id", newGame.id);
    const message = metadataError instanceof Error ? metadataError.message : "Failed to save game metadata";
    return Response.json({ error: message }, { status: 500 });
  }

  // Note: the second arg intentionally omits "max" (stale-while-revalidate).
  // { expire: 0 } forces the next request to wait for fresh data, matching
  // updateTag's read-your-own-writes behavior - this route just can't use
  // updateTag itself since it's a Route Handler, not a Server Action.
  revalidateTag(CACHE_TAGS.homeGames, { expire: 0 });
  // A new game can carry a developer/publisher/franchise that an existing
  // /developer, /publisher, or /franchise page should now list.
  revalidateTag(CACHE_TAGS.browsingEntities, { expire: 0 });

  return Response.json({ success: true });
}

import { revalidateTag } from "next/cache";
import { supabase } from "@/lib/supabase";
import {
  buildAchievementPayload,
  buildGamePayload,
  parseAdminGameMetadata,
} from "@/lib/server/adminGamePayload";
import { getGameById } from "@/lib/games";
import { CACHE_TAGS } from "@/lib/server/cacheTags";

// { expire: 0 } (not "max") makes the next request wait for fresh data
// instead of serving stale-while-revalidate, so an admin edit shows up on
// the very next page load. See app/api/admin/games/route.ts for why this
// can't just be updateTag (Route Handlers can't call it).
function revalidateHomeGames() {
  revalidateTag(CACHE_TAGS.homeGames, { expire: 0 });
  // Edits/deletes can change a game's developer, publisher, or franchise
  // membership (via sync_admin_game_metadata), which the cached
  // /developer, /publisher, and /franchise pages need to pick up too.
  revalidateTag(CACHE_TAGS.browsingEntities, { expire: 0 });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gameId = Number(id);

  const [game, achievementsResult] = await Promise.all([
    getGameById(gameId),
    supabase
      .from("game_achievements")
      .select(
        "bronze, silver, gold, platinum, earned_awards, total_awards, completion_percentage"
      )
      .eq("game_id", gameId)
      .maybeSingle(),
  ]);

  if (achievementsResult.error) {
    return Response.json(
      { error: achievementsResult.error.message },
      { status: 500 }
    );
  }

  return Response.json({
    game,
    achievements: achievementsResult.data || {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
      earned_awards: 0,
      total_awards: 0,
      completion_percentage: 0,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const gameId = Number(id);
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

  const { data, error } = await supabase
    .from("games")
    .update(gamePayload)
    .eq("id", gameId)
    .select(
      `
        id,
        title,
        slug,
        release,
        date_started,
        date_of_purchase,
        completion_last_played,
        score,
        price,
        hours_played,
        status,
        store,
        platform,
        hardware,
        genres,
        cover_url,
        hero_url,
        wide_cover_url,
        steam_vertical_cover,
        summary,
        screenshots,
        developer,
        publisher,
        igdb_id,
        igdb_slug,
        steam_appid
      `
    )
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const { error: achievementError } = await supabase
    .from("game_achievements")
    .upsert(buildAchievementPayload(body, gameId), {
      onConflict: "game_id",
    });

  if (achievementError) {
    return Response.json({ error: achievementError.message }, { status: 500 });
  }

  try {
    if (shouldSyncMetadata) {
      const { syncAdminGameMetadata } = await import("@/lib/server/adminGameMetadata");
      await syncAdminGameMetadata(gameId, metadata);
    }
  } catch (metadataError) {
    const message = metadataError instanceof Error ? metadataError.message : "Failed to save game metadata";
    return Response.json({ error: message }, { status: 500 });
  }

  revalidateHomeGames();

  return Response.json({ game: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const gameId = Number(id);

  try {
    // Attempt to remove dependent rows first to avoid FK constraint issues
    await supabase.from("game_achievements").delete().eq("game_id", gameId);
    await supabase.from("monthly_play_logs").delete().eq("game_id", gameId);

    const { error } = await supabase
      .from("games")
      .delete()
      .eq("id", gameId);

    if (error) {
      console.error("Failed to delete game", { gameId, error });
      return Response.json({ error: error.message }, { status: 500 });
    }

    revalidateHomeGames();

    return Response.json({ success: true });
  } catch (err) {
    console.error("Unexpected error deleting game", { id: gameId, err });
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

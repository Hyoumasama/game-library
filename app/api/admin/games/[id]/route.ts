import { supabase } from "@/lib/supabase";
import {
  buildAchievementPayload,
  buildGamePayload,
} from "@/lib/server/adminGamePayload";
import { getGameById } from "@/lib/games";

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

  try {
    gamePayload = buildGamePayload(body);
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

  return Response.json({ game: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error } = await supabase
    .from("games")
    .delete()
    .eq("id", Number(id));

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}

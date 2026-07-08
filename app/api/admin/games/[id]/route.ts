import { supabase } from "@/lib/supabase";
import {
  buildAchievementPayload,
  buildGamePayload,
} from "@/lib/server/adminGamePayload";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("game_achievements")
    .select(
      "bronze, silver, gold, platinum, earned_awards, total_awards, completion_percentage"
    )
    .eq("game_id", Number(id))
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    achievements: data || {
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
  const gamePayload = buildGamePayload(body);

  if (!gamePayload.title) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("games")
    .update(gamePayload)
    .eq("id", gameId)
    .select()
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

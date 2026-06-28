import { supabase } from "@/lib/supabase";

const selectColumns = `
  id,
  title,
  release,
  date_of_purchase,
  completion_last_played,
  score,
  price,
  hours_played,
  status,
  store,
  platform,
  hardware,
  genre,
  cover_url,
  steam_vertical_cover,
    wide_cover_url,
  game_achievements (
    platinum,
    completion_percentage
  )
`;

function mapGame(game: any) {
  const achievement = Array.isArray(game.game_achievements)
  ? game.game_achievements[0]
  : game.game_achievements;

  let achievement_badge = null;

  if (Number(achievement?.completion_percentage || 0) >= 100) {
    achievement_badge = "100completion";
  } else if (Number(achievement?.platinum || 0) > 0) {
    achievement_badge = "platinum";
  }

  const { game_achievements, ...cleanGame } = game;

  return {
    ...cleanGame,
    Title: game.title,
    Store: game.store,
    Platform: game.platform,
    Hardware: game.hardware,
    Genre: game.genre,
    Score: game.score,
    Status: game.status,
    Price: game.price,
    "Hours Played": game.hours_played,
    Release: game.release,
    "Date of Purchase": game.date_of_purchase,
    "Completion Last Played": game.completion_last_played,
    "Completion / Last Played": game.completion_last_played,
    Cover: game.steam_vertical_cover || game.cover_url,
    achievement_badge,
  };
}

export async function GET() {
  const { data: currentlyPlaying, error: playingError } = await supabase
    .from("games")
    .select(selectColumns)
    .in("status", ["Playing", "Currently Playing"])
    .order("date_of_purchase", { ascending: false });

  if (playingError) {
    return Response.json({ error: playingError.message }, { status: 500 });
  }

  const { data: recentlyAdded, error: addedError } = await supabase
    .from("games")
    .select(selectColumns)
    .not("date_of_purchase", "is", null)
    .order("date_of_purchase", { ascending: false })
    .limit(7);

  if (addedError) {
    return Response.json({ error: addedError.message }, { status: 500 });
  }

  const { data: recentlyCompleted, error: completedError } = await supabase
    .from("games")
    .select(selectColumns)
    .eq("status", "Completed")
    .not("completion_last_played", "is", null)
    .order("completion_last_played", { ascending: false })
    .limit(7);

  if (completedError) {
    return Response.json({ error: completedError.message }, { status: 500 });
  }

  return Response.json({
    currentlyPlaying: (currentlyPlaying || []).map(mapGame),
    recentlyAdded: (recentlyAdded || []).map(mapGame),
    recentlyCompleted: (recentlyCompleted || []).map(mapGame),
  });
}
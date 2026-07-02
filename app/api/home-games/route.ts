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
  wide_cover_url,
  steam_vertical_cover,
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
    "Wide Cover": game.wide_cover_url,
    achievement_badge,
  };
}

export async function GET() {
  const today = new Date();
  const todayText = today.toISOString().slice(0, 10);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const sevenDaysAgoText = sevenDaysAgo.toISOString().slice(0, 10);

  const [wishlistResult, playingResult, addedResult, completedResult] = await Promise.all([
    supabase
      .from("games")
      .select(selectColumns)
      .eq("status", "Wishlist")
      .not("release", "is", null)
      .gte("release", sevenDaysAgoText)
      .order("release", { ascending: true })
      .limit(7),
    supabase
      .from("games")
      .select(selectColumns)
      .in("status", ["Playing", "Currently Playing"])
      .order("date_of_purchase", { ascending: false }),

    supabase
      .from("games")
      .select(selectColumns)
      .not("date_of_purchase", "is", null)
      .order("date_of_purchase", { ascending: false })
      .limit(7),

    supabase
      .from("games")
      .select(selectColumns)
      .eq("status", "Completed")
      .not("completion_last_played", "is", null)
      .order("completion_last_played", { ascending: false })
      .limit(7),
  ]);

    if (wishlistResult.error) {
    return Response.json({ error: wishlistResult.error.message }, { status: 500 });
  }

  if (playingResult.error) {
    return Response.json({ error: playingResult.error.message }, { status: 500 });
  }

  if (addedResult.error) {
    return Response.json({ error: addedResult.error.message }, { status: 500 });
  }

  if (completedResult.error) {
    return Response.json({ error: completedResult.error.message }, { status: 500 });
  }

    return Response.json({
    wishlist: (wishlistResult.data || []).map((game) => {
      const mappedGame = mapGame(game);
      const releaseText = game.release ? String(game.release).slice(0, 10) : null;

      return {
        ...mappedGame,
        home_tag: releaseText && releaseText <= todayText ? "Available Now" : "Upcoming",
      };
    }),
    currentlyPlaying: (playingResult.data || []).map(mapGame),
    recentlyAdded: (addedResult.data || []).map(mapGame),
    recentlyCompleted: (completedResult.data || []).map(mapGame),
  });
}
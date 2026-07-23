import { mapDbGameToUiGame } from "@/lib/gameMappers";
import type { DbGame, UiGame } from "@/lib/gameTypes";
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
  hero_url,
  wide_cover_url,
  steam_vertical_cover,
  summary,
  game_achievements (
    platinum,
    completion_percentage
  )
`;

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export async function getHomeGames() {
  const today = new Date();
  const todayText = toDateKey(today);

  const [wishlistResult, playingResult, addedResult, completedResult] =
    await Promise.all([
      supabase
        .from("games")
        .select(selectColumns)
        .eq("status", "Wishlist")
        .not("release", "is", null)
        .gte("release", todayText)
        .order("release", { ascending: true })
        .order("title", { ascending: true }),
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

  const error =
    wishlistResult.error ||
    playingResult.error ||
    addedResult.error ||
    completedResult.error;

  if (error) throw error;

  return {
    wishlist: ((wishlistResult.data || []) as DbGame[]).map((game) => {
      const mappedGame = mapDbGameToUiGame(game);
      const releaseText = game.release ? String(game.release).slice(0, 10) : null;
      const homeTag: UiGame["home_tag"] =
        releaseText && releaseText < todayText ? "Available Now" : "Upcoming";

      return {
        ...mappedGame,
        home_tag: homeTag,
      };
    }),
    currentlyPlaying: ((playingResult.data || []) as DbGame[]).map(
      mapDbGameToUiGame
    ),
    recentlyAdded: ((addedResult.data || []) as DbGame[]).map(mapDbGameToUiGame),
    recentlyCompleted: ((completedResult.data || []) as DbGame[]).map(
      mapDbGameToUiGame
    ),
  };
}

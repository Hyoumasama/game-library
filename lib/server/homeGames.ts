import { unstable_cache } from "next/cache";
import { mapDbGameToUiGame } from "@/lib/gameMappers";
import type { DbGame, UiGame } from "@/lib/gameTypes";
import { supabase } from "@/lib/supabase";
import { CACHE_TAGS } from "@/lib/server/cacheTags";

// Card/calendar rendering on the home page only ever reads the fields
// below (mapDbGameToUiGame + WishlistReleaseCalendar's use of hero_url).
// summary/screenshots/developer/publisher/date_started/igdb_id/steam_appid
// are detail-page-only fields (lib/games.ts has its own full column list
// for that) - selecting them here just inflated every home page response
// for data nothing on this page reads. EditGameModal, opened from a home
// page card, re-fetches full game data on open (see
// components/games/EditGameModal.tsx: handleOpen), so it's unaffected.
const selectColumns = `
  id,
  title,
  slug,
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
  genres,
  cover_url,
  hero_url,
  wide_cover_url,
  steam_vertical_cover,
  game_achievements (
    platinum,
    completion_percentage
  )
`;

const WISHLIST_CALENDAR_FETCH_LIMIT = 500;

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function fetchHomeGames() {
  const today = new Date();
  const todayText = toDateKey(today);

  const [
    wishlistPastResult,
    wishlistFutureResult,
    wishlistTbaResult,
    playingResult,
    addedResult,
    completedResult,
  ] =
    await Promise.all([
      supabase
        .from("games")
        .select(selectColumns)
        .eq("status", "Wishlist")
        .not("release", "is", null)
        .lt("release", todayText)
        .order("release", { ascending: false })
        .order("title", { ascending: true })
        .limit(WISHLIST_CALENDAR_FETCH_LIMIT),
      supabase
        .from("games")
        .select(selectColumns)
        .eq("status", "Wishlist")
        .not("release", "is", null)
        .gte("release", todayText)
        .order("release", { ascending: true })
        .order("title", { ascending: true })
        .limit(WISHLIST_CALENDAR_FETCH_LIMIT),
      supabase
        .from("games")
        .select(selectColumns)
        .eq("status", "Wishlist")
        .is("release", null)
        .order("title", { ascending: true })
        .limit(WISHLIST_CALENDAR_FETCH_LIMIT),
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
    wishlistPastResult.error ||
    wishlistFutureResult.error ||
    wishlistTbaResult.error ||
    playingResult.error ||
    addedResult.error ||
    completedResult.error;

  if (error) throw error;

  const wishlistGamesById = new Map<number | string, DbGame>();

  for (const game of [
    ...((wishlistPastResult.data || []) as DbGame[]),
    ...((wishlistFutureResult.data || []) as DbGame[]),
    ...((wishlistTbaResult.data || []) as DbGame[]),
  ]) {
    wishlistGamesById.set(game.id || `${game.title}-${game.release}`, game);
  }

  return {
    wishlist: [...wishlistGamesById.values()]
      .sort((first, second) => {
        const releaseCompare = String(first.release || "").localeCompare(
          String(second.release || "")
        );

        if (releaseCompare !== 0) return releaseCompare;

        return String(first.title || "").localeCompare(
          String(second.title || "")
        );
      })
      .map((game) => {
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

// The home page ran these 6 queries fresh on every single visit
// (app/page.tsx is force-dynamic). unstable_cache keeps the result around
// so repeat visits are instant; admin routes that change what the home
// page shows call revalidateTag(CACHE_TAGS.homeGames, { expire: 0 }) (see
// app/api/admin/games/route.ts, app/api/admin/games/[id]/route.ts,
// app/api/admin/backfill-wide-covers/route.ts, and
// app/api/admin/wishlist-release-refresh/route.ts) so an edit is reflected
// on the very next request instead of waiting out the revalidate window.
// The 5-minute revalidate below is just a safety net in case a future
// mutation path forgets to call revalidateTag.
export const getHomeGames = unstable_cache(fetchHomeGames, ["home-games"], {
  tags: [CACHE_TAGS.homeGames],
  revalidate: 300,
});

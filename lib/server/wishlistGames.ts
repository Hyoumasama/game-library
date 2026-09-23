import "server-only";
import { unstable_cache } from "next/cache";
import { mapDbGameToUiGame } from "@/lib/gameMappers";
import type { DbGame } from "@/lib/gameTypes";
import { supabase } from "@/lib/supabase";
import { CACHE_TAGS } from "@/lib/server/cacheTags";
import { fetchAllRows } from "@/lib/server/fetchAllRows";

// Card-only columns for the /wishlist timeline, no detail-page metadata.
// wide_cover_url/hero_url feed WideGameCard's landscape artwork.
const WISHLIST_COLUMNS = `
  id,
  title,
  release,
  score,
  hours_played,
  status,
  store,
  platform,
  hardware,
  cover_url,
  steam_vertical_cover,
  wide_cover_url,
  hero_url,
  game_achievements (
    platinum,
    completion_percentage
  )
`;

async function fetchWishlistGames() {
  // One query for the whole wishlist; grouping into years/months happens
  // in memory (lib/wishlistTimeline.ts), not one request per section.
  const { data, error } = await fetchAllRows((from, to) =>
    supabase
      .from("games")
      .select(WISHLIST_COLUMNS)
      .eq("status", "Wishlist")
      .order("id")
      .range(from, to)
  );

  if (error) throw new Error(error.message);

  return (data as DbGame[]).map(mapDbGameToUiGame);
}

// Wishlist membership and release dates change through exactly the routes
// that already invalidate the home page (which shows the same wishlist in
// its calendar): admin game create/update/delete, backfill-wide-covers and
// wishlist-release-refresh all call revalidateTag(CACHE_TAGS.homeGames).
// Sharing that tag keeps this page in sync without touching those routes.
// The column list is part of the cache key: unstable_cache doesn't key on
// the function body, so without it a column change keeps serving entries
// cached with the old shape (e.g. no wide_cover_url -> portrait fallback).
export const getWishlistGames = unstable_cache(
  fetchWishlistGames,
  ["wishlist-games", WISHLIST_COLUMNS],
  { tags: [CACHE_TAGS.homeGames], revalidate: 300 }
);

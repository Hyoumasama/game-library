import { revalidateTag } from "next/cache";

// Central place for the cache tags used by unstable_cache()-wrapped data
// fetchers, so a mutating route and the fetcher it needs to invalidate
// agree on the exact tag string.
export const CACHE_TAGS = {
  homeGames: "home-games",
  // Franchise/developer/publisher browsing pages (lib/server/browsingEntities.ts).
  // Franchise membership and the developer/publisher text fields only change
  // through the admin game create/update/delete routes, so those routes
  // revalidate this tag the same way they already revalidate homeGames.
  browsingEntities: "browsing-entities",
  // Home page Steam news ticker (lib/server/steamNews.ts), revalidated by
  // app/api/cron/steam-news/route.ts after each sync.
  steamNews: "steam-news",
  // Watch library pages (lib/server/watch/library.ts), revalidated by every
  // /api/admin/watch/works* write.
  watchLibrary: "watch-library",
  // Stats page per-year data (app/stats/page.tsx), revalidated by the admin
  // game routes and the monthly log routes.
  stats: "stats",
  // /assets list, revalidated by the admin asset routes.
  assets: "assets",
} as const;

// For batch admin jobs that rewrite games rows (backfills, HLTB refresh,
// IGDB sync): drops every cache built from the games table - home, game
// pages, browsing pages and stats. { expire: 0 } makes the next request
// wait for fresh data rather than serving stale-while-revalidate.
export function revalidateGameCaches() {
  revalidateTag(CACHE_TAGS.homeGames, { expire: 0 });
  revalidateTag(CACHE_TAGS.browsingEntities, { expire: 0 });
  revalidateTag(CACHE_TAGS.stats, { expire: 0 });
}

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
} as const;

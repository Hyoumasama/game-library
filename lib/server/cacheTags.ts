// Central place for the cache tags used by unstable_cache()-wrapped data
// fetchers, so a mutating route and the fetcher it needs to invalidate
// agree on the exact tag string.
export const CACHE_TAGS = {
  homeGames: "home-games",
} as const;

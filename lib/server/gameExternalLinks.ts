import "server-only";

export function getIgdbGameUrl(igdbSlug?: string | null) {
  const slug = igdbSlug?.trim();
  return slug ? `https://www.igdb.com/games/${encodeURIComponent(slug)}` : null;
}

export function getHltbGameUrl(hltbId?: number | string | null) {
  const id = Number(hltbId);
  return Number.isSafeInteger(id) && id > 0
    ? `https://howlongtobeat.com/game/${id}`
    : null;
}

export function getSteamStoreUrl(steamAppId?: number | string | null) {
  const id = Number(steamAppId);
  return Number.isSafeInteger(id) && id > 0
    ? `https://store.steampowered.com/app/${id}/`
    : null;
}

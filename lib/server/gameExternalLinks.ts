import "server-only";

import { getIgdbToken } from "@/lib/igdb";

type IgdbLinkRecord = {
  slug?: string;
  url?: string;
};

function getCanonicalIgdbUrl(record: IgdbLinkRecord) {
  if (record.url) {
    try {
      const url = new URL(record.url);
      if (
        (url.hostname === "igdb.com" || url.hostname === "www.igdb.com") &&
        url.pathname.startsWith("/games/")
      ) {
        url.protocol = "https:";
        url.hostname = "www.igdb.com";
        return url.toString();
      }
    } catch {
      // Fall through to the API-provided slug.
    }
  }

  const slug = record.slug?.trim();
  return slug ? `https://www.igdb.com/games/${encodeURIComponent(slug)}` : null;
}

export async function getIgdbGameUrl(igdbId?: number | string | null) {
  const id = Number(igdbId);
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  const clientId = process.env.IGDB_CLIENT_ID;
  if (!clientId || !process.env.IGDB_CLIENT_SECRET) return null;

  try {
    const token = await getIgdbToken();
    const response = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: `fields slug,url; where id = ${id}; limit 1;`,
      cache: "no-store",
    });

    if (!response.ok) return null;

    const records = (await response.json()) as IgdbLinkRecord[];
    return records[0] ? getCanonicalIgdbUrl(records[0]) : null;
  } catch {
    return null;
  }
}

export function getSteamStoreUrl(steamAppId?: number | string | null) {
  const id = Number(steamAppId);
  return Number.isSafeInteger(id) && id > 0
    ? `https://store.steampowered.com/app/${id}/`
    : null;
}

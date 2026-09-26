import "server-only";
import { unstable_cache } from "next/cache";
import { hasAdultGenre } from "@/lib/adultContent";
import { supabase } from "@/lib/supabase";
import { CACHE_TAGS } from "@/lib/server/cacheTags";
import { fetchAllRows } from "@/lib/server/fetchAllRows";

// News older than this is dropped from the ticker and deleted from the table.
export const STEAM_NEWS_RETENTION_DAYS = 7;

// Announcements per app requested from Steam. A week of official posts is
// almost always well under this, even for games that patch daily.
const NEWS_PER_APP = 10;
const FETCH_CONCURRENCY = 8;
// The events endpoint lives on store.steampowered.com, which rate-limits far
// harder than the Web API, so it is only called for apps that actually have
// news this week, and gently.
const EVENTS_CONCURRENCY = 3;
const EVENTS_PER_APP = 20;
// clan_steamid (a 64-bit SteamID) minus this base is the clan account id used
// in Steam's clan image URLs.
const CLAN_STEAMID_BASE = BigInt("103582791429521408");
const TICKER_LIMIT = 5;
// Busy live-service games post several times a week; cap each game so one
// title can't take over the ticker.
const TICKER_ITEMS_PER_GAME = 2;
// Many developers never tag patch notes ("Apex Legends: Latest Update - ..."),
// so fall back to the title.
const UPDATE_TITLE_PATTERN = /\b(patch|update|hotfix|changelog)/i;

export type SteamNewsKind = "update" | "news";

export type SteamNewsTickerItem = {
  gid: string;
  gameId: number;
  gameTitle: string;
  coverUrl: string | null;
  // The announcement's capsule art (what Steam's library "What's New" shows),
  // falling back to the game's wide art.
  imageUrl: string | null;
  gameStatus: string | null;
  isAdult: boolean;
  title: string;
  url: string;
  kind: SteamNewsKind;
  publishedAt: string;
};

export type SteamNewsItem = {
  gid: string;
  title: string;
  // Steam's own link for the post; redirects to it on the store news hub.
  url?: string;
  date: number;
  feedname: string;
  tags?: string[];
};

type SteamEvent = {
  gid?: string;
  event_name?: string;
  clan_steamid?: string;
  jsondata?: string;
};

type SteamNewsRow = {
  gid: string;
  appid: number;
  game_id: number;
  title: string;
  url: string;
  image_url: string | null;
  kind: SteamNewsKind;
  published_at: string;
};

function getRetentionCutoff() {
  return new Date(Date.now() - STEAM_NEWS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

export function normalizeTitle(title: string) {
  return title.trim().toLowerCase();
}

class SteamRateLimitError extends Error {}

export function getSteamNewsKind(item: {
  title?: string;
  tags?: string[];
}): SteamNewsKind {
  return item.tags?.includes("patchnotes") ||
    UPDATE_TITLE_PATTERN.test(item.title || "")
    ? "update"
    : "news";
}

async function fetchAppAnnouncements(appid: number) {
  const params = new URLSearchParams({
    appid: String(appid),
    count: String(NEWS_PER_APP),
    maxlength: "1",
    feeds: "steam_community_announcements",
    format: "json",
  });
  const response = await fetch(
    `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?${params}`,
    { cache: "no-store" }
  );

  if (response.status === 429) throw new SteamRateLimitError("Steam rate limit");
  // Apps without a news hub (delisted, some DLC ids) answer 403/404.
  if (!response.ok) throw new Error(`Steam news ${appid}: HTTP ${response.status}`);

  const data = (await response.json()) as {
    appnews?: { newsitems?: SteamNewsItem[] };
  };

  return data.appnews?.newsitems || [];
}

// GetNewsForApp carries no artwork and its gid differs from the store event's
// announcement gid, so the art and the canonical news URL come from the app's
// store events, matched by title.
export async function fetchAppEventArt(appid: number) {
  const params = new URLSearchParams({
    appid: String(appid),
    count_before: "0",
    count_after: String(EVENTS_PER_APP),
    lang_list: "0",
  });
  const response = await fetch(
    `https://store.steampowered.com/events/ajaxgetadjacentpartnerevents/?${params}`,
    { cache: "no-store" }
  );

  if (response.status === 429) throw new SteamRateLimitError("Steam rate limit");
  if (!response.ok) throw new Error(`Steam events ${appid}: HTTP ${response.status}`);

  const data = (await response.json()) as { events?: SteamEvent[] };
  const artByTitle = new Map<string, { imageUrl: string | null; url: string | null }>();

  for (const event of data.events || []) {
    if (!event.event_name) continue;

    let capsule: string | null = null;
    try {
      const json = JSON.parse(event.jsondata || "{}") as {
        localized_capsule_image?: (string | null)[];
      };
      capsule = json.localized_capsule_image?.[0] || null;
    } catch {
      capsule = null;
    }

    const clanAccountId = event.clan_steamid
      ? BigInt(event.clan_steamid) - CLAN_STEAMID_BASE
      : null;

    artByTitle.set(normalizeTitle(event.event_name), {
      imageUrl:
        capsule && clanAccountId !== null
          ? `https://clan.akamai.steamstatic.com/images/${clanAccountId}/${capsule}`
          : null,
      // The store view page is keyed by the event gid; the announcement gid
      // (announcement_body.gid) only loads the hub's endless spinner.
      url: event.gid
        ? `https://store.steampowered.com/news/app/${appid}/view/${event.gid}`
        : null,
    });
  }

  return artByTitle;
}

async function runWorkers<T>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<void>
) {
  let nextIndex = 0;
  let failed = 0;
  let rateLimited = false;

  async function worker() {
    while (!rateLimited && nextIndex < items.length) {
      const item = items[nextIndex++];

      try {
        await task(item);
      } catch (error) {
        failed++;
        // Stop hammering Steam once it starts refusing; the next run
        // picks up where this one left off.
        if (error instanceof SteamRateLimitError) rateLimited = true;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  return { processed: nextIndex, failed, rateLimited };
}

export async function syncSteamNews() {
  const { data: games, error } = await fetchAllRows<{
    id: number;
    steam_appid: number;
  }>((from, to) =>
    supabase
      .from("games")
      .select("id, steam_appid")
      .not("steam_appid", "is", null)
      .order("id", { ascending: true })
      .range(from, to)
  );

  if (error) throw new Error(error.message);

  // The same Steam app can back more than one library row; attach its news
  // to the oldest one.
  const gameIdByAppid = new Map<number, number>();
  for (const game of games || []) {
    const appid = Number(game.steam_appid);
    if (Number.isFinite(appid) && appid > 0 && !gameIdByAppid.has(appid)) {
      gameIdByAppid.set(appid, Number(game.id));
    }
  }

  const appids = [...gameIdByAppid.keys()];
  const cutoffSeconds = Math.floor(getRetentionCutoff().getTime() / 1000);
  const rowsByAppid = new Map<number, SteamNewsRow[]>();

  const newsRun = await runWorkers(appids, FETCH_CONCURRENCY, async (appid) => {
    for (const item of await fetchAppAnnouncements(appid)) {
      if (item.date < cutoffSeconds) continue;

      const appRows = rowsByAppid.get(appid) || [];
      appRows.push({
        gid: String(item.gid),
        appid,
        game_id: gameIdByAppid.get(appid)!,
        title: item.title?.trim() || "Announcement",
        url:
          item.url ||
          `https://store.steampowered.com/news/app/${appid}/view/${item.gid}`,
        image_url: null,
        kind: getSteamNewsKind(item),
        published_at: new Date(item.date * 1000).toISOString(),
      });
      rowsByAppid.set(appid, appRows);
    }
  });

  // Art is best-effort: a failed or rate-limited events call just leaves the
  // row on the game's own wide art.
  const artRun = await runWorkers(
    [...rowsByAppid.keys()],
    EVENTS_CONCURRENCY,
    async (appid) => {
      const artByTitle = await fetchAppEventArt(appid);

      for (const row of rowsByAppid.get(appid) || []) {
        const art = artByTitle.get(normalizeTitle(row.title));
        if (!art) continue;
        row.image_url = art.imageUrl;
        if (art.url) row.url = art.url;
      }
    }
  );

  const rows = [...rowsByAppid.values()].flat();

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from("steam_news")
      .upsert(rows, { onConflict: "gid" });

    if (upsertError) throw new Error(upsertError.message);
  }

  const { count: deleted, error: deleteError } = await supabase
    .from("steam_news")
    .delete({ count: "exact" })
    .lt("published_at", getRetentionCutoff().toISOString());

  if (deleteError) throw new Error(deleteError.message);

  return {
    apps: appids.length,
    checked: newsRun.processed,
    failed: newsRun.failed,
    rateLimited: newsRun.rateLimited,
    upserted: rows.length,
    withArt: rows.filter((row) => row.image_url).length,
    artFailed: artRun.failed,
    deleted: deleted || 0,
  };
}

const NEWS_SELECT =
  "gid, game_id, title, url, image_url, kind, published_at, games ( title, cover_url, steam_vertical_cover, wide_cover_url, hero_url, status, genres )";

type NewsRowWithGame = {
  gid: string;
  game_id: number;
  title: string;
  url: string;
  image_url: string | null;
  kind: string;
  published_at: string;
  games: unknown;
};

function mapNewsRow(row: NewsRowWithGame): SteamNewsTickerItem {
  const game = (Array.isArray(row.games) ? row.games[0] : row.games) as {
    title: string | null;
    cover_url: string | null;
    steam_vertical_cover: string | null;
    wide_cover_url: string | null;
    hero_url: string | null;
    status: string | null;
    genres: string[] | null;
  } | null;

  return {
    gid: row.gid,
    gameId: Number(row.game_id),
    gameTitle: game?.title || "Unknown game",
    coverUrl: game?.steam_vertical_cover || game?.cover_url || null,
    imageUrl: row.image_url || game?.wide_cover_url || game?.hero_url || null,
    // Older rows still say "Currently Playing" (see lib/server/homeGames.ts).
    gameStatus:
      game?.status === "Currently Playing" ? "Playing" : game?.status || null,
    isAdult: hasAdultGenre(game?.genres),
    title: row.title,
    url: row.url,
    kind: row.kind as SteamNewsKind,
    publishedAt: row.published_at,
  };
}

// Every announcement inside the retention window, newest first. A week is a
// few hundred rows, but page through anyway so a busy week can't be cut off
// at Supabase's 1000-row cap.
async function fetchRecentNews() {
  const cutoff = getRetentionCutoff().toISOString();
  const { data, error } = await fetchAllRows<NewsRowWithGame>((from, to) =>
    supabase
      .from("steam_news")
      .select(NEWS_SELECT)
      .gte("published_at", cutoff)
      .order("published_at", { ascending: false })
      .order("gid", { ascending: true })
      .range(from, to)
  );

  if (error) throw new Error(error.message);

  return (data || []).map(mapNewsRow);
}

async function fetchSteamNewsTicker(): Promise<SteamNewsTickerItem[]> {
  const itemsPerGame = new Map<number, number>();
  const items = (await fetchRecentNews()).filter((item) => {
    const shown = itemsPerGame.get(item.gameId) || 0;
    itemsPerGame.set(item.gameId, shown + 1);
    return shown < TICKER_ITEMS_PER_GAME;
  });

  return items.slice(0, TICKER_LIMIT);
}

// Part of both cache keys: unstable_cache keeps serving an entry whose shape
// is out of date (e.g. after a field is added to SteamNewsTickerItem) until
// it expires or the next sync, so bump this whenever the item shape changes.
const NEWS_CACHE_VERSION = "v3";

// Both are refreshed by the sync route via revalidateTag; the revalidate
// window is a safety net so items still age out of the 7-day window
// between syncs.
export const getSteamNewsTicker = unstable_cache(
  fetchSteamNewsTicker,
  ["steam-news-ticker", NEWS_CACHE_VERSION],
  { tags: [CACHE_TAGS.steamNews], revalidate: 600 }
);

// Full, uncapped feed for the /news page.
export const getSteamNewsFeed = unstable_cache(
  fetchRecentNews,
  ["steam-news-feed", NEWS_CACHE_VERSION],
  { tags: [CACHE_TAGS.steamNews], revalidate: 600 }
);

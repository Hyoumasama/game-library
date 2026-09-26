import "server-only";
import { unstable_cache } from "next/cache";
import {
  fetchAppEventArt,
  getSteamNewsKind,
  normalizeTitle,
  type SteamNewsItem,
  type SteamNewsKind,
} from "@/lib/server/steamNews";

// Game detail page: the newest few announcements get art cards, the rest are a
// text list paged with "Load more". Unlike the steam_news table (last 7 days
// only), this reads a game's full announcement history live from Steam.
export const GAME_NEWS_FEATURED_COUNT = 4;
export const GAME_NEWS_PAGE_SIZE = 20;
const GAME_NEWS_CACHE_SECONDS = 60 * 60;

export type GameNewsItem = {
  gid: string;
  title: string;
  url: string;
  kind: SteamNewsKind;
  publishedAt: string;
  imageUrl: string | null;
};

export type GameNewsPage = {
  items: GameNewsItem[];
  // Pass back as `before` to get the next page; null once history runs out.
  nextBefore: number | null;
};

async function fetchNewsPage(
  appid: number,
  count: number,
  before?: number
): Promise<GameNewsPage> {
  const params = new URLSearchParams({
    appid: String(appid),
    count: String(count),
    maxlength: "1",
    feeds: "steam_community_announcements",
    format: "json",
  });
  if (before) params.set("enddate", String(before));

  const response = await fetch(
    `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?${params}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error(`Steam news ${appid}: HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    appnews?: { newsitems?: SteamNewsItem[] };
  };
  const newsItems = data.appnews?.newsitems || [];
  const last = newsItems[newsItems.length - 1];

  return {
    items: newsItems.map((item) => ({
      gid: String(item.gid),
      title: item.title?.trim() || "Announcement",
      url:
        item.url ||
        `https://store.steampowered.com/news/app/${appid}/view/${item.gid}`,
      kind: getSteamNewsKind(item),
      publishedAt: new Date(item.date * 1000).toISOString(),
      imageUrl: null,
    })),
    // enddate is inclusive, so step one second past the oldest item.
    nextBefore: newsItems.length === count && last ? last.date - 1 : null,
  };
}

async function fetchGameNews(appid: number) {
  const page = await fetchNewsPage(
    appid,
    GAME_NEWS_FEATURED_COUNT + GAME_NEWS_PAGE_SIZE
  );

  // Art (and the canonical store link) is best-effort: without it the cards
  // fall back to the game's own art.
  const artByTitle = await fetchAppEventArt(appid).catch((error) => {
    console.error("GAME NEWS ART ERROR:", error);
    return new Map<string, { imageUrl: string | null; url: string | null }>();
  });

  const items = page.items.map((item, index) => {
    const art = artByTitle.get(normalizeTitle(item.title));
    return {
      ...item,
      url: art?.url || item.url,
      imageUrl: index < GAME_NEWS_FEATURED_COUNT ? art?.imageUrl || null : null,
    };
  });

  return {
    featured: items.slice(0, GAME_NEWS_FEATURED_COUNT),
    list: items.slice(GAME_NEWS_FEATURED_COUNT),
    nextBefore: page.nextBefore,
  };
}

// unstable_cache keys on the arguments too, so each game (and each "Load
// more" page) is cached separately.
export const getGameNews = unstable_cache(fetchGameNews, ["game-steam-news", "v1"], {
  revalidate: GAME_NEWS_CACHE_SECONDS,
});

export const getGameNewsPage = unstable_cache(
  (appid: number, before: number) =>
    fetchNewsPage(appid, GAME_NEWS_PAGE_SIZE, before),
  ["game-steam-news-page", "v1"],
  { revalidate: GAME_NEWS_CACHE_SECONDS }
);

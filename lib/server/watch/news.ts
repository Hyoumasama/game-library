import "server-only";

import { unstable_cache } from "next/cache";

// General anime / TV / film news from public RSS feeds, independent of what is
// in the watch library. Nothing is stored: feeds are fetched on demand and the
// merged result is cached for half an hour.

export type WatchNewsCategory = "anime" | "tv" | "movie";

export type WatchNewsItem = {
  id: string;
  title: string;
  url: string;
  summary: string | null;
  imageUrl: string | null;
  publishedAt: string;
  source: string;
  category: WatchNewsCategory;
};

const FEEDS: { url: string; source: string; category: WatchNewsCategory }[] = [
  { url: "https://myanimelist.net/rss/news.xml", source: "MyAnimeList", category: "anime" },
  { url: "https://variety.com/v/tv/feed/", source: "Variety", category: "tv" },
  { url: "https://variety.com/v/film/feed/", source: "Variety", category: "movie" },
];

const NEWS_REVALIDATE_SECONDS = 30 * 60;
const SUMMARY_MAX_LENGTH = 220;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1] === "x" || entity[1] === "X"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);

      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }

    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function unwrapCdata(value: string) {
  return value.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1");
}

function tagText(item: string, tag: string) {
  const match = item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));

  return match ? unwrapCdata(match[1]).trim() : null;
}

function tagUrlAttribute(item: string, tag: string) {
  return item.match(new RegExp(`<${tag}\\s[^>]*url="([^"]+)"`, "i"))?.[1] ?? null;
}

function plainText(value: string) {
  // Feeds double-encode some entities (e.g. &amp;#039;), so decode twice.
  return decodeEntities(decodeEntities(value.replace(/<[^>]+>/g, " ")))
    .replace(/\s+/g, " ")
    .trim();
}

function shorten(value: string) {
  if (value.length <= SUMMARY_MAX_LENGTH) return value;

  return `${value.slice(0, SUMMARY_MAX_LENGTH).replace(/\s+\S*$/, "")}...`;
}

function stripTrackingParams(url: string) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("_location");

    return parsed.toString();
  } catch {
    return url;
  }
}

function parseFeed(xml: string, feed: (typeof FEEDS)[number]): WatchNewsItem[] {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];

  return items.flatMap((item) => {
    const title = tagText(item, "title");
    const link = tagText(item, "link");
    const published = new Date(tagText(item, "pubDate") || "");

    if (!title || !link || Number.isNaN(published.getTime())) return [];

    const url = stripTrackingParams(decodeEntities(link));
    const description = tagText(item, "description");
    // MyAnimeList puts the image URL in the element body, Variety in a url
    // attribute.
    const imageUrl =
      tagUrlAttribute(item, "media:thumbnail") ||
      tagUrlAttribute(item, "media:content") ||
      tagText(item, "media:thumbnail");

    return [
      {
        id: url,
        title: plainText(title),
        url,
        summary: description ? shorten(plainText(description)) || null : null,
        imageUrl: imageUrl ? decodeEntities(imageUrl) : null,
        publishedAt: published.toISOString(),
        source: feed.source,
        category: feed.category,
      },
    ];
  });
}

async function fetchFeed(feed: (typeof FEEDS)[number]) {
  try {
    const response = await fetch(feed.url, {
      headers: { "User-Agent": "Mozilla/5.0 (game-library watch news)" },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`status ${response.status}`);
    }

    return parseFeed(await response.text(), feed);
  } catch (error) {
    // One feed being down should not empty the whole page.
    console.error(`WATCH NEWS FEED ERROR (${feed.url}):`, error);
    return [];
  }
}

async function fetchWatchNews() {
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const seen = new Set<string>();

  return results
    .flat()
    .filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)))
    .sort((first, second) => second.publishedAt.localeCompare(first.publishedAt));
}

export const getWatchNews = unstable_cache(fetchWatchNews, ["watch-news"], {
  revalidate: NEWS_REVALIDATE_SECONDS,
});

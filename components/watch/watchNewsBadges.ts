import type { WatchNewsCategory } from "@/lib/server/watch/news";

export const WATCH_NEWS_CATEGORIES: {
  value: WatchNewsCategory;
  label: string;
  className: string;
}[] = [
  { value: "anime", label: "Anime", className: "bg-pink-400 text-black" },
  { value: "tv", label: "TV", className: "bg-cyan-300 text-black" },
  { value: "movie", label: "Movies", className: "bg-amber-300 text-black" },
];

// News is split into two groups: anime, and live action (TV and movies).
export type WatchNewsGroup = "anime" | "live-action";

export const WATCH_NEWS_GROUPS: { value: WatchNewsGroup; label: string }[] = [
  { value: "anime", label: "Anime" },
  { value: "live-action", label: "Live Action" },
];

export function watchNewsGroup(category: WatchNewsCategory): WatchNewsGroup {
  return category === "anime" ? "anime" : "live-action";
}

// Reads the /watch/news?group=live-action URL param; anime by default.
export function parseWatchNewsGroup(raw: string | string[] | undefined): WatchNewsGroup {
  return (Array.isArray(raw) ? raw[0] : raw) === "live-action" ? "live-action" : "anime";
}

// Reads the /watch/news?type=tv,movie URL param.
export function parseWatchNewsCategories(
  raw: string | string[] | undefined
): WatchNewsCategory[] {
  const allowed = new Set(WATCH_NEWS_CATEGORIES.map((entry) => entry.value));
  const values = (Array.isArray(raw) ? raw.join(",") : raw || "").split(",");

  return [
    ...new Set(
      values.filter((value): value is WatchNewsCategory =>
        allowed.has(value as WatchNewsCategory)
      )
    ),
  ];
}

export function watchNewsBadge(category: WatchNewsCategory) {
  return (
    WATCH_NEWS_CATEGORIES.find((entry) => entry.value === category) ||
    WATCH_NEWS_CATEGORIES[0]
  );
}

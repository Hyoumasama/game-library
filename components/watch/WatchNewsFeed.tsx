"use client";

import SafeImage from "@/components/SafeImage";
import {
  WATCH_NEWS_CATEGORIES,
  WATCH_NEWS_GROUPS,
  watchNewsBadge,
  watchNewsGroup,
  type WatchNewsGroup,
} from "@/components/watch/watchNewsBadges";
import type { WatchNewsCategory, WatchNewsItem } from "@/lib/server/watch/news";
import { useMemo, useState } from "react";

// Day grouping runs on the server and in the browser; a fixed zone (the
// library owner's) plus the server's "now" keeps both renders identical.
const TIME_ZONE = "Asia/Riyadh";
const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dayLabelFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "long",
  month: "short",
  day: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

function getDayLabel(date: Date, now: Date) {
  const key = dayKeyFormat.format(date);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  if (key === dayKeyFormat.format(now)) return "Today";
  if (key === dayKeyFormat.format(yesterday)) return "Yesterday";
  return dayLabelFormat.format(date);
}

const liveActionCategories = WATCH_NEWS_CATEGORIES.filter(
  (option) => watchNewsGroup(option.value) === "live-action"
);

// Anime and live-action news are shown separately, switched by the tabs at
// the top. Live action can be narrowed further to TV or movies.
export default function WatchNewsFeed({
  items,
  initialGroup,
  initialCategories,
  nowIso,
}: {
  items: WatchNewsItem[];
  initialGroup: WatchNewsGroup;
  initialCategories: WatchNewsCategory[];
  nowIso: string;
}) {
  const [group, setGroup] = useState(initialGroup);
  const [categories, setCategories] = useState(initialCategories);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const groupItems = useMemo(
    () => items.filter((item) => watchNewsGroup(item.category) === group),
    [items, group]
  );

  // Chip counts follow the search box.
  const searchedItems = useMemo(
    () =>
      groupItems.filter(
        (item) =>
          !normalizedQuery ||
          item.title.toLowerCase().includes(normalizedQuery) ||
          item.summary?.toLowerCase().includes(normalizedQuery)
      ),
    [groupItems, normalizedQuery]
  );

  const visibleItems = useMemo(
    () =>
      searchedItems.filter(
        (item) => categories.length === 0 || categories.includes(item.category)
      ),
    [searchedItems, categories]
  );

  const days = useMemo(() => {
    const now = new Date(nowIso);
    const byDay = new Map<string, { label: string; items: WatchNewsItem[] }>();

    for (const item of visibleItems) {
      const published = new Date(item.publishedAt);
      const key = dayKeyFormat.format(published);
      const day = byDay.get(key) || { label: getDayLabel(published, now), items: [] };
      day.items.push(item);
      byDay.set(key, day);
    }

    // Items arrive newest first, so insertion order is already day order.
    return [...byDay.entries()];
  }, [visibleItems, nowIso]);

  // Keep the selection in the URL so a refresh or shared link keeps it,
  // without a server round trip.
  function syncUrl(nextGroup: WatchNewsGroup, nextCategories: WatchNewsCategory[]) {
    const url = new URL(window.location.href);
    if (nextGroup === "anime") url.searchParams.delete("group");
    else url.searchParams.set("group", nextGroup);
    if (nextCategories.length === 0) url.searchParams.delete("type");
    else url.searchParams.set("type", nextCategories.join(","));
    window.history.replaceState(null, "", url);
  }

  function changeGroup(nextGroup: WatchNewsGroup) {
    setGroup(nextGroup);
    setCategories([]);
    syncUrl(nextGroup, []);
  }

  function toggleCategory(category: WatchNewsCategory) {
    const next = categories.includes(category)
      ? categories.filter((entry) => entry !== category)
      : [...categories, category];

    setCategories(next);
    syncUrl(group, next);
  }

  function clearFilters() {
    setQuery("");
    setCategories([]);
    syncUrl(group, []);
  }

  return (
    <>
      <div
        role="tablist"
        aria-label="News section"
        className="mb-4 inline-flex rounded-xl border border-zinc-700 bg-zinc-950 p-1"
      >
        {WATCH_NEWS_GROUPS.map((option) => {
          const isActive = group === option.value;
          const count = items.filter((item) => watchNewsGroup(item.category) === option.value).length;

          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => changeGroup(option.value)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-black ${
                isActive ? "bg-white text-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              {option.label}
              <span
                className={`rounded px-1.5 text-xs ${
                  isActive ? "bg-black/10" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 md:p-4">
        <div className="flex flex-col gap-3">
          {group === "live-action" && (
            <div
              role="group"
              aria-label="Type filter"
              className="flex items-center gap-2 overflow-x-auto border-b border-zinc-800 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <span className="w-16 shrink-0 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
                Type
              </span>

              {liveActionCategories.map((option) => {
                const isActive = categories.includes(option.value);
                const count = searchedItems.filter(
                  (item) => item.category === option.value
                ).length;

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => toggleCategory(option.value)}
                    disabled={count === 0 && !isActive}
                    className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-black transition disabled:cursor-default disabled:opacity-35 ${
                      isActive
                        ? "border-cyan-300 bg-cyan-300 text-black"
                        : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600 hover:text-white disabled:hover:border-zinc-800 disabled:hover:text-zinc-300"
                    }`}
                  >
                    {isActive && <span aria-hidden>✓</span>}
                    {option.label}
                    <span
                      className={`rounded px-1.5 text-xs ${
                        isActive ? "bg-black/15" : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by title"
              aria-label="Filter news by title"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-300/60 focus:outline-none sm:max-w-xs"
            />

            <span className="text-sm font-medium text-zinc-500 sm:ml-auto">
              Showing {visibleItems.length} of {groupItems.length}
            </span>

            {(categories.length > 0 || query) && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-black text-cyan-300 hover:text-white"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {days.length === 0 && (
        <p className="py-16 text-center text-sm font-medium text-zinc-500">
          {groupItems.length === 0
            ? "News is unavailable right now."
            : "Nothing matches this filter."}
        </p>
      )}

      {days.map(([key, day]) => (
        <section key={key} className="mb-12">
          <div className="mb-5 flex items-baseline gap-3 border-b border-zinc-800 pb-3">
            <h2 className="text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
              {day.label}
            </h2>
            <span className="ml-auto shrink-0 text-sm font-medium text-zinc-500">
              {day.items.length} {day.items.length === 1 ? "story" : "stories"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {day.items.map((item) => {
              const badge = watchNewsBadge(item.category);

              return (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-900 shadow-lg ring-1 ring-white/5 transition group-hover:ring-cyan-300/60">
                    {item.imageUrl ? (
                      <SafeImage
                        src={item.imageUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1280px) 300px, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm font-black text-zinc-600">
                        {item.source}
                      </div>
                    )}
                    <span
                      className={`absolute left-2 top-2 rounded px-2 py-1 text-[10px] font-black uppercase ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="truncate text-xs font-bold text-zinc-400">
                      {item.source}
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-zinc-500">
                      {timeFormat.format(new Date(item.publishedAt))}
                    </span>
                  </div>

                  <h3 className="mt-1.5 line-clamp-2 font-bold leading-snug text-white group-hover:text-cyan-300">
                    {item.title}
                  </h3>

                  {item.summary && (
                    <p className="mt-1.5 line-clamp-3 text-sm leading-snug text-zinc-400">
                      {item.summary}
                    </p>
                  )}
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}

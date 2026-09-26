"use client";

import SafeImage from "@/components/SafeImage";
import { useMemo, useState } from "react";
import type { SteamNewsTickerItem } from "@/lib/server/steamNews";
import {
  countNewsFilterOption,
  EMPTY_NEWS_FILTERS,
  matchesNewsFilters,
  NEWS_FILTER_GROUPS,
  type NewsFilterGroup,
  type NewsFilters,
} from "@/lib/newsFilters";

const KIND_BADGES = {
  update: { label: "Update", className: "bg-emerald-400 text-black" },
  news: { label: "News", className: "bg-cyan-300 text-black" },
} as const;

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

function matchesQuery(item: SteamNewsTickerItem, normalizedQuery: string) {
  return (
    !normalizedQuery ||
    item.gameTitle.toLowerCase().includes(normalizedQuery) ||
    item.title.toLowerCase().includes(normalizedQuery)
  );
}

export default function SteamNewsFeed({
  items,
  initialFilters,
  nowIso,
}: {
  items: SteamNewsTickerItem[];
  initialFilters: NewsFilters;
  nowIso: string;
}) {
  const [filters, setFilters] = useState<NewsFilters>(initialFilters);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const activeCount =
    filters.type.length + filters.status.length + filters.content.length;

  // Chip counts follow the search box and the other groups' selections.
  const searchedItems = useMemo(
    () => items.filter((item) => matchesQuery(item, normalizedQuery)),
    [items, normalizedQuery]
  );

  const visibleCount = useMemo(
    () => searchedItems.filter((item) => matchesNewsFilters(item, filters)).length,
    [searchedItems, filters]
  );

  const groups = useMemo(() => {
    const now = new Date(nowIso);
    const byDay = new Map<string, { label: string; items: SteamNewsTickerItem[] }>();

    for (const item of searchedItems) {
      if (!matchesNewsFilters(item, filters)) continue;

      const published = new Date(item.publishedAt);
      const key = dayKeyFormat.format(published);
      const group = byDay.get(key) || { label: getDayLabel(published, now), items: [] };
      group.items.push(item);
      byDay.set(key, group);
    }

    // Items arrive newest first, so insertion order is already day order.
    return [...byDay.entries()];
  }, [searchedItems, filters, nowIso]);

  function applyFilters(next: NewsFilters) {
    setFilters(next);
    // Keep the selection in the URL so a refresh or shared link keeps it,
    // without a server round trip.
    const url = new URL(window.location.href);
    for (const { key } of NEWS_FILTER_GROUPS) {
      if (next[key].length === 0) url.searchParams.delete(key);
      else url.searchParams.set(key, next[key].join(","));
    }
    window.history.replaceState(null, "", url);
  }

  function toggleOption(group: NewsFilterGroup, value: string) {
    const selected = filters[group];
    applyFilters({
      ...filters,
      [group]: selected.includes(value)
        ? selected.filter((entry) => entry !== value)
        : [...selected, value],
    });
  }

  return (
    <>
      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 md:p-4">
        <div className="flex flex-col gap-3">
          {NEWS_FILTER_GROUPS.map((group) => (
            <div
              key={group.key}
              role="group"
              aria-label={`${group.label} filter`}
              className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <span className="w-16 shrink-0 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
                {group.label}
              </span>

              {group.options.map((option) => {
                const isActive = filters[group.key].includes(option.value);
                const count = countNewsFilterOption(
                  searchedItems,
                  filters,
                  group.key,
                  option.value
                );

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => toggleOption(group.key, option.value)}
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
          ))}

          <div className="flex flex-col gap-3 border-t border-zinc-800 pt-3 sm:flex-row sm:items-center">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by game or title"
              aria-label="Filter news by game or title"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-300/60 focus:outline-none sm:max-w-xs"
            />

            <span className="text-sm font-medium text-zinc-500 sm:ml-auto">
              Showing {visibleCount} of {items.length}
            </span>

            {(activeCount > 0 || query) && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  applyFilters(EMPTY_NEWS_FILTERS);
                }}
                className="text-sm font-black text-cyan-300 hover:text-white"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {groups.length === 0 && (
        <p className="py-16 text-center text-sm font-medium text-zinc-500">
          {items.length === 0
            ? "No Steam news in the last week."
            : "Nothing matches this filter."}
        </p>
      )}

      {groups.map(([key, group]) => (
        <section key={key} className="mb-12">
          <div className="mb-5 flex items-baseline gap-3 border-b border-zinc-800 pb-3">
            <h2 className="text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
              {group.label}
            </h2>
            <span className="ml-auto shrink-0 text-sm font-medium text-zinc-500">
              {group.items.length} {group.items.length === 1 ? "post" : "posts"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.items.map((item) => {
              const badge = KIND_BADGES[item.kind];

              return (
                <a
                  key={item.gid}
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
                        {item.gameTitle}
                      </div>
                    )}
                    <span
                      className={`absolute left-2 top-2 rounded px-2 py-1 text-[10px] font-black uppercase ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <div className="relative h-6 w-[18px] shrink-0 overflow-hidden rounded-sm bg-zinc-800">
                      {item.coverUrl && (
                        <SafeImage
                          src={item.coverUrl}
                          alt=""
                          fill
                          sizes="18px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <span className="truncate text-xs font-bold text-zinc-400">
                      {item.gameTitle}
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-zinc-500">
                      {timeFormat.format(new Date(item.publishedAt))}
                    </span>
                  </div>

                  <h3 className="mt-1.5 line-clamp-2 font-bold leading-snug text-white group-hover:text-cyan-300">
                    {item.title}
                  </h3>
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}

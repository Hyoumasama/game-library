"use client";

import AppNav from "@/components/AppNav";
import SafeImage from "@/components/SafeImage";
import type {
  WatchLibraryData,
  WatchLibraryItem,
  WatchMediaType,
} from "@/lib/server/watch/library";
import Link from "next/link";
import { useMemo, useState } from "react";

type WatchTypeFilter = "all" | WatchMediaType;
type WatchSort =
  | "recently-added"
  | "title-asc"
  | "release-newest"
  | "release-oldest"
  | "most-owned";

type WatchFilters = {
  type: string;
  search: string;
  status: string;
  sort: string;
};

const validTypes = new Set(["all", "anime", "tv", "movie"]);
const validSorts = new Set([
  "recently-added",
  "title-asc",
  "release-newest",
  "release-oldest",
  "most-owned",
]);

const typeTabs: { value: WatchTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "anime", label: "Anime" },
  { value: "tv", label: "TV Shows" },
  { value: "movie", label: "Movies" },
];

function cleanInitialFilters(filters: WatchFilters) {
  return {
    type: validTypes.has(filters.type) ? filters.type : "all",
    search: filters.search || "",
    status: filters.status || "all",
    sort: validSorts.has(filters.sort) ? filters.sort : "recently-added",
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function releaseYear(value: string | null) {
  return value ? String(value).slice(0, 4) : null;
}

function mediaTypeLabel(type: WatchMediaType) {
  if (type === "anime") return "Anime";
  if (type === "tv") return "TV Show";
  return "Movie";
}

function dateValue(value: string | null | undefined) {
  if (!value) return 0;

  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
}

function searchText(item: WatchLibraryItem) {
  return [
    item.media.title,
    item.media.original_title,
    ...item.media.alternative_titles,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildWatchUrl(filters: WatchFilters) {
  const params = new URLSearchParams();

  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.sort !== "recently-added") params.set("sort", filters.sort);

  const query = params.toString();

  return query ? `/watch?${query}` : "/watch";
}

function normalizeStatus(value: string) {
  return value.toLowerCase().replaceAll(" ", "");
}

function isCurrentlyWatching(item: WatchLibraryItem) {
  const status = normalizeStatus(item.entry.watch_status);

  return status === "watching" || status === "rewatching";
}

function sortItems(items: WatchLibraryItem[], sort: string) {
  const sorted = items.slice();

  if (sort === "title-asc") {
    sorted.sort((first, second) =>
      first.media.title.localeCompare(second.media.title)
    );
  } else if (sort === "release-newest") {
    sorted.sort(
      (first, second) =>
        dateValue(second.media.release_date) - dateValue(first.media.release_date)
    );
  } else if (sort === "release-oldest") {
    sorted.sort(
      (first, second) =>
        dateValue(first.media.release_date) - dateValue(second.media.release_date)
    );
  } else if (sort === "most-owned") {
    sorted.sort(
      (first, second) =>
        second.ownedEpisodesCount - first.ownedEpisodesCount ||
        first.media.title.localeCompare(second.media.title)
    );
  } else {
    sorted.sort(
      (first, second) =>
        dateValue(second.entry.created_at) - dateValue(first.entry.created_at)
    );
  }

  return sorted;
}

function filterItems(items: WatchLibraryItem[], filters: WatchFilters) {
  const query = filters.search.trim().toLowerCase();

  return items.filter((item) => {
    if (filters.type !== "all" && item.media.media_type !== filters.type) {
      return false;
    }

    if (filters.status !== "all" && item.entry.watch_status !== filters.status) {
      return false;
    }

    if (query && !searchText(item).includes(query)) {
      return false;
    }

    return true;
  });
}

function statCard(label: string, value: number) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-xs font-bold uppercase text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">
        {formatNumber(value)}
      </p>
    </div>
  );
}

function WorkCard({ item }: { item: WatchLibraryItem }) {
  const isMovie = item.media.media_type === "movie";
  const hasEpisodeData = item.officialEpisodesCount > 0;
  const year = releaseYear(item.media.release_date);

  return (
    <Link
      href={`/watch/${item.media.id}`}
      className="group block overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 transition hover:-translate-y-0.5 hover:border-cyan-300/60"
    >
      <div className="relative aspect-[2/3] bg-zinc-900">
        {item.media.poster_url ? (
          <SafeImage
            src={item.media.poster_url}
            alt={item.media.title}
            fill
            sizes="(min-width: 1024px) 18vw, (min-width: 640px) 28vw, 45vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm font-black text-zinc-600">
            No image
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-2 min-h-12 text-base font-black leading-6 text-white group-hover:text-cyan-200">
            {item.media.title}
          </h3>
          <p className="mt-1 text-xs font-bold text-zinc-500">
            {[year, mediaTypeLabel(item.media.media_type)]
              .filter(Boolean)
              .join(" / ")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-200">
            {item.entry.watch_status}
          </span>
          {isMovie ? (
            <span className="rounded border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-emerald-200">
              In Library
            </span>
          ) : item.hasSpecials ? (
            <span className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-300">
              {formatNumber(item.normalSeasonsCount)} Season
              {item.normalSeasonsCount === 1 ? "" : "s"} + Specials
            </span>
          ) : item.officialSeasonsCount > 0 ? (
            <span className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-300">
              {formatNumber(item.officialSeasonsCount)} Season
              {item.officialSeasonsCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        {!isMovie && (
          <div>
            {hasEpisodeData ? (
              <>
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-zinc-300">
                    {formatNumber(item.ownedEpisodesCount)} /{" "}
                    {formatNumber(item.officialEpisodesCount)} Owned
                  </span>
                  <span className="text-zinc-500">
                    {item.ownershipPercentage}%
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-cyan-300"
                    style={{ width: `${item.ownershipPercentage}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="rounded border border-zinc-800 bg-black px-2 py-2 text-xs font-bold text-zinc-500">
                Episode data unavailable
              </p>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

function WorkSection({
  title,
  items,
  compact = false,
}: {
  title: string;
  items: WatchLibraryItem[];
  compact?: boolean;
}) {
  if (!items.length) return null;

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <p className="text-sm font-bold text-zinc-500">
          {formatNumber(items.length)} work{items.length === 1 ? "" : "s"}
        </p>
      </div>
      <div
        className={
          compact
            ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
            : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6"
        }
      >
        {items.map((item) => (
          <WorkCard key={item.entry.id} item={item} />
        ))}
      </div>
    </section>
  );
}

export default function WatchLibraryClient({
  initialData,
  initialFilters,
}: {
  initialData: WatchLibraryData;
  initialFilters: WatchFilters;
}) {
  const [filters, setFilters] = useState(() => cleanInitialFilters(initialFilters));
  const [isLoading, setIsLoading] = useState(false);

  function updateFilters(next: Partial<WatchFilters>) {
    const merged = cleanInitialFilters({ ...filters, ...next });

    setFilters(merged);
    setIsLoading(true);
    window.history.pushState(null, "", buildWatchUrl(merged));
    window.setTimeout(() => setIsLoading(false), 120);
  }

  const filteredItems = useMemo(
    () => sortItems(filterItems(initialData.items, filters), filters.sort),
    [filters, initialData.items]
  );
  const currentlyWatching = filteredItems.filter(isCurrentlyWatching);
  const recentlyAdded = sortItems(filteredItems, "recently-added").slice(0, 12);

  return (
    <main className="min-h-screen bg-[#070a0f] p-4 text-white md:p-8">
      <div className="mx-auto max-w-7xl">
        <AppNav />

        <header className="mt-6">
          <p className="text-sm font-black uppercase text-cyan-300">
            Personal collection
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-normal md:text-6xl">
            Watch Library
          </h1>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
            {statCard("Total Works", initialData.stats.totalWorks)}
            {statCard("Anime", initialData.stats.anime)}
            {statCard("TV Shows", initialData.stats.tv)}
            {statCard("Movies", initialData.stats.movies)}
            {statCard("Owned Episodes", initialData.stats.ownedEpisodes)}
          </div>
        </header>

        {initialData.items.length === 0 ? (
          <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-center">
            <h2 className="text-xl font-black">Your watch library is empty.</h2>
            <p className="mt-2 text-sm font-bold text-zinc-500">
              Match a work from the Watch Import page to add it here.
            </p>
          </section>
        ) : (
          <>
            <section className="mt-8 space-y-4">
              <div className="flex flex-wrap gap-2">
                {typeTabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => updateFilters({ type: tab.value })}
                    className={`rounded-lg border px-4 py-2 text-sm font-black ${
                      filters.type === tab.value
                        ? "border-cyan-300 bg-cyan-300 text-black"
                        : "border-zinc-700 bg-zinc-900 text-zinc-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-3 lg:grid-cols-[1fr_220px_240px]">
                <input
                  value={filters.search}
                  onChange={(event) =>
                    updateFilters({ search: event.target.value })
                  }
                  placeholder="Search by title"
                  className="rounded-lg border border-zinc-700 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-300"
                />

                <select
                  value={filters.status}
                  onChange={(event) =>
                    updateFilters({ status: event.target.value })
                  }
                  className="rounded-lg border border-zinc-700 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-300"
                >
                  <option value="all">All Statuses</option>
                  {initialData.statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.sort}
                  onChange={(event) => updateFilters({ sort: event.target.value })}
                  className="rounded-lg border border-zinc-700 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-300"
                >
                  <option value="recently-added">Recently Added</option>
                  <option value="title-asc">Title A-Z</option>
                  <option value="release-newest">Release Date Newest</option>
                  <option value="release-oldest">Release Date Oldest</option>
                  <option value="most-owned">Most Owned Episodes</option>
                </select>
              </div>
            </section>

            {isLoading && (
              <p className="mt-4 text-sm font-bold text-cyan-200">Loading...</p>
            )}

            {filteredItems.length === 0 ? (
              <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-center">
                <h2 className="text-xl font-black">No search results.</h2>
                <p className="mt-2 text-sm font-bold text-zinc-500">
                  Try another title, type, status, or sort.
                </p>
              </section>
            ) : (
              <>
                <WorkSection
                  title="Currently Watching"
                  items={currentlyWatching}
                  compact
                />
                <WorkSection
                  title="Recently Added"
                  items={recentlyAdded}
                  compact
                />
                <WorkSection title="All Works" items={filteredItems} />
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

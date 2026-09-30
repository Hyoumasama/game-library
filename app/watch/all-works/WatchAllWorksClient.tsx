"use client";

import AppNav from "@/components/AppNav";
import { MultiSelectFilter } from "@/components/games/GameFilters";
import { WatchPosterCard } from "@/app/watch/WatchWorkCards";
import type { WatchLibraryData } from "@/lib/server/watch/library";
import {
  WATCH_PAGE_SIZE,
  buildWatchFilterQuery,
  filterWatchItems,
  readWatchFilters,
  releaseYear,
  sortWatchItems,
  watchFormatOptions,
  watchMultiFilterConfigs,
  watchOwnershipOptions,
  watchSortOptions,
  watchStatusOptions,
  type WatchFilters,
  type WatchMultiFilterKey,
} from "@/lib/watchFilters";
import { HARD_DISK, streamingSources } from "@/lib/watchSources";
import { useEffect, useMemo, useRef, useState } from "react";

const BASE_PATH = "/watch/all-works";

function uniqueSorted(values: (string | null)[], compare?: (a: string, b: string) => number) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort(compare);
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[1.6rem] border border-zinc-800 bg-zinc-950/80 p-5 shadow-xl">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-black text-cyan-300 md:text-4xl">
        {value}
      </p>
    </div>
  );
}

export default function WatchAllWorksClient({
  initialData,
  initialFilters,
}: {
  initialData: WatchLibraryData;
  initialFilters: WatchFilters;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [searchDraft, setSearchDraft] = useState(initialFilters.search);
  const [openFilterMenu, setOpenFilterMenu] = useState<WatchMultiFilterKey | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const items = initialData.items;

  const filterOptions: Record<WatchMultiFilterKey, string[]> = useMemo(
    () => ({
      statuses: watchStatusOptions,
      formats: watchFormatOptions,
      genres: uniqueSorted(items.flatMap((item) => item.media.genres)),
      releases: uniqueSorted(items.map(releaseYear), (a, b) => b.localeCompare(a)),
      // Hard Disk first, then the services actually used in the library.
      sources: [
        HARD_DISK,
        ...uniqueSorted(items.flatMap((item) => streamingSources(item.entry.watch_sources))),
      ],
      ownership: watchOwnershipOptions,
    }),
    [items]
  );

  const results = useMemo(
    () => sortWatchItems(filterWatchItems(items, filters), filters.sort),
    [items, filters]
  );
  const totalPages = Math.max(1, Math.ceil(results.length / WATCH_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const pageItems = results.slice((page - 1) * WATCH_PAGE_SIZE, page * WATCH_PAGE_SIZE);

  function updateFilters(
    next: Partial<WatchFilters>,
    { resetPage = true, history = "push" }: { resetPage?: boolean; history?: "push" | "replace" } = {}
  ) {
    const merged = { ...filters, ...next, page: resetPage ? 1 : next.page ?? filters.page };
    const query = buildWatchFilterQuery(merged);

    setFilters(merged);
    window.history[history === "replace" ? "replaceState" : "pushState"](
      null,
      "",
      query ? `${BASE_PATH}?${query}` : BASE_PATH
    );
  }

  function toggleValue(key: WatchMultiFilterKey, value: string) {
    const selected = filters[key];
    const isSelected = selected.some((entry) => entry.toLowerCase() === value.toLowerCase());

    updateFilters({
      [key]: isSelected
        ? selected.filter((entry) => entry.toLowerCase() !== value.toLowerCase())
        : [...selected, value],
    });
  }

  function changeSearch(value: string) {
    setSearchDraft(value);

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    searchDebounceRef.current = setTimeout(() => {
      updateFilters({ search: value }, { history: "replace" });
    }, 250);
  }

  function goToPage(nextPage: number) {
    updateFilters({ page: nextPage }, { resetPage: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    function handlePopState() {
      const restored = readWatchFilters(new URLSearchParams(window.location.search));

      setFilters(restored);
      setSearchDraft(restored.search);
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const activeFilterConfigs = watchMultiFilterConfigs.filter(
    (config) => filters[config.key].length > 0
  );

  return (
    <main
      className="min-h-screen bg-[#070a0f] text-white"
      onClick={() => {
        if (openFilterMenu) setOpenFilterMenu(null);
      }}
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(244,114,182,0.12),transparent_30%)]" />

      <div className="relative mx-auto max-w-7xl p-4 md:p-8">
        <AppNav />

        <section className="mb-6 overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.35em] text-cyan-300">
                Watch Library
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">
                All Works
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-zinc-400 md:text-base">
                Every anime series, movie, and OVA on the hard disk.
              </p>
            </div>

            <div className="rounded-3xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-4">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-200">
                Results
              </p>
              <p className="mt-1 text-4xl font-black text-cyan-300">{results.length}</p>
            </div>
          </div>

          {activeFilterConfigs.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {activeFilterConfigs.flatMap((config) =>
                filters[config.key].map((value) => (
                  <button
                    key={`${config.key}-${value}`}
                    type="button"
                    onClick={() => toggleValue(config.key, value)}
                    className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-200"
                  >
                    {value} x
                  </button>
                ))
              )}

              {activeFilterConfigs.map((config) => (
                <button
                  key={config.key}
                  type="button"
                  onClick={() => updateFilters({ [config.key]: [] })}
                  className="rounded-full border border-zinc-700 bg-black/50 px-3 py-1 text-xs font-black text-zinc-300 hover:border-zinc-500"
                >
                  {config.clearLabel}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total Works" value={initialData.stats.totalWorks} />
          <StatCard label="Series" value={initialData.stats.series} />
          <StatCard label="Movies" value={initialData.stats.movies} />
          <StatCard
            label="Owned Episodes"
            value={initialData.stats.ownedEpisodes.toLocaleString()}
          />
        </section>

        <section className="relative z-[45] mb-6 rounded-[2rem] border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
            {watchMultiFilterConfigs.map((config) => (
              <MultiSelectFilter
                key={config.key}
                label={config.label}
                values={filterOptions[config.key]}
                selectedValues={filters[config.key]}
                isOpen={openFilterMenu === config.key}
                onToggleOpen={() =>
                  setOpenFilterMenu((open) => (open === config.key ? null : config.key))
                }
                onToggleValue={(value) => toggleValue(config.key, value)}
              />
            ))}

            <select
              value={filters.sort}
              onChange={(event) => updateFilters({ sort: event.target.value })}
              className="rounded-2xl border border-zinc-800 bg-black/70 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
            >
              {watchSortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <input
              value={searchDraft}
              onChange={(event) => changeSearch(event.target.value)}
              placeholder="Search works..."
              className="col-span-2 w-full rounded-2xl border border-zinc-800 bg-black/70 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400 md:col-span-1"
              aria-label="Search works"
            />
          </div>
        </section>

        {pageItems.length === 0 ? (
          <p className="py-16 text-center text-sm font-medium text-zinc-500">
            {items.length === 0 ? "Your watch library is empty." : "Nothing matches these filters."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {pageItems.map((item, index) => (
              <WatchPosterCard
                key={item.entry.id}
                item={item}
                showStatus
                eager={index === 0}
                sizes="(min-width: 1024px) 16vw, (min-width: 768px) 25vw, 50vw"
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => goToPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-3 text-sm font-black text-white disabled:opacity-30"
            >
              ← Prev
            </button>

            <span className="text-sm font-bold text-zinc-400">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => goToPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-3 text-sm font-black text-white disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

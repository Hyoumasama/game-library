"use client";

// Shared shell for /franchise/[slug], /developer/[slug], /publisher/[slug].
// Header block reuses the exact hero-panel classes from the All Games page
// (components/AllGamesClient.tsx) so these new browsing pages don't
// introduce a new visual pattern. Filters/Sort are All Games' own
// (components/games/GameFilters.tsx), applied client-side to this entity's
// already-fetched (and server-cached) game list instead of refetching.
import { useMemo } from "react";
import AppNav from "@/components/AppNav";
import {
  ActiveFilterChips,
  GameFilterControls,
  useGameFilters,
} from "@/components/games/GameFilters";
import GameCardGrid from "@/components/games/GameCardGrid";
import {
  DEFAULT_GAME_FILTERS,
  filterAndSortGames,
  getGameFilterOptions,
  type GameFilters,
} from "@/lib/gameFilters";
import type { BrowsingEntityPageData } from "@/lib/server/browsingEntities";

const ENTITY_LABELS: Record<BrowsingEntityPageData["kind"], string> = {
  franchise: "Franchise",
  developer: "Developer",
  publisher: "Publisher",
};

function hasActiveFilters(filters: GameFilters) {
  return (
    filters.statuses.length > 0 ||
    filters.stores.length > 0 ||
    filters.releases.length > 0 ||
    filters.completions.length > 0 ||
    filters.genres.length > 0
  );
}

export default function EntityPageLayout({
  data,
  basePath,
  initialFilters = DEFAULT_GAME_FILTERS,
}: {
  data: BrowsingEntityPageData;
  basePath: string;
  initialFilters?: GameFilters;
}) {
  const label = ENTITY_LABELS[data.kind];
  const totalCount = data.games.length;
  // No search box on these pages, so a leftover ?search= in the URL must
  // not silently filter the grid.
  const filterState = useGameFilters({
    basePath,
    initialFilters: { ...initialFilters, search: "" },
  });
  const { filters, openFilterMenu, setOpenFilterMenu } = filterState;
  const filterOptions = useMemo(
    () => getGameFilterOptions(data.games),
    [data.games]
  );
  const visibleGames = useMemo(
    () => filterAndSortGames(data.games, filters),
    [data.games, filters]
  );
  const count = visibleGames.length;

  return (
    <main
      className="min-h-screen bg-[#070a0f] text-white"
      onClick={() => {
        if (openFilterMenu) {
          setOpenFilterMenu(null);
        }
      }}
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(250,204,21,0.12),transparent_30%)]" />

      <div className="relative mx-auto max-w-7xl p-4 md:p-8">
        <AppNav />

        <section className="mb-6 overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl md:p-8">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-cyan-300">
            {label}
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">
            {data.name}
          </h1>

          <p className="mt-3 text-sm font-medium text-zinc-400 md:text-base">
            {hasActiveFilters(filters) ? `${count} of ${totalCount}` : count}{" "}
            {(hasActiveFilters(filters) ? totalCount : count) === 1
              ? "game"
              : "games"}{" "}
            in your library
          </p>

          <ActiveFilterChips state={filterState} />
        </section>

        {totalCount > 0 ? (
          <>
            <GameFilterControls
              state={filterState}
              options={filterOptions}
              showSearch={false}
            />

            {count > 0 ? (
              <GameCardGrid games={visibleGames} />
            ) : (
              <p className="text-sm font-medium text-zinc-500">
                No games match these filters.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm font-medium text-zinc-500">
            No games linked to this {label.toLowerCase()} are in your library yet.
          </p>
        )}
      </div>
    </main>
  );
}

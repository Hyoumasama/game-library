"use client";

// Filters + Sort UI and URL-synced state shared by All Games
// (components/AllGamesClient.tsx) and the franchise/developer/publisher
// browsing pages (components/browsing/EntityPageLayout.tsx).
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_GAME_FILTERS,
  buildGameFilterQueryParams,
  getToggledFilterValues,
  hasSelectedValue,
  multiFilterConfigs,
  readFiltersFromSearchParams,
  sortSelectOptions,
  statusOptions,
  type GameFilterOptions,
  type GameFilters,
  type MultiFilterKey,
} from "@/lib/gameFilters";

export function useGameFilters({
  basePath,
  initialFilters,
  onFiltersChange,
}: {
  basePath: string;
  initialFilters: GameFilters;
  /** Called with the new filters after every user change and back/forward
   * navigation, e.g. to refetch results. */
  onFiltersChange?: (filters: GameFilters) => void;
}) {
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFiltersChangeRef = useRef(onFiltersChange);
  const [filters, setFilters] = useState<GameFilters>(initialFilters);
  const [searchDraft, setSearchDraft] = useState(initialFilters.search);
  const [openFilterMenu, setOpenFilterMenu] = useState<MultiFilterKey | null>(
    null
  );

  useEffect(() => {
    onFiltersChangeRef.current = onFiltersChange;
  }, [onFiltersChange]);

  const updateFilters = useCallback(
    (
      nextFilters: Partial<GameFilters>,
      options: { resetPage?: boolean; history?: "push" | "replace" } = {
        resetPage: true,
        history: "push",
      }
    ) => {
      const mergedFilters = {
        ...filters,
        ...nextFilters,
        page:
          options.resetPage === false
            ? nextFilters.page ?? filters.page
            : DEFAULT_GAME_FILTERS.page,
      };
      const query = buildGameFilterQueryParams(mergedFilters).toString();
      const nextUrl = query ? `${basePath}?${query}` : basePath;

      setFilters(mergedFilters);
      window.history[options.history === "replace" ? "replaceState" : "pushState"](
        null,
        "",
        nextUrl
      );
      onFiltersChangeRef.current?.(mergedFilters);
    },
    [basePath, filters]
  );

  const toggleMultiFilter = useCallback(
    (key: MultiFilterKey, value: string) => {
      updateFilters(getToggledFilterValues(filters, key, value));
    },
    [filters, updateFilters]
  );

  function changeSearch(value: string) {
    setSearchDraft(value);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      updateFilters({ search: value }, { history: "replace" });
    }, 350);
  }

  useEffect(() => {
    function handlePopState() {
      const restoredFilters = readFiltersFromSearchParams(
        new URLSearchParams(window.location.search)
      );

      setFilters(restoredFilters);
      setSearchDraft(restoredFilters.search);
      onFiltersChangeRef.current?.(restoredFilters);
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  return {
    filters,
    searchDraft,
    changeSearch,
    updateFilters,
    toggleMultiFilter,
    openFilterMenu,
    setOpenFilterMenu,
  };
}

export type GameFiltersState = ReturnType<typeof useGameFilters>;

function MultiSelectFilter({
  label,
  values,
  selectedValues,
  isOpen,
  onToggleOpen,
  onToggleValue,
}: {
  label: string;
  values: string[];
  selectedValues: string[];
  isOpen: boolean;
  onToggleOpen: () => void;
  onToggleValue: (value: string) => void;
}) {
  const buttonLabel =
    selectedValues.length > 0 ? `${label} (${selectedValues.length})` : label;

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={onToggleOpen}
        className="flex w-full items-center justify-between rounded-2xl border border-zinc-800 bg-black/70 px-4 py-3 text-left text-sm font-bold text-white outline-none focus:border-cyan-400"
      >
        <span>{buttonLabel}</span>
        <span className="text-zinc-500">v</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-40 mt-2 max-h-80 w-72 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl">
          {values.map((value) => {
            if (value === "__divider__") {
              return <div key={value} className="my-2 h-px bg-zinc-800" />;
            }

            const checked = hasSelectedValue(selectedValues, value);

            // Special rendering for Never Played with small description
            if (value === "Never Played") {
              return (
                <label
                  key={value}
                  className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2 text-sm font-bold text-zinc-200 hover:bg-zinc-900"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleValue(value)}
                    className="h-4 w-4 accent-cyan-400 mt-1"
                  />

                  <div>
                    <div className="flex items-center gap-2">
                      <span>{value}</span>
                      <span className="text-xs font-normal text-zinc-400">Unplayed and not completed elsewhere</span>
                    </div>
                  </div>
                </label>
              );
            }

            return (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-zinc-200 hover:bg-zinc-900"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleValue(value)}
                  className="h-4 w-4 accent-cyan-400"
                />
                <span>{value}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Selected-value chips + per-filter "Clear ..." buttons (rendered inside
 * the page's header panel). */
export function ActiveFilterChips({ state }: { state: GameFiltersState }) {
  const { filters, toggleMultiFilter, updateFilters } = state;
  const activeFilterConfigs = multiFilterConfigs.filter(
    (config) => filters[config.key].length > 0
  );

  if (activeFilterConfigs.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {activeFilterConfigs.flatMap((config) =>
        filters[config.key].map((value) => (
          <button
            key={`${config.key}-${value}`}
            type="button"
            onClick={() => toggleMultiFilter(config.key, value)}
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
  );
}

/** The multi-select filters, sort select, and search input panel. */
export function GameFilterControls({
  state,
  options,
  showSearch = true,
}: {
  state: GameFiltersState;
  options: GameFilterOptions;
  showSearch?: boolean;
}) {
  const {
    filters,
    searchDraft,
    changeSearch,
    updateFilters,
    toggleMultiFilter,
    openFilterMenu,
    setOpenFilterMenu,
  } = state;
  const filterMenuOptions: Record<MultiFilterKey, string[]> = {
    statuses: statusOptions,
    stores: options.stores,
    releases: options.years,
    completions: options.completionYears,
    genres: options.genres,
  };

  return (
    <section className="mb-6 rounded-[2rem] border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {multiFilterConfigs.map((config) => (
          <MultiSelectFilter
            key={config.key}
            label={config.label}
            values={filterMenuOptions[config.key]}
            selectedValues={filters[config.key]}
            isOpen={openFilterMenu === config.key}
            onToggleOpen={() =>
              setOpenFilterMenu((open) =>
                open === config.key ? null : config.key
              )
            }
            onToggleValue={(value) => toggleMultiFilter(config.key, value)}
          />
        ))}

        <select
          value={filters.sort}
          onChange={(event) => updateFilters({ sort: event.target.value })}
          className="rounded-2xl border border-zinc-800 bg-black/70 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
        >
          {sortSelectOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {showSearch && (
        <div className="col-span-2 md:col-span-1">
          <input
            value={searchDraft}
            onChange={(event) => changeSearch(event.target.value)}
            placeholder="Search games..."
            className="w-full rounded-2xl border border-zinc-800 bg-black/70 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400"
          />
        </div>
        )}
      </div>
    </section>
  );
}

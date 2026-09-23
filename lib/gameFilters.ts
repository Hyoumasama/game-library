// Filter/sort state shared by the All Games page (components/AllGamesClient.tsx,
// filtered server-side by lib/server/gamesLite.ts) and the franchise/
// developer/publisher browsing pages (components/browsing/EntityPageLayout.tsx,
// filtered client-side over their already-cached lite game list by
// filterAndSortGames below). Client-safe: no server-only imports.
import type { UiGame } from "@/lib/gameTypes";

export type GameFilterOptions = {
  stores: string[];
  years: string[];
  completionYears: string[];
  genres: string[];
};

export type GameFilters = {
  search: string;
  statuses: string[];
  stores: string[];
  releases: string[];
  completions: string[];
  genres: string[];
  sort: string;
  page: number;
};

export const DEFAULT_GAME_FILTERS: GameFilters = {
  search: "",
  statuses: [],
  stores: [],
  releases: [],
  completions: [],
  genres: [],
  sort: "default",
  page: 1,
};

export const statusOptions = [
  "Playing",
  "Completed",
  "Unplayed",
  "Skipped",
  "Dropped",
  "Wishlist",
  "__divider__",
  "Never Played",
];

export const sortSelectOptions = [
  { value: "default", label: "Sort" },
  { value: "score-high", label: "+ Score" },
  { value: "score-low", label: "- Score" },
  { value: "hours-high", label: "+ Hours" },
  { value: "hours-low", label: "- Hours" },
  { value: "completion-newest", label: "Newest Completion" },
  { value: "completion-oldest", label: "Oldest Completion" },
  { value: "release-newest", label: "Newest Release" },
  { value: "release-oldest", label: "Oldest Release" },
];

export type MultiFilterKey =
  | "statuses"
  | "stores"
  | "releases"
  | "completions"
  | "genres";

type MultiFilterConfig = {
  key: MultiFilterKey;
  paramName: string;
  label: string;
  clearLabel: string;
};

export const multiFilterConfigs: MultiFilterConfig[] = [
  {
    key: "statuses",
    paramName: "status",
    label: "Status",
    clearLabel: "Clear Statuses",
  },
  {
    key: "stores",
    paramName: "store",
    label: "Store",
    clearLabel: "Clear Stores",
  },
  {
    key: "releases",
    paramName: "release",
    label: "Release",
    clearLabel: "Clear Releases",
  },
  {
    key: "completions",
    paramName: "completion",
    label: "Completion",
    clearLabel: "Clear Completions",
  },
  {
    key: "genres",
    paramName: "genre",
    label: "Genre",
    clearLabel: "Clear Genres",
  },
];

export function readFiltersFromSearchParams(searchParams: {
  get(name: string): string | null;
  getAll(name: string): string[];
}): GameFilters {
  const page = Number(searchParams.get("page") || 1);

  return {
    search: searchParams.get("search") ?? DEFAULT_GAME_FILTERS.search,
    statuses: searchParams.getAll("status").filter(Boolean),
    stores: searchParams.getAll("store").filter(Boolean),
    releases: searchParams.getAll("release").filter(Boolean),
    completions: searchParams.getAll("completion").filter(Boolean),
    genres: searchParams.getAll("genre").filter(Boolean),
    sort: searchParams.get("sort") ?? DEFAULT_GAME_FILTERS.sort,
    page: Number.isFinite(page) && page > 0 ? page : DEFAULT_GAME_FILTERS.page,
  };
}

/** Same as readFiltersFromSearchParams, for a Server Component's awaited
 * `searchParams` object. */
export function readFiltersFromPageSearchParams(
  params: Record<string, string | string[] | undefined>
): GameFilters {
  const urlParams = new URLSearchParams();

  Object.entries(params).forEach(([name, value]) => {
    (Array.isArray(value) ? value : value ? [value] : []).forEach((item) =>
      urlParams.append(name, item)
    );
  });

  return readFiltersFromSearchParams(urlParams);
}

export function buildGameFilterQueryParams(
  filters: GameFilters,
  options: { pageSize?: number } = {}
) {
  const params = new URLSearchParams();

  if (options.pageSize) {
    params.set("pageSize", String(options.pageSize));
  }

  params.set("page", String(filters.page));

  if (filters.search) params.set("search", filters.search);
  multiFilterConfigs.forEach((config) => {
    filters[config.key].forEach((value) =>
      params.append(config.paramName, value)
    );
  });
  if (filters.sort !== "default") params.set("sort", filters.sort);

  if (!options.pageSize && filters.page <= 1) {
    params.delete("page");
  }

  return params;
}

export function hasSelectedValue(values: string[], value: string) {
  return values.some(
    (selectedValue) => selectedValue.toLowerCase() === value.toLowerCase()
  );
}

function toggleSelectedValue(values: string[], value: string) {
  return hasSelectedValue(values, value)
    ? values.filter(
        (selectedValue) => selectedValue.toLowerCase() !== value.toLowerCase()
      )
    : [...values, value];
}

/** The filter change that toggling `value` in a multi-select should make. */
export function getToggledFilterValues(
  filters: GameFilters,
  key: MultiFilterKey,
  value: string
): Partial<GameFilters> {
  // Special handling for 'Never Played' in statuses
  if (key === "statuses") {
    if (value === "Never Played") {
      // toggle Never Played: when selected, clear other statuses
      const has = hasSelectedValue(filters.statuses, "Never Played");
      return { statuses: has ? [] : ["Never Played"] };
    }

    // If selecting a regular status, ensure Never Played is cleared
    const withoutNever = filters.statuses.filter(
      (s) => s.toLowerCase() !== "never played"
    );

    return {
      statuses: hasSelectedValue(withoutNever, value)
        ? withoutNever.filter((s) => s.toLowerCase() !== value.toLowerCase())
        : [...withoutNever, value],
    };
  }

  return { [key]: toggleSelectedValue(filters[key], value) };
}

// ---------------------------------------------------------------------------
// Client-side equivalent of lib/server/gamesLite.ts (normalizeGamesLiteFilters
// + applyGameFilters + sortOptions + get_games_lite_filters), for pages that
// already hold their whole game list in memory.
// ---------------------------------------------------------------------------

type SortField =
  | "score"
  | "hours_played"
  | "completion_last_played"
  | "release";

const clientSortOptions: Record<
  string,
  { field: SortField; numeric: boolean; ascending: boolean }
> = {
  "hours-high": { field: "hours_played", numeric: true, ascending: false },
  "hours-low": { field: "hours_played", numeric: true, ascending: true },
  "completion-newest": {
    field: "completion_last_played",
    numeric: false,
    ascending: false,
  },
  "completion-oldest": {
    field: "completion_last_played",
    numeric: false,
    ascending: true,
  },
  "score-high": { field: "score", numeric: true, ascending: false },
  "score-low": { field: "score", numeric: true, ascending: true },
  "release-newest": { field: "release", numeric: false, ascending: false },
  "release-oldest": { field: "release", numeric: false, ascending: true },
};

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();

  return values
    .map((value) => value.trim())
    .filter((value) => {
      const key = value.toLowerCase();
      const keep = Boolean(value) && key !== "all" && !seen.has(key);
      seen.add(key);
      return keep;
    });
}

function yearOf(date?: string | null) {
  return date ? date.slice(0, 4) : null;
}

function isBlank(value: unknown) {
  return value === null || value === undefined || value === "";
}

export function filterAndSortGames(games: UiGame[], filters: GameFilters) {
  const search = filters.search.trim().slice(0, 120).toLowerCase();
  const statuses = uniqueStrings(filters.statuses);
  const stores = uniqueStrings(filters.stores);
  const releases = uniqueStrings(filters.releases);
  const completions = uniqueStrings(filters.completions);
  const genres = uniqueStrings(filters.genres);

  const filtered = games.filter((game) => {
    if (search && !game.Title.toLowerCase().includes(search)) return false;
    if (statuses.length > 0 && !statuses.includes(game.status || "")) {
      return false;
    }
    if (stores.length > 0 && !stores.includes(game.store || "")) return false;
    if (
      releases.length > 0 &&
      !releases.includes(yearOf(game.release) || "")
    ) {
      return false;
    }
    if (
      completions.length > 0 &&
      !completions.includes(yearOf(game.completion_last_played) || "")
    ) {
      return false;
    }
    // Postgres `genres @> selected`: the game must have every selected genre.
    if (
      genres.length > 0 &&
      !genres.every((genre) => (game.genres || []).includes(genre))
    ) {
      return false;
    }

    return true;
  });

  const sort = clientSortOptions[filters.sort];

  // "default" keeps the incoming order. Array.prototype.sort is stable, so
  // ties also keep it; blanks go last either way (nullsFirst: false).
  if (!sort) return filtered;

  return [...filtered].sort((first, second) => {
    const a = first[sort.field];
    const b = second[sort.field];

    if (isBlank(a) || isBlank(b)) {
      return Number(isBlank(a)) - Number(isBlank(b));
    }

    const comparison = sort.numeric
      ? Number(a) - Number(b)
      : String(a).localeCompare(String(b));

    return sort.ascending ? comparison : -comparison;
  });
}

function compareCaseInsensitive(first: string, second: string) {
  return first.localeCompare(second, "en", { sensitivity: "base" });
}

/** Filter menu values present in `games`, ordered like the
 * get_games_lite_filters RPC All Games uses (names A-Z, years newest first). */
export function getGameFilterOptions(games: UiGame[]): GameFilterOptions {
  const stores = new Set<string>();
  const years = new Set<string>();
  const completionYears = new Set<string>();
  const genres = new Set<string>();

  games.forEach((game) => {
    if (game.store) stores.add(game.store);
    const release = yearOf(game.release);
    if (release) years.add(release);
    const completion = yearOf(game.completion_last_played);
    if (completion) completionYears.add(completion);
    (game.genres || []).forEach((genre) => genre && genres.add(genre));
  });

  return {
    stores: [...stores].sort(compareCaseInsensitive),
    years: [...years].sort().reverse(),
    completionYears: [...completionYears].sort().reverse(),
    genres: [...genres].sort(compareCaseInsensitive),
  };
}

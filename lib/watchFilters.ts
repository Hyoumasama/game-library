import type { WatchLibraryItem } from "@/lib/server/watch/library";
import { HARD_DISK } from "@/lib/watchSources";

// Filters, sort and paging for /watch/all-works. The whole library is small,
// so filtering runs in the browser over every item. Multi-value filters are
// ORed inside a group and ANDed across groups, and are mirrored to the URL
// as comma-separated params: /watch/all-works?status=Watching,Completed&format=Movie

export const WATCH_PAGE_SIZE = 24;

export type WatchMultiFilterKey =
  | "statuses"
  | "formats"
  | "genres"
  | "releases"
  | "sources"
  | "ownership";

export type WatchFilters = Record<WatchMultiFilterKey, string[]> & {
  search: string;
  sort: string;
  page: number;
};

export const DEFAULT_WATCH_FILTERS: WatchFilters = {
  statuses: [],
  formats: [],
  genres: [],
  releases: [],
  sources: [],
  ownership: [],
  search: "",
  sort: "recently-added",
  page: 1,
};

// URL param name for each multi filter.
export const watchMultiFilterConfigs: {
  key: WatchMultiFilterKey;
  param: string;
  label: string;
  clearLabel: string;
}[] = [
  { key: "statuses", param: "status", label: "Status", clearLabel: "Clear Status" },
  { key: "formats", param: "format", label: "Format", clearLabel: "Clear Format" },
  { key: "genres", param: "genre", label: "Genre", clearLabel: "Clear Genre" },
  { key: "releases", param: "release", label: "Release", clearLabel: "Clear Release" },
  { key: "sources", param: "source", label: "Source", clearLabel: "Clear Source" },
  { key: "ownership", param: "owned", label: "Owned", clearLabel: "Clear Owned" },
];

export const watchStatusOptions = [
  "Watching",
  "Rewatching",
  "Completed",
  "Plan to Watch",
  "On Hold",
  "Dropped",
  "Skipped",
];

const formatLabels: Record<string, string> = {
  series: "Series",
  movie: "Movie",
  ova: "OVA",
  ona: "ONA",
  special: "Special",
};

export const watchFormatOptions = ["Series", "Movie", "OVA"];

export function formatLabel(format: string) {
  return formatLabels[format] || format;
}

export const watchOwnershipOptions = ["Complete", "Partial", "None"];

export const watchSortOptions = [
  { value: "recently-added", label: "Recently Added" },
  { value: "title-asc", label: "Title A-Z" },
  { value: "title-desc", label: "Title Z-A" },
  { value: "release-newest", label: "Release Newest" },
  { value: "release-oldest", label: "Release Oldest" },
  { value: "score-desc", label: "Highest Score" },
  { value: "owned-desc", label: "Most Owned Episodes" },
];

const validSorts = new Set(watchSortOptions.map((option) => option.value));

type SearchParamsLike = { get(name: string): string | null };

export function readWatchFilters(params: SearchParamsLike): WatchFilters {
  const page = Number(params.get("page"));
  const sort = params.get("sort") || "";
  const filters: WatchFilters = {
    ...DEFAULT_WATCH_FILTERS,
    search: params.get("search") || "",
    sort: validSorts.has(sort) ? sort : DEFAULT_WATCH_FILTERS.sort,
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };

  for (const config of watchMultiFilterConfigs) {
    filters[config.key] = [
      ...new Set(
        (params.get(config.param) || "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      ),
    ];
  }

  return filters;
}

export function buildWatchFilterQuery(filters: WatchFilters) {
  const params = new URLSearchParams();

  for (const config of watchMultiFilterConfigs) {
    if (filters[config.key].length) {
      params.set(config.param, filters[config.key].join(","));
    }
  }

  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.sort !== DEFAULT_WATCH_FILTERS.sort) params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));

  return params.toString();
}

// TMDB/AniList scores are stored 0-10; the site shows them out of 100 like
// game scores. null when there is no score.
export function watchScore100(media: { tmdb_score: number | null; anilist_score: number | null }) {
  const score = media.tmdb_score ?? media.anilist_score;

  return score != null && score > 0 ? Math.round(score * 10) : null;
}

export function releaseYear(item: WatchLibraryItem) {
  return item.media.release_date?.slice(0, 4) || null;
}

// Whether the work is on the hard disk: whole, in part, or not at all.
export function ownershipState(item: WatchLibraryItem) {
  if (item.media.format === "movie") {
    return item.entry.watch_sources.includes(HARD_DISK) ? "Complete" : "None";
  }

  if (item.ownedEpisodesCount <= 0) return "None";
  if (item.officialEpisodesCount <= 0) return null;

  return item.ownedEpisodesCount >= item.officialEpisodesCount
    ? "Complete"
    : "Partial";
}

function searchText(item: WatchLibraryItem) {
  return [item.media.title, item.media.original_title, ...item.media.alternative_titles]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesAny(selected: string[], value: string | null) {
  return selected.length === 0 || (value != null && selected.includes(value));
}

export function filterWatchItems(items: WatchLibraryItem[], filters: WatchFilters) {
  const query = filters.search.trim().toLowerCase();

  return items.filter(
    (item) =>
      matchesAny(filters.statuses, item.entry.watch_status) &&
      matchesAny(filters.formats, formatLabel(item.media.format)) &&
      matchesAny(filters.releases, releaseYear(item)) &&
      matchesAny(filters.ownership, ownershipState(item)) &&
      (filters.sources.length === 0 ||
        item.entry.watch_sources.some((source) => filters.sources.includes(source))) &&
      (filters.genres.length === 0 ||
        item.media.genres.some((genre) => filters.genres.includes(genre))) &&
      (!query || searchText(item).includes(query))
  );
}

function timeValue(value: string | null | undefined) {
  const time = value ? new Date(value).getTime() : NaN;

  return Number.isFinite(time) ? time : 0;
}

export function sortWatchItems(items: WatchLibraryItem[], sort: string) {
  const byTitle = (first: WatchLibraryItem, second: WatchLibraryItem) =>
    first.media.title.localeCompare(second.media.title);
  const comparators: Record<
    string,
    (first: WatchLibraryItem, second: WatchLibraryItem) => number
  > = {
    "title-asc": byTitle,
    "title-desc": (first, second) => byTitle(second, first),
    "release-newest": (first, second) =>
      timeValue(second.media.release_date) - timeValue(first.media.release_date),
    "release-oldest": (first, second) =>
      timeValue(first.media.release_date) - timeValue(second.media.release_date),
    "score-desc": (first, second) =>
      (second.media.tmdb_score ?? -1) - (first.media.tmdb_score ?? -1) ||
      byTitle(first, second),
    "owned-desc": (first, second) =>
      second.ownedEpisodesCount - first.ownedEpisodesCount ||
      byTitle(first, second),
  };
  const compare =
    comparators[sort] ||
    ((first: WatchLibraryItem, second: WatchLibraryItem) =>
      timeValue(second.entry.created_at) - timeValue(first.entry.created_at));

  return items.slice().sort(compare);
}

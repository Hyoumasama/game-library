"use client";

import type { FormEvent, MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type LocalType = "series" | "movie" | "ova";
type ImportStatus = "pending" | "matched" | "skipped";
type Source = "tmdb" | "anilist";
type TmdbType = "tv" | "movie";

type ImportItem = {
  id: number;
  source_key: string;
  local_title: string;
  local_type: LocalType;
  local_file_count: number;
  local_season_count: number;
  local_episode_count: number;
  local_summary: {
    primary?: number;
    extra?: number;
    nced?: number;
    ncop?: number;
    special?: number;
  };
  status: ImportStatus;
  matched_media_id: number | null;
  notes: string | null;
  matched_at: string | null;
  created_at: string;
};

type ApiResponse = {
  items: ImportItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  counts: {
    all: number;
    pending: number;
    matched: number;
    skipped: number;
    series: number;
    movie: number;
    ova: number;
  };
};

type TmdbResult = {
  source: "tmdb";
  id: number;
  tmdb_type: TmdbType;
  title: string;
  original_title: string | null;
  release_date: string | null;
  year: number | null;
  overview: string | null;
  poster_url: string | null;
  score: number | null;
  popularity: number | null;
};

type AniListResult = {
  source: "anilist";
  id: number;
  mal_id: number | null;
  title: string;
  english_title: string | null;
  romaji_title: string | null;
  native_title: string | null;
  alternative_titles: string[];
  format: string | null;
  status: string | null;
  season_year: number | null;
  episodes: number | null;
  duration: number | null;
  description: string | null;
  cover_url: string | null;
  average_score: number | null;
  studios: string[];
  genres: string[];
};

type SearchResult = TmdbResult | AniListResult;

type TmdbPreview =
  | {
      source: "tmdb";
      tmdb_type: "tv";
      id: number;
      title: string;
      original_title: string | null;
      overview: string | null;
      poster_url: string | null;
      release_date: string | null;
      end_date: string | null;
      status: string | null;
      score: number | null;
      genres: string[];
      total_seasons: number;
      total_episodes: number;
      episode_duration: number | null;
      seasons: {
        season_number: number;
        title: string | null;
        air_date: string | null;
        episode_count: number;
      }[];
    }
  | {
      source: "tmdb";
      tmdb_type: "movie";
      id: number;
      title: string;
      original_title: string | null;
      overview: string | null;
      poster_url: string | null;
      release_date: string | null;
      runtime: number | null;
      status: string | null;
      score: number | null;
      genres: string[];
    };

type AniListPreview = {
  source: "anilist";
  id: number;
  mal_id: number | null;
  titles: {
    english: string | null;
    romaji: string | null;
    native: string | null;
    userPreferred: string | null;
  };
  format: string | null;
  status: string | null;
  cover_url: string | null;
  start_date: string | null;
  end_date: string | null;
  episodes: number | null;
  duration: number | null;
  average_score: number | null;
  genres: string[];
  studios: string[];
  season: string | null;
  season_year: number | null;
};

type Preview = TmdbPreview | AniListPreview;

type TmdbSeasonEpisode = {
  episode_number: number;
  tmdb_episode_id: number | null;
  title: string | null;
  overview: string | null;
  air_date: string | null;
  still_url: string | null;
  duration: number | null;
};

type TmdbSeasonDetails = {
  season_number: number;
  title: string | null;
  overview: string | null;
  poster_url: string | null;
  air_date: string | null;
  episode_count: number;
  tmdb_season_id: number | null;
  episodes: TmdbSeasonEpisode[];
};

type AbsoluteEpisodeRef = {
  absolute: number;
  seasonNumber: number;
  episodeNumber: number;
};

const typeLabels: Record<LocalType, string> = {
  series: "Series",
  movie: "Movie",
  ova: "OVA",
};

const statusLabels: Record<ImportStatus, string> = {
  pending: "Pending",
  matched: "Matched",
  skipped: "Skipped",
};

function numberLabel(value: number | null | undefined) {
  if (value == null) return "-";

  return new Intl.NumberFormat("en-US").format(value);
}

function resultTitle(result: SearchResult | Preview) {
  if (result.source === "tmdb") return result.title;

  if ("titles" in result) {
    return (
      result.titles.english ||
      result.titles.userPreferred ||
      result.titles.romaji ||
      result.titles.native ||
      `AniList ${result.id}`
    );
  }

  return result.title;
}

function resultPoster(result: SearchResult | Preview) {
  if (result.source === "tmdb") return result.poster_url;

  return "cover_url" in result ? result.cover_url : null;
}

function defaultTmdbType(localType: LocalType): TmdbType {
  return localType === "movie" ? "movie" : "tv";
}

function episodeKey(seasonNumber: number, episodeNumber: number) {
  return `${seasonNumber}:${episodeNumber}`;
}

function parseEpisodeKey(key: string) {
  const [seasonNumber, episodeNumber] = key.split(":").map(Number);

  return { seasonNumber, episodeNumber };
}

function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      className="h-4 w-4 accent-cyan-300"
    />
  );
}

export default function WatchImportReviewClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState(
    searchParams.get("search") || ""
  );
  const [activeItem, setActiveItem] = useState<ImportItem | null>(null);
  const [modalSource, setModalSource] = useState<Source>("tmdb");
  const [modalTmdbType, setModalTmdbType] = useState<TmdbType>("tv");
  const [modalQuery, setModalQuery] = useState("");
  const [modalResults, setModalResults] = useState<SearchResult[]>([]);
  const [selectedTmdbResult, setSelectedTmdbResult] =
    useState<TmdbResult | null>(null);
  const [selectedTmdbPreview, setSelectedTmdbPreview] =
    useState<TmdbPreview | null>(null);
  const [selectedAniListResults, setSelectedAniListResults] = useState<
    AniListResult[]
  >([]);
  const [selectedAniListPreviews, setSelectedAniListPreviews] = useState<
    AniListPreview[]
  >([]);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [ownedEpisodeKeys, setOwnedEpisodeKeys] = useState<Set<string>>(
    () => new Set()
  );
  const [expandedSeasonNumbers, setExpandedSeasonNumbers] = useState<
    Set<number>
  >(() => new Set());
  const [seasonEpisodes, setSeasonEpisodes] = useState<
    Record<number, TmdbSeasonDetails>
  >({});
  const [loadingSeasonNumber, setLoadingSeasonNumber] = useState<number | null>(
    null
  );
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [rangeError, setRangeError] = useState("");
  const [rangeFirst, setRangeFirst] = useState<AbsoluteEpisodeRef | null>(null);
  const [rangeLast, setRangeLast] = useState<AbsoluteEpisodeRef | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (!params.get("page")) params.set("page", "1");
    if (!params.get("sort")) params.set("sort", "title_asc");

    return params.toString();
  }, [searchParams]);

  useEffect(() => {
    setSearchValue(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadItems() {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/admin/watch/import-items?${queryString}`,
          { signal: controller.signal }
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load import items.");
        }

        setData(payload);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load import items."
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadItems();

    return () => controller.abort();
  }, [queryString]);

  useEffect(() => {
    if (!activeItem) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        closeModal();
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activeItem, isSaving]);

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all" || (key === "sort" && value === "title_asc")) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    params.set("page", updates.page || "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateParams({ search: searchValue.trim(), page: "1" });
  }

  function resetOwnershipSelection() {
    setOwnedEpisodeKeys(new Set());
    setExpandedSeasonNumbers(new Set());
    setSeasonEpisodes({});
    setLoadingSeasonNumber(null);
    setRangeFrom("");
    setRangeTo("");
    setRangeError("");
    setRangeFirst(null);
    setRangeLast(null);
  }

  function tmdbTvSeasons() {
    return selectedTmdbPreview?.source === "tmdb" &&
      selectedTmdbPreview.tmdb_type === "tv"
      ? selectedTmdbPreview.seasons
      : [];
  }

  function absoluteEpisodeRefs() {
    let absolute = 0;

    return tmdbTvSeasons()
      .filter((season) => season.season_number > 0)
      .sort((first, second) => first.season_number - second.season_number)
      .flatMap((season) =>
        Array.from({ length: season.episode_count || 0 }, (_, index) => {
          absolute += 1;

          return {
            absolute,
            seasonNumber: season.season_number,
            episodeNumber: index + 1,
          };
        })
      );
  }

  function officialEpisodeCount() {
    return tmdbTvSeasons().reduce(
      (total, season) => total + (season.episode_count || 0),
      0
    );
  }

  function normalEpisodeCount() {
    return absoluteEpisodeRefs().length;
  }

  function selectedOwnedEpisodes() {
    return Array.from(ownedEpisodeKeys).map(parseEpisodeKey);
  }

  async function loadSeasonEpisodes(seasonNumber: number) {
    if (!activeItem || !selectedTmdbResult) return [];
    const cached = seasonEpisodes[seasonNumber];

    if (cached) return cached.episodes;

    setLoadingSeasonNumber(seasonNumber);

    try {
      const params = new URLSearchParams({
        tmdbId: String(selectedTmdbResult.id),
        seasonNumber: String(seasonNumber),
      });
      const response = await fetch(
        `/api/admin/watch/import-items/${activeItem.id}/season?${params.toString()}`
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Loading season failed.");
      }

      const season = payload.season as TmdbSeasonDetails;
      setSeasonEpisodes((current) => ({
        ...current,
        [seasonNumber]: season,
      }));

      return season.episodes;
    } catch (seasonError) {
      setModalError(
        seasonError instanceof Error
          ? seasonError.message
          : "Loading season failed."
      );

      return [];
    } finally {
      setLoadingSeasonNumber(null);
    }
  }

  async function toggleSeasonExpanded(seasonNumber: number) {
    setExpandedSeasonNumbers((current) => {
      const next = new Set(current);

      if (next.has(seasonNumber)) {
        next.delete(seasonNumber);
      } else {
        next.add(seasonNumber);
      }

      return next;
    });

    if (!expandedSeasonNumbers.has(seasonNumber)) {
      await loadSeasonEpisodes(seasonNumber);
    }
  }

  function toggleEpisodeOwned(seasonNumber: number, episodeNumber: number) {
    const key = episodeKey(seasonNumber, episodeNumber);

    setOwnedEpisodeKeys((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
    setIsConfirming(false);
  }

  function toggleSeasonOwned(seasonNumber: number, episodeCount: number) {
    const keys = Array.from({ length: episodeCount || 0 }, (_, index) =>
      episodeKey(seasonNumber, index + 1)
    );
    const selectedCount = keys.filter((key) => ownedEpisodeKeys.has(key)).length;
    const shouldSelect = selectedCount < keys.length;

    setOwnedEpisodeKeys((current) => {
      const next = new Set(current);

      keys.forEach((key) => {
        if (shouldSelect) {
          next.add(key);
        } else {
          next.delete(key);
        }
      });

      return next;
    });
    setIsConfirming(false);
  }

  function toggleAllEpisodes() {
    const seasons = tmdbTvSeasons();
    const keys = seasons.flatMap((season) =>
      Array.from({ length: season.episode_count || 0 }, (_, index) =>
        episodeKey(season.season_number, index + 1)
      )
    );
    const shouldSelect = ownedEpisodeKeys.size < keys.length;

    setOwnedEpisodeKeys(shouldSelect ? new Set(keys) : new Set());
    setIsConfirming(false);
  }

  async function selectAbsoluteRange() {
    setRangeError("");
    setRangeFirst(null);
    setRangeLast(null);

    const from = Number(rangeFrom);
    const to = Number(rangeTo);
    const absoluteEpisodes = absoluteEpisodeRefs();

    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to)) {
      setRangeError("From and To must be valid integers.");
      return;
    }

    if (from <= 0) {
      setRangeError("From must be greater than zero.");
      return;
    }

    if (from > to) {
      setRangeError("From must not be greater than To.");
      return;
    }

    if (to > absoluteEpisodes.length) {
      setRangeError(
        `To must not exceed ${numberLabel(absoluteEpisodes.length)} normal episodes.`
      );
      return;
    }

    const selectedRange = absoluteEpisodes.slice(from - 1, to);
    const first = selectedRange[0] || null;
    const last = selectedRange[selectedRange.length - 1] || null;

    setOwnedEpisodeKeys((current) => {
      const next = new Set(current);

      selectedRange.forEach((episode) => {
        next.add(episodeKey(episode.seasonNumber, episode.episodeNumber));
      });

      return next;
    });
    setRangeFirst(first);
    setRangeLast(last);
    setIsConfirming(false);

    await Promise.all(
      Array.from(
        new Set(
          [first?.seasonNumber, last?.seasonNumber].filter(
            (value): value is number => Boolean(value)
          )
        )
      ).map(loadSeasonEpisodes)
    );
  }

  function episodeDisplayTitle(ref: AbsoluteEpisodeRef | null) {
    if (!ref) return "-";

    const episode = seasonEpisodes[ref.seasonNumber]?.episodes.find(
      (item) => item.episode_number === ref.episodeNumber
    );

    return episode?.title || `Episode ${ref.episodeNumber}`;
  }

  function openModal(item: ImportItem) {
    setActiveItem(item);
    setModalSource("tmdb");
    setModalTmdbType(defaultTmdbType(item.local_type));
    setModalQuery(item.local_title);
    setModalResults([]);
    setSelectedTmdbResult(null);
    setSelectedTmdbPreview(null);
    setSelectedAniListResults([]);
    setSelectedAniListPreviews([]);
    setModalError("");
    setModalSuccess("");
    setIsConfirming(false);
    resetOwnershipSelection();
  }

  function closeModal() {
    if (isSaving) return;
    setActiveItem(null);
  }

  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }

  async function searchCandidates(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!activeItem || !modalQuery.trim()) return;

    setIsSearching(true);
    setModalError("");
    setModalSuccess("");
    setModalResults([]);
    setSelectedTmdbResult(null);
    setSelectedTmdbPreview(null);
    setSelectedAniListResults([]);
    setSelectedAniListPreviews([]);
    setIsConfirming(false);
    resetOwnershipSelection();

    const params = new URLSearchParams({
      source: modalSource,
      query: modalQuery.trim(),
    });

    if (modalSource === "tmdb") {
      params.set("tmdbType", modalTmdbType);
    }

    try {
      const response = await fetch(
        `/api/admin/watch/import-items/${activeItem.id}/search?${params.toString()}`
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Search failed.");
      }

      setModalResults(payload.results || []);
    } catch (searchError) {
      setModalError(
        searchError instanceof Error ? searchError.message : "Search failed."
      );
    } finally {
      setIsSearching(false);
    }
  }

  async function loadCandidatePreview(result: SearchResult) {
    if (!activeItem) return;

    setModalError("");
    setModalSuccess("");
    setIsConfirming(false);
    setIsLoadingDetails(true);

    const params = new URLSearchParams({
      source: result.source,
      candidateId: String(result.id),
    });

    if (result.source === "tmdb") {
      params.set("tmdbType", result.tmdb_type);
    }

    try {
      const response = await fetch(
        `/api/admin/watch/import-items/${activeItem.id}/candidate?${params.toString()}`
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Loading details failed.");
      }

      return payload.candidate as Preview;
    } catch (detailsError) {
      setModalError(
        detailsError instanceof Error
          ? detailsError.message
          : "Loading details failed."
      );
      return null;
    } finally {
      setIsLoadingDetails(false);
    }
  }

  async function selectCandidate(result: SearchResult) {
    if (result.source === "tmdb") {
      setSelectedTmdbResult(result);
      setSelectedTmdbPreview(null);
      setSelectedAniListResults([]);
      setSelectedAniListPreviews([]);
      resetOwnershipSelection();
      const preview = await loadCandidatePreview(result);

      if (preview?.source === "tmdb") {
        setSelectedTmdbPreview(preview);
      } else {
        setSelectedTmdbResult(null);
      }

      return;
    }

    setSelectedTmdbResult(null);
    setSelectedTmdbPreview(null);
    resetOwnershipSelection();

    const isAlreadySelected = selectedAniListResults.some(
      (item) => item.id === result.id
    );

    if (isAlreadySelected) {
      setSelectedAniListResults((current) =>
        current.filter((item) => item.id !== result.id)
      );
      setSelectedAniListPreviews((current) =>
        current.filter((item) => item.id !== result.id)
      );
      setIsConfirming(false);
      return;
    }

    setSelectedAniListResults((current) => [...current, result]);
    const preview = await loadCandidatePreview(result);

    if (preview?.source === "anilist") {
      setSelectedAniListPreviews((current) =>
        current.some((item) => item.id === preview.id)
          ? current
          : [...current, preview]
      );
    } else {
      setSelectedAniListResults((current) =>
        current.filter((item) => item.id !== result.id)
      );
    }
  }

  function removeAniListSelection(id: number) {
    setSelectedAniListResults((current) =>
      current.filter((item) => item.id !== id)
    );
    setSelectedAniListPreviews((current) =>
      current.filter((item) => item.id !== id)
    );
    setIsConfirming(false);
  }

  async function confirmSave() {
    const hasSelection = selectedTmdbResult || selectedAniListResults.length > 0;

    if (!activeItem || !hasSelection || isSaving) return;

    setIsSaving(true);
    setModalError("");

    try {
      const response = await fetch(
        `/api/admin/watch/import-items/${activeItem.id}/confirm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source: selectedTmdbResult ? "tmdb" : "anilist",
            ...(selectedTmdbResult
              ? {
                  candidateId: selectedTmdbResult.id,
                  tmdbType: selectedTmdbResult.tmdb_type,
                  ownedEpisodes:
                    selectedTmdbResult.tmdb_type === "tv"
                      ? selectedOwnedEpisodes()
                      : [],
                }
              : {
                  candidateIds: selectedAniListResults.map((item) => item.id),
                  tmdbType: null,
                }),
          }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Save failed.");
      }

      const matchedMediaId = Number(payload.media_id);

      setData((current) => {
        if (!current) return current;

        return {
          ...current,
          items: current.items.map((item) =>
            item.id === activeItem.id
              ? {
                  ...item,
                  status: "matched",
                  matched_media_id: matchedMediaId,
                  matched_at: new Date().toISOString(),
                }
              : item
          ),
          counts: {
            ...current.counts,
            pending:
              activeItem.status === "pending"
                ? Math.max(0, current.counts.pending - 1)
                : current.counts.pending,
            skipped:
              activeItem.status === "skipped"
                ? Math.max(0, current.counts.skipped - 1)
                : current.counts.skipped,
            matched:
              activeItem.status === "matched"
                ? current.counts.matched
                : current.counts.matched + 1,
          },
        };
      });

      setActiveItem((current) =>
        current
          ? {
              ...current,
              status: "matched",
              matched_media_id: matchedMediaId,
              matched_at: new Date().toISOString(),
            }
          : current
      );
      setModalSuccess("Match saved successfully.");
      setIsConfirming(false);
      window.setTimeout(() => {
        setActiveItem(null);
      }, 900);
    } catch (saveError) {
      setModalError(saveError instanceof Error ? saveError.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  const counts = data?.counts || {
    all: 0,
    pending: 0,
    matched: 0,
    skipped: 0,
    series: 0,
    movie: 0,
    ova: 0,
  };
  const pagination = data?.pagination || {
    page: Number(searchParams.get("page") || 1),
    pageSize: 25,
    totalItems: 0,
    totalPages: 0,
  };
  const items = data?.items || [];
  const currentStatus = searchParams.get("status") || "all";
  const currentType = searchParams.get("type") || "all";
  const currentSort = searchParams.get("sort") || "title_asc";
  const canGoPrevious = pagination.page > 1;
  const canGoNext =
    pagination.totalPages > 0 && pagination.page < pagination.totalPages;
  const isAlreadyMatched =
    activeItem?.status === "matched" && activeItem.matched_media_id;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-black">Watch Import Review</h1>
          <p className="mt-2 text-zinc-400">
            Review local Watch inventory before any manual matching.
          </p>
        </div>
      </div>

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {[
          ["All", counts.all],
          ["Pending", counts.pending],
          ["Matched", counts.matched],
          ["Skipped", counts.skipped],
          ["Series", counts.series],
          ["Movies", counts.movie],
          ["OVA", counts.ova],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
          >
            <p className="text-xs font-bold uppercase text-zinc-500">
              {label}
            </p>
            <p className="mt-2 text-2xl font-black">
              {numberLabel(Number(value))}
            </p>
          </div>
        ))}
      </section>

      <section className="mb-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_180px]">
          <form onSubmit={submitSearch} className="flex gap-2">
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search local title"
              className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm font-bold text-white outline-none focus:border-cyan-300"
            />
            <button className="rounded-lg bg-white px-4 py-2 text-sm font-black text-black">
              Search
            </button>
          </form>

          <select
            value={currentStatus}
            onChange={(event) =>
              updateParams({ status: event.target.value, page: "1" })
            }
            className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm font-bold text-white outline-none focus:border-cyan-300"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="matched">Matched</option>
            <option value="skipped">Skipped</option>
          </select>

          <select
            value={currentType}
            onChange={(event) =>
              updateParams({ type: event.target.value, page: "1" })
            }
            className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm font-bold text-white outline-none focus:border-cyan-300"
          >
            <option value="all">All Types</option>
            <option value="series">Series</option>
            <option value="movie">Movie</option>
            <option value="ova">OVA</option>
          </select>

          <select
            value={currentSort}
            onChange={(event) =>
              updateParams({ sort: event.target.value, page: "1" })
            }
            className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm font-bold text-white outline-none focus:border-cyan-300"
          >
            <option value="title_asc">Title A-Z</option>
            <option value="title_desc">Title Z-A</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </section>

      {error && (
        <div className="mb-6 rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm font-bold text-red-200">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-8 text-center text-sm font-bold text-zinc-400">
          Loading import items...
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-8 text-center text-sm font-bold text-zinc-400">
          No import items found
        </div>
      )}

      {!isLoading && !error && items.length > 0 && (
        <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
          <div className="hidden grid-cols-[1fr_110px_90px_90px_90px_110px_100px] border-b border-zinc-800 bg-zinc-900 px-4 py-3 text-xs font-black uppercase text-zinc-400 md:grid">
            <div>Local Title</div>
            <div>Local Type</div>
            <div>Files</div>
            <div>Seasons</div>
            <div>Episodes</div>
            <div>Status</div>
            <div>Action</div>
          </div>

          {items.map((item) => (
            <div
              key={item.id}
              className="grid gap-3 border-b border-zinc-900 px-4 py-4 text-sm last:border-b-0 md:grid-cols-[1fr_110px_90px_90px_90px_110px_100px] md:items-center md:gap-0"
            >
              <div className="min-w-0">
                <p className="truncate font-black text-white">
                  {item.local_title}
                </p>
                <p className="mt-1 truncate text-xs font-bold text-zinc-500">
                  {item.source_key}
                </p>
              </div>
              <div className="font-bold text-zinc-200">
                {typeLabels[item.local_type]}
              </div>
              <div className="font-black text-cyan-300">
                {numberLabel(item.local_file_count)}
              </div>
              <div className="font-bold text-zinc-200">
                {numberLabel(item.local_season_count)}
              </div>
              <div className="font-bold text-zinc-200">
                {numberLabel(item.local_episode_count)}
              </div>
              <div className="font-bold text-zinc-200">
                {statusLabels[item.status]}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => openModal(item)}
                  className="w-full rounded-lg border border-zinc-700 bg-white px-3 py-2 text-center text-sm font-black text-black hover:bg-cyan-200"
                >
                  {item.status === "matched" ? "View Match" : "Match"}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={!canGoPrevious}
          onClick={() =>
            updateParams({ page: String(Math.max(1, pagination.page - 1)) })
          }
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:border-zinc-900 disabled:text-zinc-600"
        >
          Previous
        </button>

        <p className="text-sm font-bold text-zinc-400">
          Page {pagination.totalPages === 0 ? 0 : pagination.page} of{" "}
          {pagination.totalPages}
        </p>

        <button
          type="button"
          disabled={!canGoNext}
          onClick={() => updateParams({ page: String(pagination.page + 1) })}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:border-zinc-900 disabled:text-zinc-600"
        >
          Next
        </button>
      </div>

      {activeItem && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 sm:p-8"
          onMouseDown={closeFromBackdrop}
        >
          <div className="w-full max-w-5xl rounded-lg border border-zinc-800 bg-zinc-950 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-800 p-4">
              <div>
                <p className="text-xs font-bold uppercase text-zinc-500">
                  Manual Watch Match
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {activeItem.local_title}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-black text-white disabled:text-zinc-600"
                aria-label="Close"
              >
                X
              </button>
            </div>

            <div className="max-h-[calc(100vh-140px)] overflow-y-auto p-4">
              <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-6">
                {[
                  ["Local Title", activeItem.local_title],
                  ["Type", typeLabels[activeItem.local_type]],
                  ["Files", numberLabel(activeItem.local_file_count)],
                  ["Seasons", numberLabel(activeItem.local_season_count)],
                  ["Episodes", numberLabel(activeItem.local_episode_count)],
                  ["Status", statusLabels[activeItem.status]],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-zinc-800 bg-black p-3"
                  >
                    <p className="text-xs font-bold uppercase text-zinc-500">
                      {label}
                    </p>
                    <p className="mt-1 truncate text-sm font-black">{value}</p>
                  </div>
                ))}
              </section>

              {isAlreadyMatched && (
                <div className="rounded-lg border border-emerald-900 bg-emerald-950/30 p-4">
                  <p className="text-lg font-black text-emerald-200">
                    Already matched
                  </p>
                  <p className="mt-2 text-sm font-bold text-zinc-300">
                    Matched media ID: {activeItem.matched_media_id}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Rematching is not enabled in this phase.
                  </p>
                </div>
              )}

              {!isAlreadyMatched && (
                <>
                  <form
                    onSubmit={searchCandidates}
                    className="mb-4 grid gap-3 md:grid-cols-[150px_150px_1fr_120px]"
                  >
                    <select
                      value={modalSource}
                      onChange={(event) => {
                        const nextSource = event.target.value as Source;
                        setModalSource(nextSource);
                        setSelectedTmdbResult(null);
                        setSelectedTmdbPreview(null);
                        setSelectedAniListResults([]);
                        setSelectedAniListPreviews([]);
                        setIsConfirming(false);
                      }}
                      className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm font-bold text-white outline-none focus:border-cyan-300"
                    >
                      <option value="tmdb">TMDB</option>
                      <option value="anilist">AniList</option>
                    </select>

                    <select
                      value={modalTmdbType}
                      disabled={modalSource !== "tmdb"}
                      onChange={(event) =>
                        setModalTmdbType(event.target.value as TmdbType)
                      }
                      className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm font-bold text-white outline-none disabled:text-zinc-600 focus:border-cyan-300"
                    >
                      <option value="tv">TV</option>
                      <option value="movie">Movie</option>
                    </select>

                    <input
                      value={modalQuery}
                      onChange={(event) => setModalQuery(event.target.value)}
                      className="min-w-0 rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm font-bold text-white outline-none focus:border-cyan-300"
                    />

                    <button
                      disabled={isSearching || !modalQuery.trim()}
                      className="rounded-lg bg-white px-4 py-2 text-sm font-black text-black disabled:bg-zinc-800 disabled:text-zinc-500"
                    >
                      {isSearching ? "Searching..." : "Search"}
                    </button>
                  </form>

                  {modalError && (
                    <div className="mb-4 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm font-bold text-red-200">
                      {modalError}
                    </div>
                  )}

                  {modalSuccess && (
                    <div className="mb-4 rounded-lg border border-emerald-900 bg-emerald-950/40 p-3 text-sm font-bold text-emerald-200">
                      {modalSuccess}
                    </div>
                  )}

                  <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                    <section className="space-y-3">
                      {!isSearching && modalResults.length === 0 && (
                        <div className="rounded-lg border border-zinc-800 bg-black p-5 text-sm font-bold text-zinc-400">
                          Search results will appear here.
                        </div>
                      )}

                      {modalResults.map((result) => {
                        const isSelected =
                          result.source === "tmdb"
                            ? selectedTmdbResult?.id === result.id
                            : selectedAniListResults.some(
                                (item) => item.id === result.id
                              );

                        return (
                          <div
                            key={`${result.source}-${result.id}`}
                            className={`grid gap-4 rounded-lg border p-4 sm:grid-cols-[78px_1fr_110px] ${
                              isSelected
                                ? "border-cyan-300 bg-cyan-950/20"
                                : "border-zinc-800 bg-black"
                            }`}
                          >
                            {resultPoster(result) ? (
                              <img
                                src={resultPoster(result) || ""}
                                alt={resultTitle(result)}
                                className="h-28 w-20 rounded-md object-cover"
                              />
                            ) : (
                              <div className="h-28 w-20 rounded-md bg-zinc-900" />
                            )}

                            <div className="min-w-0">
                              <p className="font-black text-white">
                                {resultTitle(result)}
                              </p>
                              <p className="mt-1 text-xs font-bold text-zinc-500">
                                {result.source === "tmdb"
                                  ? [
                                      result.original_title,
                                      result.year,
                                      result.tmdb_type.toUpperCase(),
                                    ]
                                      .filter(Boolean)
                                      .join(" / ")
                                  : [
                                      result.native_title || result.romaji_title,
                                      result.season_year,
                                      result.format,
                                    ]
                                      .filter(Boolean)
                                      .join(" / ")}
                              </p>
                              <p className="mt-1 text-xs font-bold text-cyan-300">
                                Score:{" "}
                                {numberLabel(
                                  result.source === "tmdb"
                                    ? result.score
                                    : result.average_score
                                )}{" "}
                                {result.source === "anilist" &&
                                  ` / Episodes: ${numberLabel(result.episodes)}`}
                              </p>
                              <p className="mt-2 line-clamp-3 text-sm text-zinc-400">
                                {result.source === "tmdb"
                                  ? result.overview || "No overview available."
                                  : result.description ||
                                    result.romaji_title ||
                                    "No description available."}
                              </p>
                            </div>

                            <button
                              type="button"
                              disabled={isLoadingDetails || isSaving}
                              onClick={() => selectCandidate(result)}
                              className="h-10 rounded-lg bg-white px-3 py-2 text-sm font-black text-black disabled:bg-zinc-800 disabled:text-zinc-500"
                            >
                              {result.source === "anilist" && isSelected
                                ? "Remove"
                                : isSelected
                                ? "Selected"
                                : "Select"}
                            </button>
                          </div>
                        );
                      })}
                    </section>

                    <aside className="space-y-4">
                      <section className="rounded-lg border border-zinc-800 bg-black p-4">
                        <h3 className="text-lg font-black">Selected Details</h3>

                        {isLoadingDetails && (
                          <p className="mt-3 text-sm font-bold text-zinc-400">
                            Loading details...
                          </p>
                        )}

                        {!isLoadingDetails &&
                          !selectedTmdbPreview &&
                          selectedAniListPreviews.length === 0 && (
                          <p className="mt-3 text-sm font-bold text-zinc-400">
                            Select a result to load details.
                          </p>
                        )}

                        {!isLoadingDetails && selectedTmdbPreview && (
                          <div className="mt-3 space-y-3 text-sm">
                            {resultPoster(selectedTmdbPreview) && (
                              <img
                                src={resultPoster(selectedTmdbPreview) || ""}
                                alt={resultTitle(selectedTmdbPreview)}
                                className="h-40 w-28 rounded-md object-cover"
                              />
                            )}
                            <p className="text-lg font-black">
                              {resultTitle(selectedTmdbPreview)}
                            </p>

                            {selectedTmdbPreview.tmdb_type === "tv" && (
                                <>
                                  <p className="text-zinc-400">
                                    {selectedTmdbPreview.overview ||
                                      "No overview available."}
                                  </p>
                                  <p className="font-bold text-cyan-300">
                                    {selectedTmdbPreview.total_seasons} seasons /{" "}
                                    {selectedTmdbPreview.total_episodes} episodes
                                  </p>
                                  <div className="max-h-52 space-y-1 overflow-auto pr-1">
                                    {selectedTmdbPreview.seasons
                                      .filter((season) => season.season_number > 0)
                                      .map((season) => (
                                        <div
                                          key={season.season_number}
                                          className="flex justify-between gap-3 rounded border border-zinc-900 px-2 py-1 text-xs font-bold text-zinc-400"
                                        >
                                          <span>
                                            S{season.season_number}:{" "}
                                            {season.title || "Untitled"}
                                          </span>
                                          <span>{season.episode_count}</span>
                                        </div>
                                      ))}
                                  </div>
                                </>
                              )}

                            {selectedTmdbPreview.tmdb_type === "movie" && (
                                <>
                                  <p className="text-zinc-400">
                                    {selectedTmdbPreview.overview ||
                                      "No overview available."}
                                  </p>
                                  <p className="font-bold text-cyan-300">
                                    Released:{" "}
                                    {selectedTmdbPreview.release_date || "-"} / Runtime:{" "}
                                    {numberLabel(selectedTmdbPreview.runtime)} min
                                  </p>
                                </>
                              )}
                          </div>
                        )}

                        {!isLoadingDetails &&
                          selectedAniListPreviews.length > 0 && (
                            <div className="mt-3 space-y-3 text-sm">
                              {selectedAniListPreviews.map((preview, index) => (
                                <div
                                  key={preview.id}
                                  className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-black text-white">
                                        {resultTitle(preview)}
                                      </p>
                                      <p className="mt-1 font-bold text-cyan-300">
                                        Season {index + 1} -{" "}
                                        {numberLabel(preview.episodes)} Episodes
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeAniListSelection(preview.id)
                                      }
                                      className="rounded border border-red-900 px-2 py-1 text-xs font-bold text-red-200"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                  <div className="mt-2 space-y-1 text-zinc-300">
                                    <p>English: {preview.titles.english || "-"}</p>
                                    <p>Romaji: {preview.titles.romaji || "-"}</p>
                                    <p>Native: {preview.titles.native || "-"}</p>
                                    <p>Format: {preview.format || "-"}</p>
                                    <p>Status: {preview.status || "-"}</p>
                                    <p>Duration: {numberLabel(preview.duration)} min</p>
                                    <p>Year: {preview.season_year || "-"}</p>
                                    <p>
                                      Studios:{" "}
                                      {preview.studios.length
                                        ? preview.studios.join(", ")
                                        : "-"}
                                    </p>
                                    <p>
                                      Genres:{" "}
                                      {preview.genres.length
                                        ? preview.genres.join(", ")
                                        : "-"}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              <div className="rounded-lg border border-cyan-900 bg-cyan-950/20 p-3 font-black text-cyan-200">
                                Total Episodes -{" "}
                                {numberLabel(
                                  selectedAniListPreviews.reduce(
                                    (total, preview) =>
                                      total + (preview.episodes || 0),
                                    0
                                  )
                                )}
                              </div>
                            </div>
                          )}
                      </section>

                      {selectedTmdbPreview?.source === "tmdb" &&
                        selectedTmdbPreview.tmdb_type === "tv" && (
                          <section className="rounded-lg border border-zinc-800 bg-black p-4">
                            <h3 className="text-lg font-black">
                              What do you own?
                            </h3>

                            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                              <div className="rounded border border-zinc-900 bg-zinc-950 p-2">
                                <p className="font-bold uppercase text-zinc-500">
                                  Official Seasons
                                </p>
                                <p className="mt-1 font-black text-white">
                                  {numberLabel(tmdbTvSeasons().length)}
                                </p>
                              </div>
                              <div className="rounded border border-zinc-900 bg-zinc-950 p-2">
                                <p className="font-bold uppercase text-zinc-500">
                                  Official Episodes
                                </p>
                                <p className="mt-1 font-black text-white">
                                  {numberLabel(officialEpisodeCount())}
                                </p>
                              </div>
                              <div className="rounded border border-zinc-900 bg-zinc-950 p-2">
                                <p className="font-bold uppercase text-zinc-500">
                                  Owned Selected
                                </p>
                                <p className="mt-1 font-black text-cyan-300">
                                  {numberLabel(ownedEpisodeKeys.size)}
                                </p>
                              </div>
                            </div>

                            <label className="mt-4 flex items-center gap-3 rounded-lg border border-zinc-900 bg-zinc-950 p-3 text-sm font-bold text-zinc-200">
                              <IndeterminateCheckbox
                                checked={
                                  officialEpisodeCount() > 0 &&
                                  ownedEpisodeKeys.size === officialEpisodeCount()
                                }
                                indeterminate={
                                  ownedEpisodeKeys.size > 0 &&
                                  ownedEpisodeKeys.size < officialEpisodeCount()
                                }
                                onChange={toggleAllEpisodes}
                              />
                              <span>Select All Episodes</span>
                            </label>

                            <div className="mt-4 rounded-lg border border-zinc-900 bg-zinc-950 p-3">
                              <p className="text-sm font-black">
                                Absolute Episode Range
                              </p>
                              <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
                                <input
                                  value={rangeFrom}
                                  onChange={(event) =>
                                    setRangeFrom(event.target.value)
                                  }
                                  inputMode="numeric"
                                  placeholder="From"
                                  className="min-w-0 rounded border border-zinc-700 bg-black px-2 py-2 text-sm font-bold text-white outline-none focus:border-cyan-300"
                                />
                                <input
                                  value={rangeTo}
                                  onChange={(event) =>
                                    setRangeTo(event.target.value)
                                  }
                                  inputMode="numeric"
                                  placeholder="To"
                                  className="min-w-0 rounded border border-zinc-700 bg-black px-2 py-2 text-sm font-bold text-white outline-none focus:border-cyan-300"
                                />
                                <button
                                  type="button"
                                  onClick={selectAbsoluteRange}
                                  className="rounded bg-white px-3 py-2 text-xs font-black text-black"
                                >
                                  Select Range
                                </button>
                              </div>
                              <p className="mt-2 text-xs font-bold text-zinc-500">
                                Normal episodes available for absolute numbering:{" "}
                                {numberLabel(normalEpisodeCount())}
                              </p>
                              {rangeError && (
                                <p className="mt-2 text-xs font-bold text-red-300">
                                  {rangeError}
                                </p>
                              )}
                              {rangeFirst && rangeLast && (
                                <div className="mt-3 space-y-1 text-xs font-bold text-zinc-300">
                                  <p>
                                    Selected Owned Episodes:{" "}
                                    {numberLabel(ownedEpisodeKeys.size)}
                                  </p>
                                  <p>
                                    First: Absolute {rangeFirst.absolute} - Season{" "}
                                    {rangeFirst.seasonNumber} Episode{" "}
                                    {rangeFirst.episodeNumber} -{" "}
                                    {episodeDisplayTitle(rangeFirst)}
                                  </p>
                                  <p>
                                    Last: Absolute {rangeLast.absolute} - Season{" "}
                                    {rangeLast.seasonNumber} Episode{" "}
                                    {rangeLast.episodeNumber} -{" "}
                                    {episodeDisplayTitle(rangeLast)}
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="mt-4 max-h-96 space-y-2 overflow-auto pr-1">
                              {tmdbTvSeasons()
                                .slice()
                                .sort(
                                  (first, second) =>
                                    first.season_number - second.season_number
                                )
                                .map((season) => {
                                  const episodeCount = season.episode_count || 0;
                                  const keys = Array.from(
                                    { length: episodeCount },
                                    (_, index) =>
                                      episodeKey(season.season_number, index + 1)
                                  );
                                  const selectedCount = keys.filter((key) =>
                                    ownedEpisodeKeys.has(key)
                                  ).length;
                                  const isExpanded = expandedSeasonNumbers.has(
                                    season.season_number
                                  );
                                  const details =
                                    seasonEpisodes[season.season_number];

                                  return (
                                    <div
                                      key={season.season_number}
                                      className="rounded-lg border border-zinc-900 bg-zinc-950"
                                    >
                                      <div className="flex items-center gap-3 p-3">
                                        <IndeterminateCheckbox
                                          checked={
                                            episodeCount > 0 &&
                                            selectedCount === episodeCount
                                          }
                                          indeterminate={
                                            selectedCount > 0 &&
                                            selectedCount < episodeCount
                                          }
                                          disabled={episodeCount === 0}
                                          onChange={() =>
                                            toggleSeasonOwned(
                                              season.season_number,
                                              episodeCount
                                            )
                                          }
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            toggleSeasonExpanded(
                                              season.season_number
                                            )
                                          }
                                          className="min-w-0 flex-1 text-left"
                                        >
                                          <span className="block truncate text-sm font-black text-white">
                                            Season {season.season_number} -{" "}
                                            {season.title || "Untitled"}
                                          </span>
                                          <span className="block text-xs font-bold text-zinc-500">
                                            {numberLabel(episodeCount)} Episodes
                                            {" / "}
                                            {numberLabel(selectedCount)} Owned
                                          </span>
                                        </button>
                                      </div>

                                      {isExpanded && (
                                        <div className="border-t border-zinc-900 p-2">
                                          {loadingSeasonNumber ===
                                            season.season_number && (
                                            <p className="p-2 text-xs font-bold text-zinc-500">
                                              Loading episodes...
                                            </p>
                                          )}

                                          {details?.episodes.map((episode) => {
                                            const key = episodeKey(
                                              season.season_number,
                                              episode.episode_number
                                            );

                                            return (
                                              <label
                                                key={key}
                                                className="flex items-start gap-3 rounded px-2 py-2 text-xs font-bold text-zinc-300 hover:bg-black"
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={ownedEpisodeKeys.has(
                                                    key
                                                  )}
                                                  onChange={() =>
                                                    toggleEpisodeOwned(
                                                      season.season_number,
                                                      episode.episode_number
                                                    )
                                                  }
                                                  className="mt-0.5 h-4 w-4 accent-cyan-300"
                                                />
                                                <span>
                                                  Episode {episode.episode_number}
                                                  {" - "}
                                                  {episode.title || "Untitled"}
                                                </span>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          </section>
                        )}

                      <section className="rounded-lg border border-zinc-800 bg-black p-4">
                        <h3 className="text-lg font-black">Save Match</h3>
                        {(selectedTmdbPreview ||
                          selectedAniListPreviews.length > 0) && (
                          <p className="mt-2 text-sm font-bold text-zinc-300">
                            {activeItem.local_title} -&gt;{" "}
                            {selectedTmdbPreview
                              ? resultTitle(selectedTmdbPreview)
                              : selectedAniListPreviews
                                  .map(resultTitle)
                                  .join(" + ")}
                          </p>
                        )}

                        {!isConfirming && (
                          <button
                            type="button"
                            disabled={
                              (!selectedTmdbPreview &&
                                selectedAniListPreviews.length === 0) ||
                              isSaving
                            }
                            onClick={() => setIsConfirming(true)}
                            className="mt-4 w-full rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-black disabled:bg-zinc-800 disabled:text-zinc-500"
                          >
                            Match & Save
                          </button>
                        )}

                        {isConfirming && (
                          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                            <p className="text-sm font-bold text-zinc-300">
                              Confirm saving this match?
                            </p>
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => setIsConfirming(false)}
                                className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-black text-white disabled:text-zinc-600"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={confirmSave}
                                className="flex-1 rounded-lg bg-white px-3 py-2 text-sm font-black text-black disabled:bg-zinc-800 disabled:text-zinc-500"
                              >
                                {isSaving ? "Saving..." : "Confirm Save"}
                              </button>
                            </div>
                          </div>
                        )}
                      </section>
                    </aside>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import AddGameModal from "@/components/games/AddGameModal";
import EditGameModal from "@/components/games/EditGameModal";
import LongPressGameCard from "@/components/games/LongPressGameCard";
import AuthButton from "@/components/admin/AuthButton";
import SafeImage from "@/components/SafeImage";
import {
  formatHours,
  getIcon,
} from "@/lib/gameHelpers";
import { mapDbGameToUiGame } from "@/lib/gameMappers";
import type { DbGame, UiGame } from "@/lib/gameTypes";
import type { GamesLiteData } from "@/lib/server/gamesLite";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const PAGE_SIZE = 24;

type FilterOptions = {
  stores: string[];
  years: string[];
  completionYears: string[];
  genres: string[];
};

type AllGamesFilters = {
  search: string;
  status: string;
  store: string;
  release: string;
  completion: string;
  genre: string;
  sort: string;
  page: number;
};

const DEFAULT_FILTERS: AllGamesFilters = {
  search: "",
  status: "All",
  store: "All",
  release: "All",
  completion: "All",
  genre: "All",
  sort: "default",
  page: 1,
};

type GamesLiteResponse = {
  games?: DbGame[];
  total?: number;
  totalPages?: number;
  filters?: FilterOptions;
  stats?: {
    total_games: number;
    completed_games: number;
    total_hours: number;
    avg_score: number;
  };
};

function readFiltersFromSearchParams(searchParams: {
  get(name: string): string | null;
}): AllGamesFilters {
  const page = Number(searchParams.get("page") || 1);

  return {
    search: searchParams.get("search") ?? DEFAULT_FILTERS.search,
    status: searchParams.get("status") ?? DEFAULT_FILTERS.status,
    store: searchParams.get("store") ?? DEFAULT_FILTERS.store,
    release: searchParams.get("release") ?? DEFAULT_FILTERS.release,
    completion: searchParams.get("completion") ?? DEFAULT_FILTERS.completion,
    genre: searchParams.get("genre") ?? DEFAULT_FILTERS.genre,
    sort: searchParams.get("sort") ?? DEFAULT_FILTERS.sort,
    page: Number.isFinite(page) && page > 0 ? page : DEFAULT_FILTERS.page,
  };
}

function buildAllGamesQueryParams(
  filters: AllGamesFilters,
  options: { includePageSize?: boolean } = {}
) {
  const params = new URLSearchParams();

  if (options.includePageSize) {
    params.set("pageSize", String(PAGE_SIZE));
  }

  params.set("page", String(filters.page));

  if (filters.search) params.set("search", filters.search);
  if (filters.status !== "All") params.set("status", filters.status);
  if (filters.store !== "All") params.set("store", filters.store);
  if (filters.release !== "All") params.set("release", filters.release);
  if (filters.completion !== "All") params.set("completion", filters.completion);
  if (filters.genre !== "All") params.set("genre", filters.genre);
  if (filters.sort !== "default") params.set("sort", filters.sort);

  if (!options.includePageSize && filters.page <= 1) {
    params.delete("page");
  }

  return params;
}

function scoreClass(score?: string | number | null) {
  const value = Number(score || 0);

  if (value >= 76) return "bg-emerald-400 text-black";
  if (value >= 60) return "bg-yellow-400 text-black";
  if (value > 0) return "bg-red-400 text-black";

  return "bg-zinc-800 text-zinc-400";
}

function hasGoldenAchievement(game: UiGame) {
  return (
    game.achievement_badge === "platinum" ||
    game.achievement_badge === "100completion"
  );
}

function AllGamesContent({
  initialData,
  initialFilters,
}: {
  initialData: GamesLiteData;
  initialFilters: AllGamesFilters;
}) {
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestAbortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const [filters, setFilters] = useState<AllGamesFilters>(initialFilters);
  const filtersRef = useRef<AllGamesFilters>(initialFilters);

  const [isAdmin, setIsAdmin] = useState(false);
  const [games, setGames] = useState<UiGame[]>(
    initialData.games.map(mapDbGameToUiGame)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [totalGames, setTotalGames] = useState(initialData.total);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    stores: initialData.filters.stores,
    years: initialData.filters.years,
    completionYears: initialData.filters.completionYears,
    genres: initialData.filters.genres,
  });
  const [dashboardStats, setDashboardStats] = useState({
    total_games: initialData.stats.total_games,
    completed_games: initialData.stats.completed_games,
    total_hours: initialData.stats.total_hours,
    avg_score: initialData.stats.avg_score,
  });
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<UiGame | null>(null);
  const [editSignal, setEditSignal] = useState(0);
  const [openActionGameId, setOpenActionGameId] = useState<number | null>(null);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const loadGames = useCallback(async (nextFilters = filtersRef.current) => {
    requestAbortRef.current?.abort();
    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestAbortRef.current = controller;
    requestIdRef.current = requestId;
    setIsLoading(true);

    try {
      const params = buildAllGamesQueryParams(nextFilters, {
        includePageSize: true,
      });
      const response = await fetch(`/api/games-lite?${params.toString()}`, {
        signal: controller.signal,
      });
      const data: GamesLiteResponse = await response.json();

      if (requestId !== requestIdRef.current) return;

      setGames((data.games || []).map(mapDbGameToUiGame));
      setTotalGames(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setFilterOptions(
        data.filters || {
          stores: [],
          years: [],
          completionYears: [],
          genres: [],
        }
      );
      setDashboardStats(
        data.stats || {
          total_games: 0,
          completed_games: 0,
          total_hours: 0,
          avg_score: 0,
        }
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("GAMES LITE API ERROR:", error);
    } finally {
      if (requestId !== requestIdRef.current) return;
      setIsLoading(false);
    }
  }, []);

  const updateFilters = useCallback(
    (
      nextFilters: Partial<AllGamesFilters>,
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
            : DEFAULT_FILTERS.page,
      };
      const query = buildAllGamesQueryParams(mergedFilters).toString();
      const nextUrl = query ? `/all-games?${query}` : "/all-games";

      setFilters(mergedFilters);
      window.history[options.history === "replace" ? "replaceState" : "pushState"](
        null,
        "",
        nextUrl
      );
      loadGames(mergedFilters);
    },
    [filters, loadGames]
  );

  function openEditGame(game: UiGame) {
    setEditingGame(game);
    setEditSignal((value) => value + 1);
  }

  async function deleteGame(gameId: number) {
    const confirmed = confirm("Are you sure you want to delete this game?");

    if (!confirmed) return;

    const response = await fetch(`/api/admin/games/${gameId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      alert("Failed to delete game");
      return;
    }

    await loadGames();
  }

  useEffect(() => {
    function handlePopState() {
      const restoredFilters = readFiltersFromSearchParams(
        new URLSearchParams(window.location.search)
      );

      setFilters(restoredFilters);
      setSearchDraft(restoredFilters.search);
      loadGames(restoredFilters);
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      requestAbortRef.current?.abort();
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [loadGames]);

  useEffect(() => {
    async function checkAdmin() {
      const response = await fetch("/api/admin/me");
      const data = await response.json();
      setIsAdmin(data.isAdmin);
    }

    checkAdmin();
    }, []);

  const dashboard = {
  total: dashboardStats.total_games,
  completed: dashboardStats.completed_games,
  totalHours: Number(dashboardStats.total_hours || 0),
  averageScore: dashboardStats.avg_score,
};

  const stores = filterOptions.stores;
  const years = filterOptions.years;
  const completionYears = filterOptions.completionYears;
  const genres = filterOptions.genres;
  const visibleGames = games;

  return (
    <main
      className="min-h-screen bg-[#070a0f] text-white"
      onClick={() => {
        if (openActionGameId !== null) {
          setOpenActionGameId(null);
        }
      }}
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(250,204,21,0.12),transparent_30%)]" />

      <div className="relative mx-auto max-w-7xl p-4 md:p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="rounded-2xl border border-zinc-800 bg-zinc-950/90 px-4 py-3 text-sm font-black text-white hover:border-cyan-400"
          >
            ← Back
          </button>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/stats"
              className="rounded-2xl border border-zinc-800 bg-zinc-950/90 px-4 py-3 text-sm font-black text-white hover:border-cyan-400"
            >
              Stats
            </Link>

            <Link
              href="/monthly-log"
              className="rounded-2xl border border-zinc-800 bg-zinc-950/90 px-4 py-3 text-sm font-black text-white hover:border-cyan-400"
            >
              Monthly Log
            </Link>

            <Link
              href="/assets"
              className="rounded-2xl border border-zinc-800 bg-zinc-950/90 px-4 py-3 text-sm font-black text-white hover:border-cyan-400"
            >
              Assets
            </Link>

            <AuthButton />
            {isAdmin && <AddGameModal onGameAdded={loadGames} />}
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="rounded-2xl border border-zinc-800 bg-zinc-950/90 px-4 py-3 text-sm font-black text-white md:hidden"
          >
            ☰ Menu
          </button>
        </div>

        {isMobileMenuOpen && (
          <div
  className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 md:hidden"
  onClick={() => setIsMobileMenuOpen(false)}
>
            <div
  className="rounded-3xl border border-zinc-700 bg-zinc-950 p-4"
  onClick={(e) => e.stopPropagation()}
>
              <div className="mb-5 flex items-center justify-between">
                <p className="text-lg font-black text-white">Menu</p>

                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xl font-black text-white"
                >
                  ×
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <Link href="/" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-bold text-white">
                  Home
                </Link>
                <Link href="/stats" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-bold text-white">
                  Stats
                </Link>
                <Link href="/monthly-log" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-bold text-white">
                  Monthly Log
                </Link>
                <Link href="/assets" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-bold text-white">
                  Assets
                </Link>

                {isAdmin && <AddGameModal onGameAdded={loadGames} />}
                <AuthButton />
              </div>
            </div>
          </div>
        )}

        <section className="mb-6 overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.35em] text-cyan-300">
                Experimental Library
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">
                All Games 2.0
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-zinc-400 md:text-base">
                A cleaner, darker, stat-focused version of your game library.
              </p>
            </div>

            <div className="rounded-3xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-4">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-200">
                Results
              </p>
              <p className="mt-1 text-4xl font-black text-cyan-300">
                {totalGames}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total Games" value={dashboard.total} />
          <StatCard label="Completed" value={dashboard.completed} />
          <StatCard label="Hours Played" value={Math.round(dashboard.totalHours).toLocaleString()} />
          <StatCard label="Avg Score" value={dashboard.averageScore || "-"} />
        </section>

        <section className="mb-6 rounded-[2rem] border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            <select
              value={filters.status}
              onChange={(event) => updateFilters({ status: event.target.value })}
              className="rounded-2xl border border-zinc-800 bg-black/70 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
            >
              <option value="All">All Status</option>
              <option value="Playing">Playing</option>
              <option value="Completed">Completed</option>
              <option value="Unplayed">Unplayed</option>
              <option value="Dropped">Dropped</option>
              <option value="Wishlist">Wishlist</option>
            </select>

            <select
              value={filters.store}
              onChange={(event) => updateFilters({ store: event.target.value })}
              className="rounded-2xl border border-zinc-800 bg-black/70 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
            >
              <option value="All">All Stores</option>
              {stores.map((store) => (
                <option key={store} value={store}>
                  {store}
                </option>
              ))}
            </select>

            <select
              value={filters.release}
              onChange={(event) => updateFilters({ release: event.target.value })}
              className="rounded-2xl border border-zinc-800 bg-black/70 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
            >
              <option value="All">Release</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <select
              value={filters.completion}
              onChange={(event) =>
                updateFilters({ completion: event.target.value })
              }
              className="rounded-2xl border border-zinc-800 bg-black/70 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
            >
              <option value="All">Completion</option>
              {completionYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

                        <select
              value={filters.genre}
              onChange={(event) => updateFilters({ genre: event.target.value })}
              className="rounded-2xl border border-zinc-800 bg-black/70 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
            >
              <option value="All">All Genres</option>
              {genres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>

<select
  value={filters.sort}
  onChange={(event) => updateFilters({ sort: event.target.value })}
  className="rounded-2xl border border-zinc-800 bg-black/70 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
>
  <option value="default">Sort</option>
    <option value="score-high">+ Score</option>
<option value="score-low">- Score</option>
  <option value="hours-high">+ Hours</option>
  <option value="hours-low">- Hours</option>
  <option value="completion-newest">Newest Completion</option>
  <option value="completion-oldest">Oldest Completion</option>
    <option value="release-newest">Newest Release</option>
  <option value="release-oldest">Oldest Release</option>

</select>

            <div className="col-span-2 md:col-span-1">
              <input
                value={searchDraft}
                onChange={(event) => {
                  const value = event.target.value;
                  setSearchDraft(value);

                  if (searchDebounceRef.current) {
                    clearTimeout(searchDebounceRef.current);
                  }

                  searchDebounceRef.current = setTimeout(() => {
                    updateFilters({ search: value }, { history: "replace" });
                  }, 350);
                }}
                placeholder="Search games..."
                className="w-full rounded-2xl border border-zinc-800 bg-black/70 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400"
              />
            </div>
          </div>
        </section>

        <section className="relative">
          {isLoading && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center">
              <div className="rounded-full border border-cyan-400/30 bg-zinc-950/90 px-4 py-2 text-xs font-black uppercase tracking-wide text-cyan-300 shadow-xl">
                Updating results...
              </div>
            </div>
          )}

          <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 ${isLoading ? "opacity-70" : ""}`}>
{visibleGames.map((game, index) => {
  const hasGoldenAchievementBadge = hasGoldenAchievement(game);
  const gameId = Number(game.id);
  const canManageGame = isAdmin && Number.isFinite(gameId);
  const actionsOpen = openActionGameId === gameId;

  return (
  <LongPressGameCard
    key={`${game.Title}-${index}`}
    disabled={!canManageGame}
    title={game.Title}
    footer={
      <>
        {Array.from(
          new Set(
            [game.Store, game.Platform, game.Hardware]
              .filter((value): value is string => Boolean(value))
              .map((value) => {
                const icon = getIcon(value);
                return icon ? `${icon}|||${value}` : null;
              })
              .filter((item): item is string => Boolean(item))
          )
        ).map((item) => {
          const [icon, value] = item.split("|||");

          return (
            <Image
              key={icon}
              src={icon}
              alt=""
              title={value}
              width={20}
              height={20}
              sizes="20px"
              className="h-5 w-5 object-contain"
            />
          );
        })}
      </>
    }
    imageUrl={game.Cover}
    onEdit={() => openEditGame(game)}
    onDelete={() => deleteGame(gameId)}
  >
    <div
className={`group relative overflow-hidden rounded-[1.6rem] border bg-zinc-950/90 shadow-xl transition duration-300 hover:-translate-y-1 ${
  hasGoldenAchievementBadge
    ? "border-yellow-400/60 shadow-[0_0_24px_rgba(250,204,21,0.18)] hover:border-yellow-300 hover:shadow-[0_0_42px_rgba(250,204,21,0.38)]"
    : "border-zinc-800 hover:border-cyan-400/70 hover:shadow-cyan-950/40"
}`}  >
    <Link
    href={`/game/${game.id}`}
className="flex h-full md:block"  >
   <div className="relative h-40 w-28 shrink-0 overflow-hidden rounded-l-[1.6rem] bg-zinc-900 md:aspect-[2/3] md:h-auto md:w-auto md:rounded-t-[1.6rem] md:rounded-b-none">            {game.Cover ? (
                  <SafeImage
                    src={game.Cover}
                    alt={game.Title}
                    fill
                    sizes="(min-width: 1024px) 16vw, (min-width: 768px) 25vw, 112px"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl">
                    🎮
                  </div>
                )}


                {Number(game.Score || 0) > 0 && (
  <div className="absolute left-3 top-3 flex items-center gap-2">
    <span
      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-black ${scoreClass(
        game.Score
      )}`}
    >
      {game.Score}
    </span>
  </div>
)}

                {Number(game["Hours Played"] || 0) > 0 && (
                  <div className="absolute bottom-3 right-3 rounded-full border border-cyan-400/40 bg-black/70 px-3 py-1 text-xs font-black text-cyan-300">
                    {formatHours(game["Hours Played"] || 0)}h
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-4 md:block">
                <h3 className="line-clamp-2 h-12 text-base font-black leading-6 text-white md:h-10 md:text-sm md:leading-5">
                  {game.Title}
                </h3>

                <div className="mt-2 flex items-center gap-2 text-xs font-bold text-zinc-400">
                  
                 <div className="flex h-5 items-center gap-2 md:h-6">
  {Array.from(
  new Set(
    [game.Store, game.Platform, game.Hardware]
      .filter((value): value is string => Boolean(value))
      .map((value) => {
        const icon = getIcon(value);
        return icon ? `${icon}|||${value}` : null;
      })
      .filter((item): item is string => Boolean(item))
  )
).map((item) => {
  const [icon, value] = item.split("|||");

  return (
    <Image
      key={icon}
      src={icon}
      alt=""
      width={20}
      height={20}
      sizes="20px"
      className="h-5 w-5 object-contain"
      title={value}
    />
  );
})}
</div>           
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span
className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase ${
  game.Status === "Playing"
    ? "border-blue-400/40 bg-blue-400/10 text-blue-300"
    : game.Status === "Dropped"
      ? "border-red-400/40 bg-red-400/10 text-red-300"
      : game.Status === "Completed"
        ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
        : game.Status === "Unplayed"
          ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-300"
          : game.Status === "Wishlist"
            ? "border-purple-500/40 bg-purple-500/10 text-purple-300"
            : "border-zinc-800 bg-black/60 text-zinc-400"
}`}
>
  {game.Status || "-"}
</span>

                </div>
              </div>
            </Link>
            {canManageGame && (
              <>
                {actionsOpen && (
                  <button
                    type="button"
                    aria-label="Close game actions"
                    className="fixed inset-0 z-20 cursor-default bg-transparent"
                    onClick={() => setOpenActionGameId(null)}
                  />
                )}

                <div className="absolute bottom-3 right-3 z-30">
                  <button
                    type="button"
                    aria-expanded={actionsOpen}
                    aria-label={`Actions for ${game.Title}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setOpenActionGameId(actionsOpen ? null : gameId);
                    }}
                    className={`flex h-9 w-9 items-center justify-center transition ${
                      actionsOpen
                        ? "text-cyan-300 opacity-100"
                        : "text-zinc-500 opacity-60 hover:text-cyan-300 hover:opacity-100 md:opacity-0 md:group-hover:opacity-60 md:hover:opacity-100"
                    }`}
                  >
                    <span className="flex flex-col items-center gap-0.5" aria-hidden="true">
                      <span className="h-1 w-1 rounded-full bg-current" />
                      <span className="h-1 w-1 rounded-full bg-current" />
                      <span className="h-1 w-1 rounded-full bg-current" />
                    </span>
                  </button>

                  {actionsOpen && (
                    <div
                      className="absolute bottom-11 right-0 w-36 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setOpenActionGameId(null);
                          openEditGame(game);
                        }}
                        className="block w-full border-b border-zinc-800 px-4 py-3 text-left text-xs font-black text-white hover:bg-zinc-900"
                      >
                        Edit Game
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setOpenActionGameId(null);
                          deleteGame(gameId);
                        }}
                        className="block w-full px-4 py-3 text-left text-xs font-black text-red-400 hover:bg-zinc-900"
                      >
                        Delete Game
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
            </div>
          </LongPressGameCard>
  );
})}
          </div>
        </section>

        {isAdmin && editingGame && (
          <EditGameModal
            key={`${editingGame.id}-${editSignal}`}
            game={editingGame}
            onGameUpdated={() => {
              setEditingGame(null);
              loadGames();
            }}
            openSignal={editSignal}
            hideButton
          />
        )}

        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            onClick={() =>
              updateFilters(
                { page: Math.max(1, filters.page - 1) },
                { resetPage: false }
              )
            }
            disabled={filters.page === 1}
            className="rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-3 text-sm font-black text-white disabled:opacity-30"
          >
            ← Prev
          </button>

          <span className="text-sm font-bold text-zinc-400">
            Page {filters.page} of {totalPages}
          </span>

          <button
            onClick={() =>
              updateFilters(
                { page: Math.min(totalPages, filters.page + 1) },
                { resetPage: false }
              )
            }
            disabled={filters.page === totalPages}
            className="rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-3 text-sm font-black text-white disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      </div>
    </main>
  );
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

export default function AllGamesClient({
  initialData,
  initialFilters,
}: {
  initialData: GamesLiteData;
  initialFilters: AllGamesFilters;
}) {
  return <AllGamesContent initialData={initialData} initialFilters={initialFilters} />;
}

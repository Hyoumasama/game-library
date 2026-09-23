"use client";

import AppNav from "@/components/AppNav";
import {
  ActiveFilterChips,
  GameFilterControls,
  useGameFilters,
} from "@/components/games/GameFilters";
import LongPressGameCard from "@/components/games/LongPressGameCard";
import SafeImage from "@/components/SafeImage";
import {
  DEFAULT_GAME_FILTERS,
  buildGameFilterQueryParams,
  readFiltersFromSearchParams,
  type GameFilterOptions,
  type GameFilters,
} from "@/lib/gameFilters";
import {
  formatHours,
  getIcon,
} from "@/lib/gameHelpers";
import { mapDbGameToUiGame } from "@/lib/gameMappers";
import type { DbGame, UiGame } from "@/lib/gameTypes";
import type { GamesLiteData } from "@/lib/server/gamesLite";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useIsAdmin } from "@/lib/useAdminStatus";

// Only admins ever open this modal, so keep it out of everyone else's
// initial JS bundle.
const EditGameModal = dynamic(() => import("@/components/games/EditGameModal"), {
  ssr: false,
});

const PAGE_SIZE = 24;

type GamesLiteResponse = {
  games?: DbGame[];
  total?: number;
  totalPages?: number;
  filters?: GameFilterOptions;
  stats?: {
    total_games: number;
    completed_games: number;
    total_hours: number;
    avg_score: number;
  };
};

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
  initialFilters?: GameFilters;
}) {
  const [safeInitialFilters] = useState<GameFilters>(
    () =>
      initialFilters ||
      (typeof window === "undefined"
        ? DEFAULT_GAME_FILTERS
        : readFiltersFromSearchParams(new URLSearchParams(window.location.search)))
  );
  const requestAbortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const filtersRef = useRef<GameFilters>(safeInitialFilters);

  const isAdmin = useIsAdmin();
  const [games, setGames] = useState<UiGame[]>(
    initialData.games.map(mapDbGameToUiGame)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [totalGames, setTotalGames] = useState(initialData.total);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);
  const [filterOptions, setFilterOptions] = useState<GameFilterOptions>({
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
  const [editingGame, setEditingGame] = useState<UiGame | null>(null);
  const [editSignal, setEditSignal] = useState(0);
  const [openActionGameId, setOpenActionGameId] = useState<number | null>(null);

  const loadGames = useCallback(async (nextFilters = filtersRef.current) => {
    requestAbortRef.current?.abort();
    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestAbortRef.current = controller;
    requestIdRef.current = requestId;
    setIsLoading(true);

    try {
      const params = buildGameFilterQueryParams(nextFilters, {
        pageSize: PAGE_SIZE,
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

  const filterState = useGameFilters({
    basePath: "/all-games",
    initialFilters: safeInitialFilters,
    onFiltersChange: loadGames,
  });
  const { filters, updateFilters, openFilterMenu, setOpenFilterMenu } =
    filterState;

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

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
    return () => {
      requestAbortRef.current?.abort();
    };
  }, []);

  const dashboard = {
  total: dashboardStats.total_games,
  completed: dashboardStats.completed_games,
  totalHours: Number(dashboardStats.total_hours || 0),
  averageScore: dashboardStats.avg_score,
};

  const visibleGames = games;

  return (
    <main
      className="min-h-screen bg-[#070a0f] text-white"
      onClick={() => {
        if (openActionGameId !== null) {
          setOpenActionGameId(null);
        }
        if (openFilterMenu) {
          setOpenFilterMenu(null);
        }
      }}
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(250,204,21,0.12),transparent_30%)]" />

      <div className="relative mx-auto max-w-7xl p-4 md:p-8">
        <AppNav onGameAdded={loadGames} />

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

          <ActiveFilterChips state={filterState} />
        </section>

        <section className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total Games" value={dashboard.total} />
          <StatCard label="Completed" value={dashboard.completed} />
          <StatCard label="Hours Played" value={Math.round(dashboard.totalHours).toLocaleString()} />
          <StatCard label="Avg Score" value={dashboard.averageScore || "-"} />
        </section>

        <GameFilterControls state={filterState} options={filterOptions} />

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
                    preload={index === 0}
                    loading={index === 0 ? "eager" : "lazy"}
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

                {game.completed_elsewhere && (game.Status === "Unplayed" || game.Status === "Dropped") && (
                  (() => {
                    const locs = game.completed_elsewhere_locations || [];
                    const seen = new Set<string>();
                    const icons: { src: string | null; label: string }[] = [];

                    for (const loc of locs) {
                      const identity = (loc.store || loc.platform || loc.hardware || "").trim();
                      if (!identity) continue;
                      const key = identity.toLowerCase();
                      if (seen.has(key)) continue;
                      seen.add(key);
                      const icon = getIcon(identity) || null;
                      icons.push({ src: icon, label: identity });
                      if (icons.length >= 4) break;
                    }

                    const display = icons.slice(0, 2);
                    const remainder = Math.max(0, icons.length - display.length);

                    const title = (locs || [])
                      .map((l) => [l.platform, l.hardware, l.store].filter(Boolean).join(" "))
                      .filter(Boolean)
                      .slice(0, 6)
                      .join(" and ") || "Previously completed elsewhere";

                    return (
                      <div
                        title={title}
                        aria-label={title}
                        className="absolute right-3 top-3 z-40"
                      >
                        <div className="flex items-center whitespace-nowrap rounded-full bg-black/60 backdrop-blur-sm border border-cyan-400/20 px-2 py-1 text-xs shadow-sm text-zinc-100" style={{height: 30}}>
                          <span className="mr-2 text-cyan-300 font-black">✓</span>

                          <div className="flex items-center gap-1">
                            {display.map((it, idx) => (
                              it.src ? (
                                <img key={it.label} src={it.src} alt={it.label} title={it.label} className={idx === 1 ? "hidden md:inline-block h-4 w-4 object-contain" : "h-4 w-4 object-contain"} />
                              ) : (
                                <span key={it.label} className={idx === 1 ? "hidden md:inline-block text-xs text-zinc-200" : "text-xs text-zinc-200"}>{it.label}</span>
                              )
                            ))}

                            {remainder > 0 && (
                              <span className="ml-1 text-xs text-zinc-300">+{remainder}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()
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
    : game.Status === "Skipped"
      ? "border-zinc-500/40 bg-zinc-500/10 text-zinc-300"
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
  initialFilters?: GameFilters;
}) {
  return <AllGamesContent initialData={initialData} initialFilters={initialFilters} />;
}

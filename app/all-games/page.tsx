"use client";

import AddGameModal from "@/components/games/AddGameModal";
import EditGameModal from "@/components/games/EditGameModal";
import LongPressGameCard from "@/components/games/LongPressGameCard";
import AuthButton from "@/components/admin/AuthButton";
import {
  formatHours,
  getCompletionDate,
  getIcon,
  getYearFromDate,
} from "@/lib/gameHelpers";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
type FilterOptions = {
  stores: string[];
  years: string[];
  completionYears: string[];
  genres: string[];
};
type Game = {
  id?: number | string;
  Title: string;
  Score?: string | number;
  Status?: string;
  Platform?: string;
  Store?: string;
  Hardware?: string;
  Genre?: string;
    genres?: string[];
  Release?: string;
  "Hours Played"?: string | number;
  Price?: string | number;
  "Date of Purchase"?: string;
  "Completion Last Played"?: string;
  "Completion / Last Played"?: string;
  Cover?: string;
    achievement_badge?: "100completion" | "platinum" | null;
};

function scoreClass(score?: string | number) {
  const value = Number(score || 0);

  if (value >= 76) return "bg-emerald-400 text-black";
  if (value >= 60) return "bg-yellow-400 text-black";
  if (value > 0) return "bg-red-400 text-black";

  return "bg-zinc-800 text-zinc-400";
}

function AllGamesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalGames, setTotalGames] = useState(0);
const [totalPages, setTotalPages] = useState(1);

const [filterOptions, setFilterOptions] = useState<FilterOptions>({
  stores: [],
  years: [],
  completionYears: [],
  genres: [],
});
const [dashboardStats, setDashboardStats] = useState({
  total_games: 0,
  completed_games: 0,
  total_hours: 0,
  avg_score: 0,
});

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [storeFilter, setStoreFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [completionYearFilter, setCompletionYearFilter] = useState("All");
    const [genreFilter, setGenreFilter] = useState("All");
  const [sortFilter, setSortFilter] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasLoadedFilters, setHasLoadedFilters] = useState(false);

    const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [editSignal, setEditSignal] = useState(0);

  function openEditGame(game: Game) {
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
    router.refresh();
  }

  useEffect(() => {
    const searchValue = searchParams.get("search");
    const status = searchParams.get("status");
    const store = searchParams.get("store");
    const release = searchParams.get("release");
    const completion = searchParams.get("completion");
        const genre = searchParams.get("genre");
    const sort = searchParams.get("sort");
const page = searchParams.get("page");

    setSearch(searchValue ?? "");
setStatusFilter(status ?? "All");
setStoreFilter(store ?? "All");
setYearFilter(release ?? "All");
setCompletionYearFilter(completion ?? "All");
setGenreFilter(genre ?? "All");
setSortFilter(sort ?? "default");
setCurrentPage(page ? Number(page) : 1);

    setHasLoadedFilters(true);
  }, [searchParams]);

  useEffect(() => {
    if (!hasLoadedFilters) return;

    const params = new URLSearchParams();

    if (search) params.set("search", search);
    if (statusFilter !== "All") params.set("status", statusFilter);
    if (storeFilter !== "All") params.set("store", storeFilter);
    if (yearFilter !== "All") params.set("release", yearFilter);
    if (completionYearFilter !== "All") params.set("completion", completionYearFilter);
        if (genreFilter !== "All") params.set("genre", genreFilter);
    if (sortFilter !== "default") params.set("sort", sortFilter);
if (currentPage > 1) params.set("page", String(currentPage));

    const query = params.toString();

    router.replace(query ? `/all-games?${query}` : "/all-games", {
      scroll: false,
    });
  }, [
    search,
    statusFilter,
    storeFilter,
    yearFilter,
      completionYearFilter,
      genreFilter,
      sortFilter,
  currentPage,
  hasLoadedFilters,
  router,
]);

    async function loadGames() {
      if (!hasLoadedFilters) return;

      try {
        const params = new URLSearchParams();

params.set("page", String(currentPage));
params.set("pageSize", "24");

if (search) params.set("search", search);
if (statusFilter !== "All") params.set("status", statusFilter);
if (storeFilter !== "All") params.set("store", storeFilter);
if (yearFilter !== "All") params.set("release", yearFilter);
if (completionYearFilter !== "All") params.set("completion", completionYearFilter);
if (genreFilter !== "All") params.set("genre", genreFilter);
if (sortFilter !== "default") params.set("sort", sortFilter);

const response = await fetch(`/api/games-lite?${params.toString()}`);
const data = await response.json();
        

        const formattedGames = (data.games || []).map((game: any) => ({
          ...game,
          Title: game.title,
          Store: game.store,
          Platform: game.platform,
          Hardware: game.hardware,
          Genre: game.genre,
                    genres: game.genres || [],
          Score: game.score,
          Status: game.status,
          Price: game.price,
          "Hours Played": game.hours_played,
          Release: game.release,
          "Date of Purchase": game.date_of_purchase,
          "Completion Last Played": game.completion_last_played,
          "Completion / Last Played": game.completion_last_played,
          Cover: game.steam_vertical_cover || game.cover_url,
achievement_badge: game.achievement_badge,
        }));

                setGames(formattedGames);
        setTotalGames(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setFilterOptions(data.filters || {
          stores: [],
          years: [],
          completionYears: [],
          genres: [],
        });
        setDashboardStats(
  data.stats || {
    total_games: 0,
    completed_games: 0,
    total_hours: 0,
    avg_score: 0,
  }
);
      } finally {
        setIsLoading(false);
      }
      }

  useEffect(() => {
    loadGames();
  }, [
    hasLoadedFilters,
    currentPage,
    search,
    statusFilter,
    storeFilter,
    yearFilter,
    completionYearFilter,
    genreFilter,
    sortFilter,
  ]);

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

  const filteredGames = useMemo(() => {
    let filtered = games.filter((game) => {
      const status = game.Status?.trim();
      const title = game.Title || "";
      const releaseYear = getYearFromDate(game.Release || "");
      const completionYear = getYearFromDate(getCompletionDate(game));

      return (
        title.toLowerCase().includes(search.toLowerCase()) &&
        (statusFilter === "All" || status === statusFilter) &&
        (storeFilter === "All" || game.Store === storeFilter) &&
        (yearFilter === "All" || releaseYear === yearFilter) &&
        (completionYearFilter === "All" || completionYear === completionYearFilter) &&
        (genreFilter === "All" || game.genres?.includes(genreFilter))
      );
    });

    const sort = searchParams.get("sort");

    if (sort === "completion-newest") {
      filtered = filtered.sort((a, b) => {
        const dateA = new Date(getCompletionDate(a) || "").getTime();
        const dateB = new Date(getCompletionDate(b) || "").getTime();
        return dateB - dateA;
      });
    }

        if (sort === "release-newest") {
      filtered = filtered.sort((a, b) => {
        const dateA = new Date(a.Release || "").getTime();
        const dateB = new Date(b.Release || "").getTime();
        return dateB - dateA;
      });
    }

    if (sort === "release-oldest") {
      filtered = filtered.sort((a, b) => {
        const dateA = new Date(a.Release || "").getTime();
        const dateB = new Date(b.Release || "").getTime();
        return dateA - dateB;
      });
    }

    return filtered;
    }, [
    hasLoadedFilters,
    currentPage,
    search,
    statusFilter,
    storeFilter,
    yearFilter,
    completionYearFilter,
    genreFilter,
    sortFilter,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, storeFilter, yearFilter, completionYearFilter, genreFilter, sortFilter]);

  const visibleGames = games;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#070a0f] p-4 text-white md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
            Loading Game Library...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070a0f] text-white">
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
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
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
              value={storeFilter}
              onChange={(event) => setStoreFilter(event.target.value)}
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
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
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
              value={completionYearFilter}
              onChange={(event) => setCompletionYearFilter(event.target.value)}
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
              value={genreFilter}
              onChange={(event) => {
                setGenreFilter(event.target.value);
                setCurrentPage(1);
              }}
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
  value={sortFilter}
  onChange={(event) => {
    setSortFilter(event.target.value);
    setCurrentPage(1);
  }}
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
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search games..."
                className="w-full rounded-2xl border border-zinc-800 bg-black/70 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400"
              />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
{visibleGames.map((game, index) => (
  <LongPressGameCard
    key={`${game.Title}-${index}`}
    disabled={!isAdmin || !game.id}
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
            <img
              key={icon}
              src={icon}
              alt=""
              title={value}
              className="h-5 w-5 object-contain"
            />
          );
        })}
      </>
    }
    imageUrl={game.Cover}
    onEdit={() => openEditGame(game)}
    onDelete={() => deleteGame(Number(game.id))}
  >
    <Link
    href={`/game/${game.id}`}
className={`group relative flex overflow-hidden rounded-[1.6rem] border bg-zinc-950/90 shadow-xl transition duration-300 hover:-translate-y-1 md:block ${
  game.achievement_badge
    ? "border-yellow-400/60 shadow-[0_0_24px_rgba(250,204,21,0.18)] hover:border-yellow-300 hover:shadow-[0_0_42px_rgba(250,204,21,0.38)]"
    : "border-zinc-800 hover:border-cyan-400/70 hover:shadow-cyan-950/40"
}`}  >
   <div className="relative h-40 w-28 shrink-0 overflow-hidden rounded-l-[1.6rem] bg-zinc-900 md:aspect-[2/3] md:h-auto md:w-auto md:rounded-t-[1.6rem] md:rounded-b-none">            {game.Cover ? (
                  <img
                    src={game.Cover}
                    alt={game.Title}
                    loading="lazy"
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
                    {formatHours(game["Hours Played"])}h
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col justify-between p-4 md:block">
                <h3 className="line-clamp-2 h-12 text-base font-black leading-6 text-white md:h-10 md:text-sm md:leading-5">
                  {game.Title}
                </h3>

                <div className="mt-3 flex items-center gap-2 text-xs font-bold text-zinc-400">
                  
                 <div className="mt-1 flex h-5 items-center gap-2 md:mt-3 md:h-6">
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
    <img
      key={icon}
      src={icon}
      alt=""
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
          </LongPressGameCard>
          ))}
        </section>

        {isAdmin && editingGame && (
          <EditGameModal
            game={editingGame}
            onGameUpdated={loadGames}
            openSignal={editSignal}
            hideButton
          />
        )}

        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-3 text-sm font-black text-white disabled:opacity-30"
          >
            ← Prev
          </button>

          <span className="text-sm font-bold text-zinc-400">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
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

export default function AllGames2Page() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#070a0f] text-white" />}>
      <AllGamesContent />
    </Suspense>
  );
}
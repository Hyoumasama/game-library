"use client";

import AddGameModal from "@/components/games/AddGameModal";
import AuthButton from "@/components/admin/AuthButton";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Game = {
  id?: number | string;
  Title: string;
  Score?: string | number;
  Status?: string;
  Platform?: string;
  Store?: string;
  Hardware?: string;
  Genre?: string;
  Release?: string;
  "Hours Played"?: string | number;
  Price?: string | number;
  "Date of Purchase"?: string;
  "Completion Last Played"?: string;
  "Completion / Last Played"?: string;
  Cover?: string;
};

function getCompletionDate(game: Game) {
  return game["Completion Last Played"] || game["Completion / Last Played"] || "";
}

function getYearFromDate(value: string) {
  const match = value?.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : "";
}

function formatHours(hours?: string | number) {
  const value = Number(hours || 0);
  if (!value) return "0";
  return value.toFixed(1).replace(".0", "");
}

function getIcon(value?: string) {
  const text = value?.trim().toLowerCase();

  const icons: Record<string, string> = {
    psn: "/platforms/psn.png",
    steam: "/platforms/steam.png",
    epic: "/platforms/epicgames.png",
    "ubisoft connect": "/platforms/ubisoftconnect.jpeg",
    piracy: "/platforms/piracy.png",
    xbox: "/platforms/xbox.png",
    "ea desktop": "/platforms/eadesktop.ico",
    gog: "/platforms/gog.jpeg",
    nintendo: "/platforms/switch.png",
    switch: "/platforms/switch.png",

    yuzu: "/platforms/yuzu.png",
    citra: "/platforms/citra.png",
    cemu: "/platforms/cemu.png",
    dolphin: "/platforms/dolphin.png",
    retroarch: "/platforms/retroarch2.png",
    ryujinx: "/platforms/ryujinx.png",
    rpcs3: "/platforms/rpcs3.png",
    duckstation: "/platforms/duckstation.png",
    pcsx2: "/platforms/pcsx2.png",
    primehack: "/platforms/primehack.png",
    melonds: "/platforms/melonDS.png",
    xemu: "/platforms/xenia.png",
    ppsspp: "/platforms/ppsspp.png",
    vita3k: "/platforms/vita3k.svg",
    prime: "/platforms/prime.png",
    legacy: "/platforms/legacy.png",
    "humble bundle": "/platforms/humble.png",

    pc: "/hardware/pc.png",
    steamdeck: "/hardware/steamdeck2.png",
    ps3: "/hardware/playstation3.png",
    ps4: "/hardware/playstation4.png",
    ps5: "/hardware/playstation5.png",
  };

  if (!text) return null;

  return icons[text] || null;
}

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

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [storeFilter, setStoreFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [completionYearFilter, setCompletionYearFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasLoadedFilters, setHasLoadedFilters] = useState(false);

  useEffect(() => {
    const searchValue = searchParams.get("search");
    const status = searchParams.get("status");
    const store = searchParams.get("store");
    const release = searchParams.get("release");
    const completion = searchParams.get("completion");

    if (searchValue) setSearch(searchValue);
    if (status) setStatusFilter(status);
    if (store) setStoreFilter(store);
    if (release) setYearFilter(release);
    if (completion) setCompletionYearFilter(completion);

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
    hasLoadedFilters,
    router,
  ]);

  useEffect(() => {
    async function loadGames() {
      try {
        const response = await fetch("/api/games-lite");
        const data = await response.json();
        

        const formattedGames = data.map((game: any) => ({
          ...game,
          Title: game.title,
          Store: game.store,
          Platform: game.platform,
          Hardware: game.hardware,
          Genre: game.genre,
          Score: game.score,
          Status: game.status,
          Price: game.price,
          "Hours Played": game.hours_played,
          Release: game.release,
          "Date of Purchase": game.date_of_purchase,
          "Completion Last Played": game.completion_last_played,
          "Completion / Last Played": game.completion_last_played,
          Cover: game.steam_vertical_cover || game.cover_url,
        }));

        setGames(formattedGames);
      } finally {
        setIsLoading(false);
      }
    }

    loadGames();
  }, []);

  useEffect(() => {
    async function checkAdmin() {
      const response = await fetch("/api/admin/me");
      const data = await response.json();
      setIsAdmin(data.isAdmin);
    }

    checkAdmin();
  }, []);

  const dashboard = useMemo(() => {
    const completed = games.filter((g) => g.Status?.trim() === "Completed").length;
    const playing = games.filter((g) => g.Status?.trim() === "Playing").length;
    const dropped = games.filter((g) => g.Status?.trim() === "Dropped").length;

    const totalHours = games.reduce((sum, game) => {
      return sum + Number(game["Hours Played"] || 0);
    }, 0);

    const averageScoreGames = games.filter((game) => Number(game.Score || 0) > 0);
    const averageScore =
      averageScoreGames.length > 0
        ? Math.round(
            averageScoreGames.reduce((sum, game) => sum + Number(game.Score || 0), 0) /
              averageScoreGames.length
          )
        : 0;

    return {
      total: games.length,
      completed,
      playing,
      dropped,
      totalHours,
      averageScore,
    };
  }, [games]);

  const stores = useMemo(() => {
    const uniqueStores = new Set<string>();

    games.forEach((game) => {
      const store = game.Store?.trim();
      if (store) uniqueStores.add(store);
    });

    return Array.from(uniqueStores).sort();
  }, [games]);

  const years = useMemo(() => {
    const uniqueYears = new Set<string>();

    games.forEach((game) => {
      const year = getYearFromDate(game.Release || "");
      if (year) uniqueYears.add(year);
    });

    return Array.from(uniqueYears).sort((a, b) => Number(b) - Number(a));
  }, [games]);

  const completionYears = useMemo(() => {
    const uniqueYears = new Set<string>();

    games.forEach((game) => {
      const year = getYearFromDate(getCompletionDate(game));
      if (year) uniqueYears.add(year);
    });

    return Array.from(uniqueYears).sort((a, b) => Number(b) - Number(a));
  }, [games]);

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
        (completionYearFilter === "All" || completionYear === completionYearFilter)
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

    return filtered;
  }, [
    games,
    search,
    statusFilter,
    storeFilter,
    yearFilter,
    completionYearFilter,
    searchParams,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, storeFilter, yearFilter, completionYearFilter]);

  const gamesPerPage = 24;
  const totalPages = Math.max(1, Math.ceil(filteredGames.length / gamesPerPage));

  const visibleGames = filteredGames.slice(
    (currentPage - 1) * gamesPerPage,
    currentPage * gamesPerPage
  );

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
            {isAdmin && <AddGameModal />}
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
          <div className="fixed inset-0 z-50 bg-black/80 p-4 md:hidden">
            <div className="rounded-3xl border border-zinc-700 bg-zinc-950 p-4">
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

                {isAdmin && <AddGameModal />}
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
                {filteredGames.length}
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
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
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
            <Link
              key={`${game.Title}-${index}`}
              href={`/game/${game.id}`}
              className="group flex overflow-hidden rounded-[1.6rem] border border-zinc-800 bg-zinc-950/90 shadow-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-400/70 hover:shadow-cyan-950/40 md:block"
              >
              <div className="relative h-40 w-28 shrink-0 overflow-hidden bg-zinc-900 md:aspect-[2/3] md:h-auto md:w-auto">
                {game.Cover ? (
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
  new Map(
    [game.Store, game.Platform, game.Hardware]
      .filter((value): value is string => Boolean(value))
      .map((value): [string, string] | null => {
        const icon = getIcon(value);

        if (!icon) return null;

        return [icon, value];
      })
      .filter((item): item is [string, string] => item !== null)
  )
).map(([icon, value]) => (
  <img
    key={icon}
    src={icon}
    alt=""
    className="h-5 w-5 object-contain"
    title={value}
  />
))}
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
            : "border-zinc-800 bg-black/60 text-zinc-400"
  }`}
>
  {game.Status || "-"}
</span>

                </div>
              </div>
            </Link>
          ))}
        </section>

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
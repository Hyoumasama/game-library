"use client";
import BackButton from "@/components/BackButton";
import { useRouter } from "next/navigation";
import AddGameModal from "@/components/games/AddGameModal";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AuthButton from "@/components/admin/AuthButton";

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
  Hero?: string;
  Summary?: string;
  Developer?: string;
  Publisher?: string;
};

function slugify(title?: string) {
  return (title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getCompletionDate(game: Game) {
  return game["Completion Last Played"] || game["Completion / Last Played"] || "";
}

function getReleaseYear(game: Game) {
  const match = game.Release?.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : "";
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

function getPlatformLogo(platform?: string) {
  const value = platform?.toLowerCase() || "";

  if (value.includes("steam")) return "/platforms/steam.png";
  if (value.includes("epic")) return "/platforms/epicgames.png";
  if (value.includes("psn")) return "/platforms/psn.png";
  if (value.includes("playstation")) return "/platforms/psn.png";
  if (value.includes("xbox")) return "/platforms/xbox.png";
  if (value.includes("switch")) return "/platforms/switch.png";
  if (value.includes("ea desktop")) return "/platforms/eadesktop.ico";

  if (value.includes("pcsx2")) return "/platforms/pcsx2.png";
  if (value.includes("duckstation")) return "/platforms/duckstation.png";
  if (value.includes("rpcs3")) return "/platforms/rpcs3.png";
  if (value.includes("xenia")) return "/platforms/xenia.png";
  if (value.includes("citra")) return "/platforms/citra.png";
  if (value.includes("yuzu")) return "/platforms/yuzu.png";
  if (value.includes("ryujinx")) return "/platforms/ryujinx.png";
  if (value.includes("cemu")) return "/platforms/cemu.png";
  if (value.includes("retroarch")) return "/platforms/retroarch.png";

  if (value.includes("gog")) return "/platforms/gog.jpeg";
  if (value.includes("piracy")) return "/platforms/piracy.png";

  return null;
}
function AllGamesContent() {
  const searchParams = useSearchParams();

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
  const router = useRouter();

  useEffect(() => {
    const status = searchParams.get("status");
    const sort = searchParams.get("sort");

    if (status) {
      setStatusFilter(status);
    }

    if (sort === "completion-newest") {
      setCompletionYearFilter("All");
    }
  }, [searchParams]);
  
  useEffect(() => {
  async function loadGames() {
    try {
      const response = await fetch("/api/games");
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
        Cover: game.cover_url,
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

    console.log("ADMIN ME:", data);

    setIsAdmin(data.isAdmin);
  }

  checkAdmin();
}, []);

  const dashboard = useMemo(() => {
    const completed = games.filter((g) => g.Status?.trim() === "Completed").length;
    const playing = games.filter((g) => g.Status?.trim() === "Playing").length;
    const dropped = games.filter((g) => g.Status?.trim() === "Dropped").length;
    const unplayed = games.filter((g) => g.Status?.trim() === "Unplayed").length;
    const wishlist = games.filter((g) => g.Status?.trim() === "Wishlist").length;

    const totalHours = games.reduce((sum, game) => {
      return sum + Number(game["Hours Played"] || 0);
    }, 0);

    return {
      total: games.length,
      completed,
      playing,
      dropped,
      unplayed,
      wishlist,
      totalHours,
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

    const matchesSearch =
      title.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || status === statusFilter;

    const matchesStore =
      storeFilter === "All" || game.Store === storeFilter;

    const matchesYear =
      yearFilter === "All" || releaseYear === yearFilter;

    const matchesCompletionYear =
      completionYearFilter === "All" ||
      completionYear === completionYearFilter;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesStore &&
      matchesYear &&
      matchesCompletionYear
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

  const gamesPerPage = 20;
  const totalPages = Math.max(1, Math.ceil(filteredGames.length / gamesPerPage));

  const currentlyPlayingGames = useMemo(() => {
    return games
      .filter((game) => game.Status?.trim() === "Playing")
      .sort((a, b) => Number(b["Hours Played"] || 0) - Number(a["Hours Played"] || 0))
      .slice(0, 4);
  }, [games]);

  const visibleGames = filteredGames.slice(
    (currentPage - 1) * gamesPerPage,
    currentPage * gamesPerPage
  );

if (isLoading) {
  return (
    <main className="min-h-screen bg-black p-4 text-white md:p-8">
      Loading Game Library...
    </main>
  );
}
  return (
    <main className="min-h-screen bg-black p-4 text-white md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            

          </div>

          <div className="hidden items-center gap-3 md:flex">
  <button
  type="button"
  onClick={() => window.history.back()}
  className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-bold text-white hover:border-zinc-500"
>
  ← Back
</button>
<Link
    href="/stats"
    className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:border-zinc-500"
  >
    Stats
  </Link>
  <Link
    href="/assets"
    className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:border-zinc-500"
  >
    Assets
  </Link>

  <AuthButton />

  {isAdmin && <AddGameModal />}
</div>
<button
  type="button"
  onClick={() => window.history.back()}
  className="text-sm font-bold text-white md:hidden"
>
  ← Back
</button>
<button
  type="button"
  onClick={() => setIsMobileMenuOpen(true)}
  className="ml-auto rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:border-zinc-500 md:hidden"
>
  ☰ Menu
</button>

{isMobileMenuOpen && (
  <div className="fixed inset-0 z-50 bg-black/70 p-4 md:hidden">
    <div className="rounded-2xl border border-zinc-700 bg-zinc-950 p-4">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-lg font-bold text-white">Menu</p>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(false)}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xl font-bold text-white"
        >
          ×
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <Link
  href="/"
  onClick={() => setIsMobileMenuOpen(false)}
  className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-bold text-white"
>
  Home
</Link>
<Link
  href="/stats"
  className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-bold text-white hover:border-zinc-500"
>
  Stats
</Link>
        <Link
          href="/assets"
          onClick={() => setIsMobileMenuOpen(false)}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-bold text-white"
        >
          Assets
        </Link>

        {isAdmin && <AddGameModal />}

        <AuthButton />
      </div>
    </div>
  </div>
)}
        </div>

                <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <StatCard
            label="Total Hours Played"
            value={Math.round(dashboard.totalHours).toLocaleString()}
          />

          <StatCard label="Search Results" value={filteredGames.length} />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white"
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
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white"
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
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white"
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
  className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white"
>
  <option value="All">Completion</option>
  {completionYears.map((year) => (
    <option key={year} value={year}>
      {year}
    </option>
  ))}
</select>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search games..."
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white"
          />
        </div>

        <section>
          <h2 className="mb-4 text-2xl font-bold">
            {statusFilter === "All" ? "All Games" : statusFilter}
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visibleGames.map((game, index) => (
              <Link
                key={`${game.Title}-${index}`}
                href={`/game/${game.id}`}
                className="group flex overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition hover:-translate-y-1 hover:border-zinc-500"
              >
                <div
                  style={{
                    width: "80px",
                    minWidth: "80px",
                    height: "112px",
                  }}
                  className="overflow-hidden bg-zinc-800"
                >
                  {game.Cover ? (
  <img
    src={game.Cover}
                      alt={game.Title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl">
                      🎮
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center p-4">
                  <h3 className="line-clamp-2 text-sm font-bold leading-5">
                    {game.Title}
                  </h3>

                  <div className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                    {getPlatformLogo(game.Platform) && (
                      <img
                        src={getPlatformLogo(game.Platform)!}
                        alt={game.Platform || ""}
                        style={{
                          width: "18px",
                          height: "18px",
                          maxWidth: "18px",
                          maxHeight: "18px",
                          objectFit: "contain",
                          display: "inline-block",
                        }}
                      />
                    )}

                    <span>{game.Platform || "-"}</span>
                  </div>

                  <p className="mt-1 text-sm text-zinc-500">
                    Score: {game.Score || "-"} | Hours:{" "}
                    {formatHours(game["Hours Played"])}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 disabled:opacity-30"
            >
              ← Prev
            </button>

            <span className="text-zinc-400">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
export default function AllGamesPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#0b0f14] text-white" />}>
      <AllGamesContent />
    </Suspense>
  );
}
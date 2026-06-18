"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";

type Game = {
  Title: string;
  Score: string;
  Status: string;
  Platform: string;
  Store: string;
  "Hours Played": string;
  Price: string;
  "Completion Last Played"?: string;
  "Completion / Last Played"?: string;
};

function slugify(title: string) {
  return title
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
function formatHours(hours: string) {
  const value = Number(hours || 0);

  if (!value) return "0";

  return value.toFixed(1).replace(".0", "");
}
function getPlatformLogo(platform: string) {
  const value = platform?.toLowerCase() || "";

  // Stores
  if (value.includes("steam")) return "/platforms/steam.png";
  if (value.includes("epic")) return "/platforms/epicgames.png";
  if (value.includes("psn")) return "/platforms/psn.png";
  if (value.includes("playstation")) return "/platforms/psn.png";
  if (value.includes("xbox")) return "/platforms/xbox.png";
  if (value.includes("switch")) return "/platforms/switch.png";
  if (value.includes("ea desktop")) return "/platforms/eadesktop.ico";

  // Emulators
  if (value.includes("pcsx2")) return "/platforms/pcsx2.png";
  if (value.includes("duckstation")) return "/platforms/duckstation.png";
  if (value.includes("rpcs3")) return "/platforms/rpcs3.png";
  if (value.includes("xenia")) return "/platforms/xenia.png";
  if (value.includes("citra")) return "/platforms/citra.png";
  if (value.includes("yuzu")) return "/platforms/yuzu.png";
  if (value.includes("ryujinx")) return "/platforms/ryujinx.png";
  if (value.includes("cemu")) return "/platforms/cemu.png";
  if (value.includes("retroarch")) return "/platforms/retroarch.png";

  // Other
  if (value.includes("gog")) return "/platforms/gog.jpeg";
  if (value.includes("piracy")) return "/platforms/piracy.png";

  return null;
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [storeFilter, setStoreFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [coverUrls, setCoverUrls] = useState<Record<string, string | null>>({});

  useEffect(() => {
    fetch("/games.csv")
      .then((response) => response.text())
      .then((text) => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setGames(results.data as Game[]);
          },
        });
      });
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
      const year = getYearFromDate(getCompletionDate(game));
      if (year) uniqueYears.add(year);
    });

    return Array.from(uniqueYears).sort((a, b) => Number(b) - Number(a));
  }, [games]);

  const filteredGames = useMemo(() => {
  return games
    .filter((game) => {
      const status = game.Status?.trim();
      const title = game.Title || "";
      const completionDate = getCompletionDate(game);
      const year = getYearFromDate(completionDate);

      const matchesSearch = title
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || status === statusFilter;

const matchesStore =
  storeFilter === "All" || game.Store?.trim() === storeFilter;

      const matchesYear =
        yearFilter === "All" || year === yearFilter;

      return matchesSearch && matchesStatus && matchesStore && matchesYear;
    })
    .sort((a, b) => {
      const hoursA = Number(a["Hours Played"] || 0);
      const hoursB = Number(b["Hours Played"] || 0);

      return hoursB - hoursA;
    });
}, [games, search, statusFilter, storeFilter, yearFilter]);

  useEffect(() => {
  setCurrentPage(1);
}, [search, statusFilter, storeFilter, yearFilter]);

  const gamesPerPage = 20;

const totalPages = Math.ceil(filteredGames.length / gamesPerPage);

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

  useEffect(() => {
  async function loadCovers() {
    const gamesNeedingCovers = [...currentlyPlayingGames, ...visibleGames];

const missingGames = gamesNeedingCovers.filter(
  (game) => game.Title && coverUrls[game.Title] === undefined
);

    if (missingGames.length === 0) return;

    const results = await Promise.all(
      missingGames.map(async (game) => {
        try {
          const response = await fetch(
            `/api/igdb-cover?title=${encodeURIComponent(game.Title)}&year=${encodeURIComponent(getReleaseYear(game))}`
          );

          const data = await response.json();

          console.log("COVER RESULT:", game.Title, data);

          return [game.Title, data.coverUrl || null] as const;
        } catch (error) {
          console.error("COVER ERROR:", game.Title, error);
          return [game.Title, null] as const;
        }
      })
    );

    setCoverUrls((current) => ({
      ...current,
      ...Object.fromEntries(results),
    }));
  }

  if (visibleGames.length > 0) {
    loadCovers();
  }
}, [
  `${currentlyPlayingGames.map((game) => game.Title).join("|")}::${visibleGames
    .map((game) => game.Title)
    .join("|")}`,
]);

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-4xl font-bold">
          🎮 Nawaf&apos;s Game Library
        </h1>

        <p className="mb-8 text-zinc-400">
          Personal gaming database, playtime tracker, and year-in-review hub.
        </p>

<section className="mb-8">
  <h2 className="mb-4 text-2xl font-bold">Currently Playing</h2>

  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    {currentlyPlayingGames.map((game, index) => (
      <Link
        key={`${game.Title}-${index}`}
        href={`/game/${slugify(game.Title)}`}
        className="group flex overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition hover:-translate-y-1 hover:border-zinc-500"
      >
        <div
          style={{
            width: "130px",
            minWidth: "130px",
            height: "180px",
          }}
          className="overflow-hidden bg-zinc-800"
        >
          {coverUrls[game.Title] ? (
            <img
              src={coverUrls[game.Title] || ""}
              alt={game.Title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl">
              🎮
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-center p-5 min-w-0">
          <h3 className="line-clamp-2 text-xl font-bold leading-6">
            {game.Title}
          </h3>

          <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
            {getPlatformLogo(game.Platform) && (
              <img
                src={getPlatformLogo(game.Platform)!}
                alt={game.Platform}
                style={{
                  width: "24px",
                  height: "24px",
                  objectFit: "contain",
                }}
              />
            )}

            <span>{game.Platform || "-"}</span>
          </div>

          <p className="mt-3 text-sm text-zinc-400">
            Hours: {formatHours(game["Hours Played"])}
          </p>
        </div>
      </Link>
    ))}
  </div>
</section>

        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-6">
          <StatCard label="Total Games" value={dashboard.total} />
          <StatCard label="Completed" value={dashboard.completed} />
          <StatCard label="Playing" value={dashboard.playing} />
          <StatCard label="Unplayed" value={dashboard.unplayed} />
          <StatCard label="Dropped" value={dashboard.dropped} />
          <StatCard label="Wishlist" value={dashboard.wishlist} />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <StatCard
            label="Total Hours Played"
            value={Math.round(dashboard.totalHours).toLocaleString()}
          />

          <StatCard label="Search Results" value={filteredGames.length} />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
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
            <option value="All">All Years</option>
            {years.map((year) => (
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
            {statusFilter === "Playing" ? "Currently Playing" : statusFilter}
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
  {visibleGames.map((game, index) => (
    <Link
      key={`${game.Title}-${index}`}
      href={`/game/${slugify(game.Title)}`}
      className="group flex overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition hover:border-zinc-500 hover:-translate-y-1"
    >
<div
  style={{
    width: "80px",
    minWidth: "80px",
    height: "112px",
  }}
  className="overflow-hidden bg-zinc-800"
>  {coverUrls[game.Title] ? (
    <img
      src={coverUrls[game.Title] || ""}
      alt={game.Title}
      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center text-3xl">
      🎮
    </div>
  )}
</div>

      <div className="flex flex-1 flex-col justify-center p-4 min-w-0">
        <h3 className="line-clamp-2 text-sm font-bold leading-5">
          {game.Title}
        </h3>

        <div className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
  {getPlatformLogo(game.Platform) && (
    <img
  src={getPlatformLogo(game.Platform)!}
  alt={game.Platform}
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

  <span>{game.Platform}</span>
</div>

        <p className="mt-1 text-sm text-zinc-500">
          Score: {game.Score || "-"} | Hours: {formatHours(game["Hours Played"])}
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
    onClick={() =>
      setCurrentPage((p) => Math.min(totalPages, p + 1))
    }
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
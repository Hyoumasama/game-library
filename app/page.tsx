"use client";

import AddGameModal from "@/components/games/AddGameModal";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

function getHardwareLogo(hardware?: string) {
  const value = hardware?.toLowerCase().replace(/\s+/g, "") || "";

  if (value === "pc") return "/hardware/pc.png";
  if (value.includes("steamdeck")) return "/hardware/steamdeck.png";
  if (value.includes("xbox")) return "/hardware/xbox.png";

  if (value.includes("playstation4") || value.includes("ps4"))
    return "/hardware/playstation4.png";

  if (value.includes("playstation3") || value.includes("ps3"))
    return "/hardware/playstation3.png";

  if (value.includes("playstation2") || value.includes("ps2"))
    return "/hardware/playstation2.png";

  if (value.includes("playstation") || value.includes("ps5"))
    return "/hardware/playstation.png";

  return null;
}

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
const [isLoading, setIsLoading] = useState(true);

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

  const currentlyPlayingGames = useMemo(() => {
  return games
    .filter(
      (game) =>
        game.Status?.trim().toLowerCase() === "playing" ||
game.Status?.trim().toLowerCase() === "currently playing"
    )
    .sort((a, b) => {
      const dateA = new Date(a["Date of Purchase"] || "").getTime();
const dateB = new Date(b["Date of Purchase"] || "").getTime();

      return dateB - dateA;
    });
}, [games]);

  const recentlyAddedGames = useMemo(() => {
  return games
    .filter((game) => game["Date of Purchase"])
    .sort((a, b) => {
      const dateA = new Date(a["Date of Purchase"] || "").getTime();
      const dateB = new Date(b["Date of Purchase"] || "").getTime();
      return dateB - dateA;
    })
    .slice(0, 7);
}, [games]);

const recentlyCompletedGames = useMemo(() => {
  return games
    .filter((game) => game.Status?.trim() === "Completed")
    .filter((game) => getCompletionDate(game))
    .sort((a, b) => {
      const dateA = new Date(getCompletionDate(a)).getTime();
      const dateB = new Date(getCompletionDate(b)).getTime();
      return dateB - dateA;
    })
    .slice(0, 7);
}, [games]);

  if (isLoading) {
  return (
    <main className="min-h-screen bg-black p-8 text-white">
      Loading Game Library...
    </main>
  );
}
  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="mb-2 text-4xl font-bold">
            Nawaf&apos;s Game Library
            </h1>

          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <Link
  href="/all-games"
  className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:border-zinc-500"
>
  All Games
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
  onClick={() => setIsMenuOpen(true)}
  className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-2xl font-bold text-white sm:hidden"
>
  ☰
</button>

{isMenuOpen && (
  <div className="fixed inset-0 z-50 sm:hidden">
    <button
      onClick={() => setIsMenuOpen(false)}
      className="absolute inset-0 bg-black/70"
    />

    <div className="absolute right-0 top-0 h-full w-72 border-l border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold">Menu</h2>

        <button
          onClick={() => setIsMenuOpen(false)}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-bold"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <Link
  href="/all-games"
  onClick={() => setIsMenuOpen(false)}
  className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-bold text-white"
>
  All Games
</Link>

<Link
  href="/assets"
  onClick={() => setIsMenuOpen(false)}
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

        <section className="mb-8">
          <CurrentlyPlayingGrid games={currentlyPlayingGames} />
        </section>

      
<GameSection
  title="Recently Added"
  games={recentlyAddedGames}
  href="/all-games?sort=recently-added"
/>

<GameSection
  title="Recently Completed"
  games={recentlyCompletedGames}
  href="/all-games?status=Completed&sort=completion-newest"
/>
      </div>
    </main>
  );
}
function CurrentlyPlayingGrid({ games }: { games: Game[] }) {
  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Currently Playing</h2>

        <Link
          href="/all-games?status=Playing"
          className="text-sm font-bold text-zinc-400 hover:text-white"
        >
          All Games →
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-3 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible lg:grid-cols-7">
        {games.map((game, index) => (
          <Link
            key={`currently-playing-${game.id || game.Title}-${index}`}
            href={`/game/${game.id}`}
            className="group w-[150px] shrink-0 md:w-auto"
          >
            <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-900">
              {game.Cover ? (
                <img
                  src={game.Cover}
                  alt={game.Title}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl">
                  🎮
                </div>
              )}
            </div>

            <h3 className="mt-3 line-clamp-2 text-sm font-bold leading-5">
              {game.Title}
            </h3>

            <div className="mt-2 flex items-center gap-2">
              {getPlatformLogo(game.Platform) && (
                <img
                  src={getPlatformLogo(game.Platform)!}
                  alt=""
                  style={{ width: "20px", height: "20px", objectFit: "contain" }}
                />
              )}

              {getHardwareLogo(game.Hardware) && (
                <img
                  src={getHardwareLogo(game.Hardware)!}
                  alt=""
                  style={{ width: "20px", height: "20px", objectFit: "contain" }}
                />
              )}
            </div>

            {game.Price && (
              <p className="mt-2 text-sm font-bold text-zinc-400">
                {game.Price}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
function GameSection({
  title,
  games,
  href,
}: {
  title: string;
  games: Game[];
  href: string;
}) {
  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>

        <Link
  href={href}
          className="text-sm font-bold text-zinc-400 hover:text-white"
        >
          All Games →
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-3 md:grid md:grid-cols-5 md:overflow-visible lg:grid-cols-7">
        {games.map((game, index) => (
          <Link
            key={`${title}-${game.id || game.Title}-${index}`}
            href={`/game/${game.id}`}
            className="group w-[150px] shrink-0 md:w-auto"
          >
            <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-900">
              {game.Cover ? (
                <img
                  src={game.Cover}
                  alt={game.Title}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl">
                  🎮
                </div>
              )}
            </div>

            <h3 className="mt-3 line-clamp-2 text-sm font-bold leading-5">
              {game.Title}
            </h3>

            <div className="mt-2 flex items-center gap-2">
  {getPlatformLogo(game.Platform) && (
    <img
      src={getPlatformLogo(game.Platform)!}
      alt=""
      style={{ width: "20px", height: "20px", objectFit: "contain" }}
    />
  )}

  {getHardwareLogo(game.Hardware) && (
    <img
      src={getHardwareLogo(game.Hardware)!}
      alt=""
      style={{ width: "20px", height: "20px", objectFit: "contain" }}
    />
  )}
</div>

          </Link>
        ))}
      </div>
    </section>
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
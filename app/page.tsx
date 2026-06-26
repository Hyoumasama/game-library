"use client";

import HomeGameSearch from "@/components/HomeGameSearch";
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
    legacy: "/platforms/legacy.jpg",

    yuzu: "/platforms/yuzu.png",
    citra: "/platforms/citra.png",
    cemu: "/platforms/cemu.png",
    dolphin: "/platforms/dolphin.png",
    retroarch: "/platforms/retroarch.png",
    ryujinx: "/platforms/ryujinx.png",
    rpcs3: "/platforms/rpcs3.png",
    duckstation: "/platforms/duckstation.png",
    pcsx2: "/platforms/pcsx2.png",
    melonds: "/platforms/melonDS.png",
    xemu: "/platforms/xenia.png",

    pc: "/hardware/pc.png",
    steamdeck: "/hardware/steamdeck.png",
    ps3: "/hardware/playstation3.png",
    ps4: "/hardware/playstation4.png",
    ps5: "/hardware/playstation5.png",
  };

  if (!text) return null;

  return icons[text] || null;
}

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
  async function loadGames() {
    try {
      const response = await fetch("/api/home-games");
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
    <main className="min-h-screen bg-[#070a0f] p-4 text-white md:p-8">
      Loading Game Library...
    </main>
  );
}
    return (
    <main className="min-h-screen bg-[#070a0f] p-4 text-white md:p-8">
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            
            <div className="hidden flex-1 lg:flex">
  <HomeGameSearch />
</div>

            <div className="hidden h-full items-center gap-3 sm:flex">
              <Link href="/all-games" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:border-zinc-500">
                All Games
              </Link>

              <Link href="/stats" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:border-zinc-500">
                Stats
              </Link>

<Link href="/monthly-log" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:border-zinc-500">
  Monthly Log
</Link>
              <Link href="/assets" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:border-zinc-500">
                Assets
              </Link>

              <AuthButton />
              {isAdmin && <AddGameModal />}
            </div>

            <div className="flex w-full items-center gap-3 sm:hidden">
  <div className="flex-1">
    <HomeGameSearch />
  </div>

  <button
    onClick={() => setIsMenuOpen(true)}
    className="flex h-[52px] w-[52px] items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-2xl font-bold text-white"
  >
    ☰
  </button>
</div>
          </div>

          {isMenuOpen && (
  <div className="fixed inset-0 z-50 bg-black/70 p-4 sm:hidden">
    <div className="rounded-2xl border border-zinc-700 bg-zinc-950 p-4">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-lg font-bold text-white">Menu</p>

        <button
          type="button"
          onClick={() => setIsMenuOpen(false)}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xl font-bold text-white"
        >
          ×
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
          href="/stats"
          onClick={() => setIsMenuOpen(false)}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-bold text-white"
        >
          Stats
        </Link>

        <Link
          href="/monthly-log"
          onClick={() => setIsMenuOpen(false)}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-bold text-white"
        >
          Monthly Log
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
    <GameSection
      title="Currently Playing"
      games={games}
      href="/all-games?status=Playing"
    />
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
        <h2 className="text-xl font-black text-white md:text-2xl">{title}</h2>

        <Link href={href} className="text-xs font-black text-cyan-300 hover:text-white md:text-sm">
          All Games →
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-5 md:overflow-visible lg:grid-cols-7">
        {games.map((game, index) => (
          <Link
            key={`${title}-${game.id || game.Title}-${index}`}
            href={`/game/${game.id}`}
            className="group w-[155px] shrink-0 overflow-hidden rounded-[1.5rem] border border-zinc-800 bg-zinc-950/90 shadow-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-400/70 md:w-auto"
          >
            <div className="relative aspect-[2/3] overflow-hidden bg-zinc-900">
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
                <span
                  className={`absolute left-3 top-3 flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-black ${
                    Number(game.Score) >= 76
                      ? "bg-emerald-400 text-black"
                      : Number(game.Score) >= 60
                        ? "bg-yellow-400 text-black"
                        : "bg-red-400 text-black"
                  }`}
                >
                  {game.Score}
                </span>
              )}

              {Number(game["Hours Played"] || 0) > 0 && (
                <span className="absolute bottom-3 right-3 rounded-full border border-cyan-400/40 bg-black/70 px-3 py-1 text-xs font-black text-cyan-300">
                  {formatHours(game["Hours Played"])}h
                </span>
              )}
            </div>

            <div className="p-3">
              <h3 className="line-clamp-2 h-10 text-sm font-black leading-5 text-white">
                {game.Title}
              </h3>

              <div className="mt-2 flex h-5 items-center gap-2">
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
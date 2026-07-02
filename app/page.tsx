"use client";

import HomeGameSearch from "@/components/HomeGameSearch";
import AddGameModal from "@/components/games/AddGameModal";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AuthButton from "@/components/admin/AuthButton";
import {
  formatHours,
  getCompletionDate,
  getIcon,
  getReleaseYear,
  getYearFromDate,
  slugify,
} from "@/lib/gameHelpers";

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
    Cover?: string | null;
  "Wide Cover"?: string | null;
  Hero?: string;
  Summary?: string;
  Developer?: string;
  Publisher?: string;
  achievement_badge?: string | null;
  home_tag?: "Upcoming" | "Available Now";
};

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
const [wishlistGames, setWishlistGames] = useState<Game[]>([]);
const [currentlyPlayingGames, setCurrentlyPlayingGames] = useState<Game[]>([]);
const [recentlyAddedGames, setRecentlyAddedGames] = useState<Game[]>([]);
const [recentlyCompletedGames, setRecentlyCompletedGames] = useState<Game[]>([]);
const [isLoading, setIsLoading] = useState(true);

  async function loadGames() {
  try {
    const response = await fetch("/api/home-games");
    const data = await response.json();

    if (!response.ok) {
      console.error("HOME GAMES API ERROR:", data);
      return;
    }

    setWishlistGames(data.wishlist || []);
    setCurrentlyPlayingGames(data.currentlyPlaying || []);
    setRecentlyAddedGames(data.recentlyAdded || []);
    setRecentlyCompletedGames(data.recentlyCompleted || []);
  } finally {
    setIsLoading(false);
  }
}

useEffect(() => {
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
              {isAdmin && <AddGameModal onGameAdded={loadGames} />}
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

        {isAdmin && <AddGameModal onGameAdded={loadGames} />}

        <AuthButton />
      </div>
    </div>
  </div>
)}
        </div>

                        <GameSection
  title="Coming Soon"
  games={wishlistGames}
  href="/all-games?status=Wishlist"
  showHomeTag
  variant="wishlist"
/>

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

function getWishlistCountdown(release: string | null | undefined) {
  if (!release) return "TBA";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const releaseDate = new Date(release);
  releaseDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil(
    (releaseDate.getTime() - today.getTime()) / 86400000
  );

  if (diffDays <= 0) return "AVAILABLE NOW";

  if (diffDays < 30) return `${diffDays} DAYS LEFT`;

  if (diffDays < 365) {
    const months = Math.ceil(diffDays / 30);
    return months === 1 ? "1 MONTH LEFT" : `${months} MONTHS LEFT`;
  }

  const years = Math.ceil(diffDays / 365);
  return years === 1 ? "1 YEAR LEFT" : `${years} YEARS LEFT`;
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
  showHomeTag = false,
  variant = "default",
}: {
  title: string;
  games: Game[];
  href: string;
  showHomeTag?: boolean;
  variant?: "default" | "wishlist";
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
        {games.map((game, index) => {
          const image = variant === "wishlist" ? game.Cover : game.Cover;

          return (
            <Link
              key={`${title}-${game.id || game.Title}-${index}`}
              href={`/game/${game.id}`}
              className={`group w-[155px] shrink-0 overflow-hidden rounded-[1.5rem] border bg-zinc-950/90 shadow-xl transition duration-300 hover:-translate-y-1 md:w-auto ${
                variant !== "wishlist" && game.achievement_badge
                  ? "border-yellow-400/60 shadow-[0_0_24px_rgba(250,204,21,0.18)] hover:border-yellow-300 hover:shadow-[0_0_42px_rgba(250,204,21,0.38)]"
                  : variant === "wishlist"
                    ? "border-zinc-800 hover:border-pink-400/70 hover:shadow-pink-950/40"
                    : "border-zinc-800 hover:border-cyan-400/70 hover:shadow-cyan-950/40"
              }`}
            >
              <div className="relative aspect-[2/3] overflow-hidden bg-zinc-900">
                {image ? (
                  <img
                    src={image}
                    alt={game.Title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl">
                    🎮
                  </div>
                )}

                {variant !== "wishlist" && Number(game.Score || 0) > 0 && (
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

                {variant !== "wishlist" && Number(game["Hours Played"] || 0) > 0 && (
                  <span className="absolute bottom-3 right-3 rounded-full border border-cyan-400/40 bg-black/70 px-3 py-1 text-xs font-black text-cyan-300">
                    {formatHours(game["Hours Played"])}h
                  </span>
                )}
                {variant === "wishlist" && (
  <span
    className={`absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border min-w-[96px] px-3 py-1 text-center text-[10px] font-black uppercase tracking-wide whitespace-nowrap backdrop-blur-md ${
      game.home_tag === "Available Now"
  ? "border-emerald-500 bg-emerald-500 text-black"
  : "border-violet-500 bg-violet-500 text-black"
    }`}
  >
    {getWishlistCountdown(game.Release)}
  </span>
)}
              </div>

              <div className="p-3">
                <h3 className="line-clamp-2 h-10 text-sm font-black leading-5 text-white">
                  {game.Title}
                </h3>

                {variant === "wishlist" ? null : (
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
                )}
              </div>
            </Link>
          );
        })}
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
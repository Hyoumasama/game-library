"use client";

import { useState } from "react";
import Link from "next/link";
import GameAdminActions from "@/components/games/GameAdminActions";

export default function GamePageMobileMenu({ game }: { game: any }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMenuOpen(true)}
        className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-black text-white"
      >
        ☰ Menu
      </button>

      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 p-4 md:hidden">
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
                href="/"
                onClick={() => setIsMenuOpen(false)}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-bold text-white"
              >
                Home
              </Link>

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

              <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3">
  <div className="[&>div]:flex-col [&>div]:gap-3 [&_button]:w-full [&_button]:justify-center [&_button]:py-3 [&_a]:w-full [&_a]:justify-center [&_a]:py-3">
    <GameAdminActions game={game} />
  </div>
</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
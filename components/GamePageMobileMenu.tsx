"use client";

import Link from "next/link";
import { useState } from "react";
import GameAdminActions from "@/components/games/GameAdminActions";
import type { UiGame } from "@/lib/gameTypes";

export default function GamePageMobileMenu({
  game,
}: {
  game: UiGame;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMenuOpen(true)}
        className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-black text-white"
      >
        Menu
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
                x
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {[
                ["/", "Home"],
                ["/all-games", "All Games"],
                ["/stats", "Stats"],
                ["/monthly-log", "Monthly Log"],
                ["/assets", "Assets"],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-bold text-white"
                >
                  {label}
                </Link>
              ))}

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

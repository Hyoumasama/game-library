"use client";

import { useEffect, useRef, useState } from "react";
import EditGameModal from "./EditGameModal";
import DeleteGameButton from "./DeleteGameButton";
import type { UiGame } from "@/lib/gameTypes";

export default function GameHeroActions({ game }: { game: UiGame }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editSignal, setEditSignal] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function handleEdit() {
    setMenuOpen(false);
    setEditSignal((s) => s + 1);
  }

  function handleBeforeDelete() {
    setMenuOpen(false);
  }

  return (
    <div className="relative inline-block" ref={menuRef}>
      <EditGameModal game={game} hideButton openSignal={editSignal} />

      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Game actions"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
        style={{ width: 40, height: 40 }}
      >
        ⋮
      </button>

      {menuOpen && (
        <div
          role="menu"
          aria-label="Game actions menu"
          className="absolute right-0 top-full mt-2 w-[200px] rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl z-50"
        >
          <div className="flex flex-col">
            <button
              role="menuitem"
              type="button"
              onClick={handleEdit}
              className="flex h-11 items-center gap-2 px-4 text-sm font-semibold text-zinc-200 hover:bg-zinc-900"
            >
              <span className="text-sm">✏</span>
              <span>Edit Game</span>
            </button>

            <div className="my-1 h-px bg-zinc-800" />

            <div className="px-0">
              <DeleteGameButton
                gameId={Number(game.id)}
                onGameDeleted={() => {}}
                menuItem
                onBeforeDelete={handleBeforeDelete}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

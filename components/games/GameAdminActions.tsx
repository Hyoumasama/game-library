"use client";

import { useEffect, useState, useRef } from "react";
import EditGameModal from "./EditGameModal";
import DeleteGameButton from "./DeleteGameButton";
import AddGameModal from "./AddGameModal";
import type { UiGame } from "@/lib/gameTypes";

export default function GameAdminActions({ game }: { game: UiGame }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editSignal, setEditSignal] = useState(0);
  const [addSignal, setAddSignal] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      const response = await fetch("/api/admin/me");
      const data = await response.json();
      setIsAdmin(data.isAdmin);
    }

    checkAdmin();
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    }

    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  if (!isAdmin) return null;

  const gameId = Number(game.id);

  async function handleDelete() {
    if (!Number.isFinite(gameId)) return;

    const confirmed = confirm("Are you sure you want to delete this game?");
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/games/${gameId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        let message = response.statusText || "Failed to delete game";
        try {
          const body = await response.json();
          if (body && body.error) message = body.error;
        } catch (e) {}

        alert(message);
        console.error("Delete game failed", response.status, message);
        return;
      }

      // refresh page
      window.location.reload();
    } catch (err) {
      console.error("Delete request failed", err);
      alert("Failed to delete game: network error");
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <EditGameModal game={game} hideButton openSignal={editSignal} />
      <AddGameModal onGameAdded={() => {}} hideButton openSignal={addSignal} />

      <button
        type="button"
        aria-label="Open menu"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-black text-white"
      >
        ⋮
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setEditSignal((s) => s + 1);
            }}
            className="block w-full px-4 py-3 text-left text-sm font-black text-white hover:bg-zinc-900"
          >
            Edit Game
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              handleDelete();
            }}
            className="block w-full px-4 py-3 text-left text-sm font-black text-red-400 hover:bg-zinc-900"
          >
            Delete Game
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setAddSignal((s) => s + 1);
            }}
            className="block w-full px-4 py-3 text-left text-sm font-black text-zinc-400 hover:bg-zinc-900"
          >
            Add Game
          </button>
        </div>
      )}
    </div>
  );
}

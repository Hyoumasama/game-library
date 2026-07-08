"use client";

import { useEffect, useState } from "react";
import EditGameModal from "./EditGameModal";
import DeleteGameButton from "./DeleteGameButton";
import type { UiGame } from "@/lib/gameTypes";

export default function GameAdminActions({ game }: { game: UiGame }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      const response = await fetch("/api/admin/me");
      const data = await response.json();
      setIsAdmin(data.isAdmin);
    }

    checkAdmin();
  }, []);

  if (!isAdmin) return null;

  const gameId = Number(game.id);

  return (
    <div className="flex items-center gap-3">
      <EditGameModal game={game} />
      {Number.isFinite(gameId) && <DeleteGameButton gameId={gameId} />}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import EditGameModal from "./EditGameModal";
import DeleteGameButton from "./DeleteGameButton";

export default function GameAdminActions({ game }: { game: any }) {
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

  return (
    <div className="flex items-center gap-3">
      <EditGameModal game={game} />
      <DeleteGameButton gameId={game.id} />
    </div>
  );
}
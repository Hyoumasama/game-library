"use client";

import { useRouter } from "next/navigation";

export default function DeleteGameButton({ gameId }: { gameId: number }) {
  const router = useRouter();

  async function deleteGame() {
    const confirmed = confirm("Are you sure you want to delete this game?");

    if (!confirmed) return;

    const response = await fetch(`/api/admin/games/${gameId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      alert("Failed to delete game");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={deleteGame}
      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500"
    >
      Delete Game
    </button>
  );
}
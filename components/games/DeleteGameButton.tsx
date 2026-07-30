"use client";

import { useRouter } from "next/navigation";

export default function DeleteGameButton({
  gameId,
  onGameDeleted,
  className,
  menuItem = false,
  onBeforeDelete,
}: {
  gameId: number;
  onGameDeleted?: () => void;
  className?: string;
  menuItem?: boolean;
  onBeforeDelete?: () => void;
}) {
  const router = useRouter();

  async function deleteGame() {
    onBeforeDelete?.();
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
        } catch (e) {
          // ignore json parse errors
        }

        alert(message);
        console.error("Delete game failed", response.status, message);
        return;
      }
    } catch (err) {
      console.error("Delete request failed", err);
      alert("Failed to delete game: network error");
      return;
    }

    if (window.history.length > 1) {
  router.back();
} else {
  router.push("/");
}

onGameDeleted?.();
router.refresh();
  }

  const defaultClass = menuItem
    ? "block w-full text-left px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-900/40"
    : "rounded-xl bg-red-600 px-2 py-3 text-sm font-bold text-white hover:bg-red-500";

  return (
    <button onClick={deleteGame} className={className || defaultClass}>
      {menuItem ? (
        <>
          <span className="mr-3">🗑</span> <span>Delete Game</span>
        </>
      ) : (
        "Delete Game"
      )}
    </button>
  );
}
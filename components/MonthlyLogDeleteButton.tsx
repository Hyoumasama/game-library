"use client";

import { useRouter } from "next/navigation";

type MonthlyLogDeleteButtonProps = {
  logId: number;
};

export default function MonthlyLogDeleteButton({
  logId,
}: MonthlyLogDeleteButtonProps) {
  const router = useRouter();

  async function deleteLog() {
    const confirmed = confirm("Delete this monthly log?");

    if (!confirmed) return;

    const response = await fetch(`/api/monthly-logs?id=${logId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      alert("Failed to delete monthly log.");
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={deleteLog}
      title="Delete Log"
      className="text-zinc-500 transition hover:text-red-500"
    >
      ✕
    </button>
  );
}
"use client";

import { useState } from "react";

type BatchResponse = {
  processed?: number;
  found?: number;
  missing?: number;
  errors?: string[];
  done?: boolean;
  error?: string;
};

// Safety net in case the server keeps returning full batches.
const MAX_BATCHES = 40;

// Refreshes HowLongToBeat times for games released in the last two months
// (plus recent games HLTB didn't have yet). The server works in small
// batches to stay inside the function time limit, so this keeps calling it
// with the same start time until it reports done.
export default function HltbRefreshButton() {
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    setIsRunning(true);
    setMessage("Refreshing HLTB...");

    const since = new Date().toISOString();
    let processed = 0;
    let found = 0;
    let missing = 0;
    const errors: string[] = [];

    try {
      for (let batch = 0; batch < MAX_BATCHES; batch++) {
        const response = await fetch("/api/admin/hltb-refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ since }),
        });
        const data = (await response.json()) as BatchResponse;

        processed += data.processed || 0;
        found += data.found || 0;
        missing += data.missing || 0;
        errors.push(...(data.errors || []));

        if (!response.ok) {
          throw new Error(data.error || "HLTB refresh failed");
        }

        setMessage(`Refreshing HLTB... ${processed} checked`);

        if (data.done) break;
      }

      setMessage(
        processed === 0
          ? "HLTB: nothing to refresh"
          : `HLTB: ${processed} checked, ${found} updated, ${missing} not found` +
              (errors.length > 0 ? `, ${errors.length} failed` : "")
      );

      if (errors.length > 0) console.error("HLTB refresh errors:", errors);
    } catch (error) {
      console.error("HLTB refresh failed:", error);
      setMessage(
        `${error instanceof Error ? error.message : "HLTB refresh failed"}` +
          (processed > 0 ? ` (after ${processed} checked)` : "")
      );
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={refresh}
        disabled={isRunning}
        title="Update HowLongToBeat times for games released in the last 2 months"
        className="rounded-xl border border-violet-400/40 bg-violet-400/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-violet-200 transition hover:bg-violet-400/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRunning ? "Refreshing..." : "Refresh HLTB (last 2 months)"}
      </button>

      {message && (
        <span className="text-xs font-black uppercase text-zinc-400">
          {message}
        </span>
      )}
    </div>
  );
}

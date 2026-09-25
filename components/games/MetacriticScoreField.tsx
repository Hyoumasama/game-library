"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MetacriticScoreResult } from "@/lib/server/metacritic";

type LookupState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "found"; result: MetacriticScoreResult }
  | { kind: "missing" }
  | { kind: "error"; message: string };

const MATCH_LABELS: Record<MetacriticScoreResult["matchType"], string> = {
  exact: "",
  close: "close title match",
  partial: "partial title match - double-check",
  steam: "via Steam",
};

export default function MetacriticScoreField({
  value,
  onChange,
  title,
  release,
  steamAppId,
  autoFillKey,
}: {
  value: string | number;
  onChange: (value: string) => void;
  title: string;
  release: string;
  steamAppId: number | string | null;
  // When this changes to a non-empty value and the field is empty, the
  // score is fetched automatically (used after picking a search result).
  autoFillKey?: string | null;
}) {
  const [lookup, setLookup] = useState<LookupState>({ kind: "idle" });
  const requestIdRef = useRef(0);
  const valueRef = useRef(value);

  const fetchScore = useCallback(
    async (overwrite: boolean) => {
      const cleanTitle = title.trim();

      if (!cleanTitle) return;

      const requestId = ++requestIdRef.current;
      const params = new URLSearchParams({ title: cleanTitle });
      const year = release.slice(0, 4);

      if (/^\d{4}$/.test(year)) params.set("year", year);
      if (steamAppId) params.set("steamAppId", String(steamAppId));

      setLookup({ kind: "loading" });

      try {
        const response = await fetch(
          `/api/admin/metacritic-score?${params.toString()}`
        );
        const data = await response.json();

        if (requestId !== requestIdRef.current) return;

        if (!response.ok) {
          throw new Error(data.error || "Metacritic lookup failed");
        }

        const result = data.result as MetacriticScoreResult | null;

        if (!result) {
          setLookup({ kind: "missing" });
          return;
        }

        setLookup({ kind: "found", result });

        if (overwrite || !String(valueRef.current ?? "").trim()) {
          onChange(String(result.score));
        }
      } catch (error) {
        if (requestId !== requestIdRef.current) return;

        setLookup({
          kind: "error",
          message:
            error instanceof Error ? error.message : "Metacritic lookup failed",
        });
      }
    },
    [title, release, steamAppId, onChange]
  );

  const fetchScoreRef = useRef(fetchScore);

  // Declared before the auto-fill effect so it sees the latest values.
  useEffect(() => {
    valueRef.current = value;
    fetchScoreRef.current = fetchScore;
  }, [value, fetchScore]);

  useEffect(() => {
    requestIdRef.current++;

    const timeout = window.setTimeout(() => {
      if (!autoFillKey) {
        setLookup({ kind: "idle" });
        return;
      }

      if (!String(valueRef.current ?? "").trim()) {
        fetchScoreRef.current(false);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [autoFillKey]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Score"
          className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black px-4 py-3"
        />
        <button
          type="button"
          onClick={() => fetchScore(true)}
          disabled={!title.trim() || lookup.kind === "loading"}
          title="Fetch score from Metacritic"
          className="shrink-0 rounded-xl border border-zinc-700 px-3 text-sm font-semibold text-zinc-300 hover:border-yellow-500 hover:text-yellow-400 disabled:opacity-50"
        >
          {lookup.kind === "loading" ? "..." : "MC"}
        </button>
      </div>

      {lookup.kind === "found" && (
        <p className="px-1 text-xs text-zinc-400">
          Metacritic:{" "}
          {lookup.result.url ? (
            <a
              href={lookup.result.url}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-200 underline"
            >
              {lookup.result.matchedTitle}
            </a>
          ) : (
            <span className="text-zinc-200">{lookup.result.matchedTitle}</span>
          )}
          {lookup.result.year ? ` (${lookup.result.year})` : ""} -{" "}
          {lookup.result.score}
          {MATCH_LABELS[lookup.result.matchType] && (
            <span
              className={
                lookup.result.matchType === "partial"
                  ? " text-yellow-400"
                  : " text-zinc-500"
              }
            >
              {" "}
              · {MATCH_LABELS[lookup.result.matchType]}
            </span>
          )}
        </p>
      )}

      {lookup.kind === "missing" && (
        <p className="px-1 text-xs text-zinc-500">No Metacritic score found</p>
      )}

      {lookup.kind === "error" && (
        <p className="px-1 text-xs text-red-400">{lookup.message}</p>
      )}
    </div>
  );
}

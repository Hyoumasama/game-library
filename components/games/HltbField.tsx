"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HltbResult } from "@/lib/server/hltb";

export type HltbValue = {
  hltbId: number | null;
  main: string;
  mainExtra: string;
  completionist: string;
  // Set by hand: the automatic refresh leaves this game alone.
  locked: boolean;
};

export const EMPTY_HLTB_VALUE: HltbValue = {
  hltbId: null,
  main: "",
  mainExtra: "",
  completionist: "",
  locked: false,
};

export function toHltbValue(game: {
  hltb_id?: number | null;
  hltb_main?: number | string | null;
  hltb_main_extra?: number | string | null;
  hltb_completionist?: number | string | null;
  hltb_locked?: boolean | null;
}): HltbValue {
  return {
    hltbId: game.hltb_id ?? null,
    main: game.hltb_main == null ? "" : String(Number(game.hltb_main)),
    mainExtra: game.hltb_main_extra == null ? "" : String(Number(game.hltb_main_extra)),
    completionist: game.hltb_completionist == null ? "" : String(Number(game.hltb_completionist)),
    locked: game.hltb_locked === true,
  };
}

export function toHltbPayload(value: HltbValue) {
  return {
    hltbId: value.hltbId,
    hltbMain: value.main,
    hltbMainExtra: value.mainExtra,
    hltbCompletionist: value.completionist,
    hltbLocked: value.locked,
  };
}

type LookupState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "found"; result: HltbResult }
  | { kind: "missing" }
  | { kind: "error"; message: string };

const MATCH_LABELS: Record<HltbResult["matchType"], string> = {
  link: "",
  exact: "",
  close: "close title match",
  partial: "partial title match - double-check",
};

const TIME_FIELDS = [
  { key: "main", placeholder: "Main" },
  { key: "mainExtra", placeholder: "Main+Extra" },
  { key: "completionist", placeholder: "100%" },
] as const;

function isEmpty(value: HltbValue) {
  return !value.main && !value.mainExtra && !value.completionist;
}

function formatHours(hours: number | null) {
  return hours === null ? "" : String(hours);
}

export default function HltbField({
  value,
  onChange,
  title,
  release,
  autoFillKey,
}: {
  value: HltbValue;
  onChange: (value: HltbValue) => void;
  title: string;
  release: string;
  // When this changes to a non-empty value and the times are empty, they
  // are fetched automatically (used after picking a search result).
  autoFillKey?: string | null;
}) {
  const [lookup, setLookup] = useState<LookupState>({ kind: "idle" });
  const [link, setLink] = useState("");
  const requestIdRef = useRef(0);
  const valueRef = useRef(value);

  // With a pasted HLTB link, reads that exact game; otherwise searches by
  // the form title.
  const fetchTimes = useCallback(
    async (overwrite: boolean, hltbLink = "") => {
      const cleanTitle = title.trim();

      if (!hltbLink && !cleanTitle) return;

      const requestId = ++requestIdRef.current;
      const params = new URLSearchParams(
        hltbLink ? { link: hltbLink } : { title: cleanTitle }
      );
      const year = release.slice(0, 4);

      if (!hltbLink && /^\d{4}$/.test(year)) params.set("year", year);

      setLookup({ kind: "loading" });

      try {
        const response = await fetch(`/api/admin/hltb?${params.toString()}`);
        const data = await response.json();

        if (requestId !== requestIdRef.current) return;

        if (!response.ok) {
          throw new Error(data.error || "HLTB lookup failed");
        }

        const result = data.result as HltbResult | null;

        if (!result) {
          setLookup({ kind: "missing" });
          return;
        }

        setLookup({ kind: "found", result });

        if (hltbLink) setLink("");

        if (overwrite || isEmpty(valueRef.current)) {
          // Fetched times are HLTB's own, so the refresh may update them
          // (by this hltbId, so a pasted link stays the match).
          onChange({
            hltbId: result.hltbId,
            main: formatHours(result.main),
            mainExtra: formatHours(result.mainExtra),
            completionist: formatHours(result.completionist),
            locked: false,
          });
        }
      } catch (error) {
        if (requestId !== requestIdRef.current) return;

        setLookup({
          kind: "error",
          message: error instanceof Error ? error.message : "HLTB lookup failed",
        });
      }
    },
    [title, release, onChange]
  );

  const fetchTimesRef = useRef(fetchTimes);

  // Declared before the auto-fill effect so it sees the latest values.
  useEffect(() => {
    valueRef.current = value;
    fetchTimesRef.current = fetchTimes;
  }, [value, fetchTimes]);

  useEffect(() => {
    requestIdRef.current++;

    const timeout = window.setTimeout(() => {
      if (!autoFillKey) {
        setLookup({ kind: "idle" });
        return;
      }

      if (isEmpty(valueRef.current)) {
        fetchTimesRef.current(false);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [autoFillKey]);

  return (
    <div className="flex flex-col gap-1 md:col-span-2">
      <div className="flex gap-2">
        {TIME_FIELDS.map((field) => (
          <input
            key={field.key}
            value={value[field.key]}
            // Typing a time means HLTB got it wrong: lock it against refreshes.
            onChange={(e) =>
              onChange({ ...value, [field.key]: e.target.value, locked: true })
            }
            inputMode="decimal"
            placeholder={`${field.placeholder} (h)`}
            title={`HowLongToBeat ${field.placeholder} hours`}
            className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black px-3 py-3"
          />
        ))}
        <button
          type="button"
          onClick={() => fetchTimes(true)}
          disabled={!title.trim() || lookup.kind === "loading"}
          title="Fetch times from HowLongToBeat"
          className="shrink-0 rounded-xl border border-zinc-700 px-3 text-sm font-semibold text-zinc-300 hover:border-cyan-400 hover:text-cyan-300 disabled:opacity-50"
        >
          {lookup.kind === "loading" ? "..." : "HLTB"}
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => {
            // Enter would submit the whole game form.
            if (e.key === "Enter") {
              e.preventDefault();
              if (link.trim()) fetchTimes(true, link.trim());
            }
          }}
          placeholder="Wrong or no match? Paste a howlongtobeat.com/game/... link"
          className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => fetchTimes(true, link.trim())}
          disabled={!link.trim() || lookup.kind === "loading"}
          className="shrink-0 rounded-xl border border-zinc-700 px-3 text-xs font-semibold text-zinc-300 hover:border-cyan-400 hover:text-cyan-300 disabled:opacity-50"
        >
          Use link
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs">
        <label className="flex items-center gap-1.5 text-zinc-400">
          <input
            type="checkbox"
            checked={value.locked}
            onChange={(e) => onChange({ ...value, locked: e.target.checked })}
          />
          Lock (skip auto refresh)
        </label>

        {value.hltbId && lookup.kind !== "found" && (
          <a
            href={`https://howlongtobeat.com/game/${value.hltbId}`}
            target="_blank"
            rel="noreferrer"
            className="text-zinc-400 underline hover:text-cyan-300"
          >
            HLTB #{value.hltbId}
          </a>
        )}

        {lookup.kind === "found" && (
          <span className="text-zinc-400">
            HLTB:{" "}
            <a
              href={lookup.result.url}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-200 underline"
            >
              {lookup.result.matchedTitle}
            </a>
            {lookup.result.year ? ` (${lookup.result.year})` : ""}
            {lookup.result.mainCount > 0 && ` · ${lookup.result.mainCount} submissions`}
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
          </span>
        )}

        {lookup.kind === "missing" && (
          <span className="text-zinc-500">Not found on HowLongToBeat</span>
        )}

        {lookup.kind === "error" && (
          <span className="text-red-400">{lookup.message}</span>
        )}
      </div>
    </div>
  );
}

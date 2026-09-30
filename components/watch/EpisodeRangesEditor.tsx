"use client";

import { parseEpisodeRanges } from "@/lib/watchEpisodeRanges";
import type { ReactNode } from "react";

export type EpisodeEditorSeason = {
  seasonNumber: number;
  title: string | null;
  episodeNumbers: number[];
};

export type EpisodeRanges = Record<number, string>;

// Every regular season "all", specials empty.
export function allRegularSeasons(seasons: EpisodeEditorSeason[]): EpisodeRanges {
  return Object.fromEntries(
    seasons.map((season) => [season.seasonNumber, season.seasonNumber === 0 ? "" : "all"])
  );
}

export function hasAnyEpisodes(seasons: EpisodeEditorSeason[], value: EpisodeRanges) {
  return seasons.some((season) => {
    const parsed = parseEpisodeRanges(value[season.seasonNumber] || "", season.episodeNumbers);

    return "episodes" in parsed && parsed.episodes.length > 0;
  });
}

export function hasRangeErrors(seasons: EpisodeEditorSeason[], value: EpisodeRanges) {
  return seasons.some(
    (season) =>
      "error" in parseEpisodeRanges(value[season.seasonNumber] || "", season.episodeNumbers)
  );
}

// Per-season episode picker used for both "Episodes on Hard Disk" and
// "Episodes Watched": one ranges text box per season ("all", "1-12, 14")
// with All / None shortcuts.
export default function EpisodeRangesEditor({
  title,
  description,
  seasons,
  value,
  onChange,
}: {
  title: string;
  description: ReactNode;
  seasons: EpisodeEditorSeason[];
  value: EpisodeRanges;
  onChange: (next: EpisodeRanges) => void;
}) {
  if (!seasons.length) return null;

  function setSeason(seasonNumber: number, text: string) {
    onChange({ ...value, [seasonNumber]: text });
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 md:col-span-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm font-bold text-zinc-300">{title}</p>
        <button
          type="button"
          onClick={() => onChange(allRegularSeasons(seasons))}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-black text-zinc-200 hover:border-zinc-500"
        >
          All seasons
        </button>
        <button
          type="button"
          onClick={() => onChange({})}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-black text-zinc-200 hover:border-zinc-500"
        >
          Clear
        </button>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        {description} Type <span className="font-bold text-zinc-300">all</span>, leave empty
        for none, or list ranges like <span className="font-bold text-zinc-300">1-12, 14</span>.
      </p>

      <div className="mt-4 grid gap-3">
        {seasons.map((season) => {
          const text = value[season.seasonNumber] || "";
          const parsed = parseEpisodeRanges(text, season.episodeNumbers);
          const label =
            season.seasonNumber === 0
              ? season.title || "Specials"
              : season.title || `Season ${season.seasonNumber}`;

          return (
            <div key={season.seasonNumber}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                  {label}
                  <span className="ml-2 text-xs font-medium text-zinc-500">
                    {season.episodeNumbers.length} eps
                  </span>
                </span>

                <input
                  value={text}
                  onChange={(event) => setSeason(season.seasonNumber, event.target.value)}
                  placeholder="none"
                  aria-label={`${title}: ${label}`}
                  className={`w-40 rounded-xl border bg-black px-3 py-2 text-sm ${
                    "error" in parsed ? "border-red-500" : "border-zinc-700"
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setSeason(season.seasonNumber, "all")}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-black text-zinc-200 hover:border-zinc-500"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setSeason(season.seasonNumber, "")}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-black text-zinc-200 hover:border-zinc-500"
                >
                  None
                </button>
              </div>

              {"error" in parsed && (
                <p className="mt-1 text-xs font-bold text-red-400">{parsed.error}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

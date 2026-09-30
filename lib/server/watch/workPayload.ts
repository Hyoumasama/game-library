import "server-only";

import { watchStatusOptions } from "@/lib/watchFilters";
import { normalizeSources } from "@/lib/watchSources";
import type { EpisodeRanges, WatchEntryPatch } from "@/lib/server/watch/works";

// Request body validation for the /api/admin/watch/works routes. Each parser
// throws an Error with a user-facing message on bad input.

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseWatchStatus(value: unknown) {
  if (typeof value !== "string" || !watchStatusOptions.includes(value)) {
    throw new Error("Invalid watch status");
  }

  return value;
}

// { [seasonNumber]: "all" | "" | "1-12, 14" } from a request body.
export function parseEpisodeRangesBody(value: unknown): EpisodeRanges {
  if (value == null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Episode ranges must map season numbers to text");
  }

  const ranges: EpisodeRanges = {};

  for (const [season, text] of Object.entries(value)) {
    const seasonNumber = Number(season);

    if (!Number.isSafeInteger(seasonNumber) || seasonNumber < 0 || typeof text !== "string") {
      throw new Error("Episode ranges must map season numbers to text");
    }

    ranges[seasonNumber] = text;
  }

  return ranges;
}

function optionalCount(value: unknown, label: string) {
  if (value === "" || value == null) return 0;

  const count = Number(value);

  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error(`${label} must be zero or a positive whole number`);
  }

  return count;
}

export function parseEntryPatch(body: Record<string, unknown>): WatchEntryPatch {
  const score = body.my_score === "" || body.my_score == null ? null : Number(body.my_score);

  if (score != null && (!Number.isFinite(score) || score < 0 || score > 10)) {
    throw new Error("Score must be between 0 and 100");
  }

  for (const field of ["date_started", "completion_last_watched"] as const) {
    if (body[field] && !isDate(body[field])) throw new Error(`Invalid ${field}`);
  }

  return {
    watch_status: parseWatchStatus(body.watch_status),
    my_score: score,
    date_started: isDate(body.date_started) ? body.date_started : null,
    completion_last_watched: isDate(body.completion_last_watched)
      ? body.completion_last_watched
      : null,
    rewatch_count: optionalCount(body.rewatch_count, "Rewatch count"),
    notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
    watch_sources: normalizeSources(body.watch_sources),
  };
}

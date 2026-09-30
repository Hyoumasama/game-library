// Adds the work behind one pending watch_import_items row (a title found by
// the original hard-disk scan) to the library from a TMDB entry, then marks
// the row matched. Works that were never scanned are added from the site's
// "+ Add Work" button instead.
//
//   npm run watch:match -- <importItemId> <tv|movie> <tmdbId> [owned...] [--apply]
//
// owned is one token per season: "1" owns all of season 1, "2:13" owns
// episodes 1-13 of season 2. Movies take no owned tokens. Without --apply it
// only prints what would be saved.
import { createClient } from "@supabase/supabase-js";
import {
  addWatchWork,
  previewWatchWork,
  type EpisodeRanges,
} from "@/lib/server/watch/works";
import { HARD_DISK } from "@/lib/watchSources";

function usage(message: string): never {
  console.error(message);
  console.error("Usage: npm run watch:match -- <importItemId> <tv|movie> <tmdbId> [season | season:lastEpisode ...] [--apply]");
  process.exit(1);
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const [rawId, tmdbType, rawTmdbId, ...ownTokens] = args.filter((arg) => arg !== "--apply");
const importItemId = Number(rawId);
const tmdbId = Number(rawTmdbId);

if (!Number.isSafeInteger(importItemId) || importItemId <= 0) usage("importItemId must be a positive integer");
if (tmdbType !== "tv" && tmdbType !== "movie") usage("type must be tv or movie");
if (!Number.isSafeInteger(tmdbId) || tmdbId <= 0) usage("tmdbId must be a positive integer");
if (tmdbType === "movie" && ownTokens.length) usage("movies take no owned episodes");

const owned: EpisodeRanges = {};

for (const token of ownTokens) {
  const match = token.match(/^(\d+)(?::(\d+))?$/);
  if (!match) usage(`invalid owned token: ${token}`);

  owned[Number(match[1])] = match[2] ? `1-${match[2]}` : "all";
}

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const { data: item, error } = await supabase
  .from("watch_import_items")
  .select("id, local_title, local_type, status")
  .eq("id", importItemId)
  .maybeSingle();

if (error) throw error;
if (!item) usage(`import item ${importItemId} not found`);
if (item.status !== "pending") usage(`import item ${importItemId} is already ${item.status}`);

const work = {
  tmdbId,
  tmdbType,
  format: item.local_type === "ova" ? "ova" : tmdbType === "movie" ? "movie" : "series",
  owned,
  fallbackTitle: item.local_title,
} as const;

const preview = await previewWatchWork(work);

console.log(`#${importItemId} ${item.local_title} -> ${preview.title} [tmdb ${tmdbType} ${tmdbId}], owned episodes: ${preview.ownedEpisodes}`);

if (!apply) {
  console.log("Dry run. Add --apply to save.");
  process.exit(0);
}

// Everything the scan found is on the hard disk.
const { mediaId } = await addWatchWork({
  ...work,
  watchStatus: "Plan to Watch",
  sources: [HARD_DISK],
});

const { error: matchError } = await supabase
  .from("watch_import_items")
  .update({ status: "matched", matched_media_id: mediaId, matched_at: new Date().toISOString() })
  .eq("id", importItemId);

if (matchError) throw matchError;

console.log(`Saved as watch_media ${mediaId}.`);

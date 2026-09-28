// One-time HowLongToBeat fill for the whole library. After this, the admin
// "HLTB" refresh button on /all-games keeps recent releases up to date.
//
//   npm run hltb:backfill              every game never looked up before
//   npm run hltb:backfill -- --limit 50
//   npm run hltb:backfill -- --missing  retry games looked up without a match
//
// Safe to stop and re-run: each lookup stamps hltb_checked_at, and only
// unstamped games are picked up. Games the admin locked are skipped.

import { supabase } from "@/lib/supabase";
import { fetchAllRows } from "@/lib/server/fetchAllRows";
import {
  HLTB_GAME_ROW_COLUMNS,
  HltbRateLimitError,
  refreshGameHltb,
  waitBetweenHltbRequests,
  type HltbGameRow,
} from "@/lib/server/hltb";

const RATE_LIMIT_PAUSE_MS = 60_000;

function readLimit() {
  const index = process.argv.indexOf("--limit");
  const limit = index >= 0 ? Number(process.argv[index + 1]) : Infinity;

  return Number.isFinite(limit) && limit > 0 ? limit : Infinity;
}

const retryMissing = process.argv.includes("--missing");
const today = new Date().toISOString().slice(0, 10);
const { data, error } = await fetchAllRows<HltbGameRow>((from, to) =>
  supabase
    .from("games")
    .select(HLTB_GAME_ROW_COLUMNS)
    .eq("hltb_locked", false)
    .is(retryMissing ? "hltb_id" : "hltb_checked_at", null)
    // Unreleased games have no HLTB times yet; the refresh button picks
    // them up once they are out.
    .or(`release.is.null,release.lte.${today}`)
    .order("id", { ascending: true })
    .range(from, to)
);

if (error || !data) {
  console.error("Failed to load games:", error?.message);
  process.exit(1);
}

const games = data.slice(0, readLimit());
let found = 0;
let missing = 0;
const failed: string[] = [];
const missed: string[] = [];

console.log(`Looking up ${games.length} games on HowLongToBeat...`);

for (const [index, game] of games.entries()) {
  if (index > 0) await waitBetweenHltbRequests();

  const label = `[${index + 1}/${games.length}] ${game.title}`;

  try {
    let result;

    try {
      result = await refreshGameHltb(game);
    } catch (error) {
      if (!(error instanceof HltbRateLimitError)) throw error;

      console.warn(`${label}: rate limited, pausing for a minute...`);
      await waitBetweenHltbRequests(RATE_LIMIT_PAUSE_MS);
      result = await refreshGameHltb(game);
    }

    if (result) {
      found++;
      console.log(
        `${label} -> ${result.matchedTitle} (${result.matchType}) ` +
          `${result.main ?? "-"}h / ${result.mainExtra ?? "-"}h / ${result.completionist ?? "-"}h`
      );
    } else {
      missing++;
      missed.push(game.title || String(game.id));
      console.log(`${label} -> not found`);
    }
  } catch (error) {
    if (error instanceof HltbRateLimitError) {
      console.error("Still rate limited - stopping. Re-run later to continue.");
      break;
    }

    const message = error instanceof Error ? error.message : String(error);
    failed.push(`${game.title}: ${message}`);
    console.error(`${label} -> error: ${message}`);
  }
}

console.log(`\nDone. Found ${found}, not found ${missing}, errors ${failed.length}.`);

if (missed.length > 0) {
  console.log("\nNot found on HLTB (fill these in by hand if needed):");
  for (const title of missed) console.log(`  - ${title}`);
}

if (failed.length > 0) {
  console.log("\nErrors:");
  for (const line of failed) console.log(`  - ${line}`);
}

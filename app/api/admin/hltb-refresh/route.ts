import { revalidateGameCaches } from "@/lib/server/cacheTags";
import { supabase } from "@/lib/supabase";
import {
  HLTB_GAME_ROW_COLUMNS,
  HltbRateLimitError,
  refreshGameHltb,
  waitBetweenHltbRequests,
  type HltbGameRow,
} from "@/lib/server/hltb";

export const dynamic = "force-dynamic";
// One batch is ~15 lookups at well under a second each plus a short pause.
export const maxDuration = 60;

const BATCH_SIZE = 15;
// HLTB times keep moving while a game is new and few people have finished
// it; after that they barely change, so only recent releases are refreshed.
const RECENT_RELEASE_DAYS = 60;
// Recent-ish games HLTB didn't have yet are retried, but at most weekly.
// Older unmatched games are left for the admin to fill in by hand.
const MISSING_RETRY_RELEASE_DAYS = 365;
const MISSING_RETRY_INTERVAL_DAYS = 7;

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

// The admin UI calls this repeatedly with the same `since` (when the
// refresh started) until `done`: stamping hltb_checked_at is what moves a
// game out of the next batch, so each game is looked up once per run.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { since?: unknown };
  const since = new Date(typeof body.since === "string" ? body.since : "");

  if (Number.isNaN(since.getTime())) {
    return Response.json({ error: "A valid `since` timestamp is required" }, { status: 400 });
  }

  const sinceIso = since.toISOString();
  const retryBeforeIso = daysAgo(MISSING_RETRY_INTERVAL_DAYS).toISOString();
  const notCheckedSince = `hltb_checked_at.is.null,hltb_checked_at.lt."${sinceIso}"`;
  const notRetriedRecently = `hltb_checked_at.is.null,hltb_checked_at.lt."${retryBeforeIso}"`;

  const { data, error } = await supabase
    .from("games")
    .select(HLTB_GAME_ROW_COLUMNS)
    .eq("hltb_locked", false)
    .lte("release", toDateKey(new Date()))
    .or(
      [
        `and(release.gte.${toDateKey(daysAgo(RECENT_RELEASE_DAYS))},or(${notCheckedSince}))`,
        `and(hltb_id.is.null,release.gte.${toDateKey(daysAgo(MISSING_RETRY_RELEASE_DAYS))},or(${notRetriedRecently}))`,
      ].join(",")
    )
    .order("release", { ascending: false })
    .order("id", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const games = (data || []) as HltbGameRow[];
  let found = 0;
  let missing = 0;
  const errors: string[] = [];

  for (const [index, game] of games.entries()) {
    if (index > 0) await waitBetweenHltbRequests();

    try {
      if (await refreshGameHltb(game)) found++;
      else missing++;
    } catch (error) {
      if (error instanceof HltbRateLimitError) {
        return Response.json(
          { error: error.message, processed: found + missing, found, missing, errors },
          { status: 429 }
        );
      }

      errors.push(
        `${game.title || game.id}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  revalidateGameCaches();

  return Response.json(
    {
      processed: games.length,
      found,
      missing,
      errors,
      // A game whose update failed keeps an old hltb_checked_at and would be
      // picked again forever, so any error also ends the run.
      done: games.length < BATCH_SIZE || errors.length > 0,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

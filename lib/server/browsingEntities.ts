import "server-only";
import { unstable_cache } from "next/cache";
import { mapDbGameToUiGame } from "@/lib/gameMappers";
import { slugify } from "@/lib/gameHelpers";
import type { DbGame, UiGame } from "@/lib/gameTypes";
import { supabase } from "@/lib/supabase";
import { CACHE_TAGS } from "@/lib/server/cacheTags";
import { fetchAllRows } from "@/lib/server/fetchAllRows";

export type BrowsingEntityKind = "franchise" | "developer" | "publisher";

export type BrowsingEntityPageData = {
  kind: BrowsingEntityKind;
  name: string;
  games: UiGame[];
};

const BATCH_SIZE = 200;

// Card grid rendering (components/games/GameCardGrid.tsx) only ever reads
// the fields below, same "cards only, no detail-page columns" split already
// established by lib/server/gamesLite.ts and lib/server/homeGames.ts -
// these pages don't need summary/screenshots/igdb_id/etc. genres and
// completion_last_played are only here for the All Games filters/sort these
// pages share (lib/gameFilters.ts: filterAndSortGames).
const CARD_COLUMNS = `
  id,
  title,
  release,
  completion_last_played,
  genres,
  score,
  hours_played,
  status,
  store,
  platform,
  hardware,
  cover_url,
  steam_vertical_cover,
  developer,
  publisher,
  game_achievements (
    platinum,
    completion_percentage
  )
`;

function sortByTitle(games: UiGame[]) {
  return [...games].sort((first, second) =>
    first.Title.localeCompare(second.Title, "en", { sensitivity: "base" })
  );
}

async function fetchGamesByIds(ids: number[]): Promise<UiGame[]> {
  if (ids.length === 0) return [];

  const games: DbGame[] = [];

  for (let offset = 0; offset < ids.length; offset += BATCH_SIZE) {
    const batch = ids.slice(offset, offset + BATCH_SIZE);
    const { data, error } = await supabase
      .from("games")
      .select(CARD_COLUMNS)
      .in("id", batch);

    if (error) throw new Error(error.message);

    games.push(...((data || []) as DbGame[]));
  }

  return sortByTitle(games.map(mapDbGameToUiGame));
}

async function fetchFranchisePageData(
  slug: string
): Promise<BrowsingEntityPageData | null> {
  const { data: franchise, error: franchiseError } = await supabase
    .from("game_franchises")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();

  // Throw instead of returning null: a null result is cached by
  // unstable_cache below, so a transient Supabase error would otherwise
  // pin the franchise page to a 404 until the cache expires.
  if (franchiseError) throw new Error(franchiseError.message);
  if (!franchise) return null;

  // canonical_game_franchises is already past Supabase's 1000-row cap, so
  // page through it with a stable order (range without order can skip or
  // repeat rows between pages).
  const { data: memberships, error: membershipsError } = await fetchAllRows(
    (from, to) =>
      supabase
        .from("canonical_game_franchises")
        .select("canonical_game_id")
        .eq("franchise_id", franchise.id)
        .order("canonical_game_id")
        .range(from, to)
  );

  if (membershipsError) throw new Error(membershipsError.message);

  const canonicalIds = (memberships || []).map((row) => row.canonical_game_id);

  if (canonicalIds.length === 0) {
    return { kind: "franchise", name: franchise.name, games: [] };
  }

  // canonical_game_id -> owned library game_id(s). One canonical game can
  // have multiple library copies (different platforms/stores), and the
  // library count should reflect that, so this resolves to game ids rather
  // than deduping to one card per canonical game. Each batch is paged too,
  // since one batch of canonical ids can map to more than one response
  // page of links.
  const gameIds: number[] = [];
  for (let offset = 0; offset < canonicalIds.length; offset += BATCH_SIZE) {
    const batch = canonicalIds.slice(offset, offset + BATCH_SIZE);
    const { data, error } = await fetchAllRows((from, to) =>
      supabase
        .from("game_identity_links")
        .select("game_id")
        .in("canonical_game_id", batch)
        .order("game_id")
        .range(from, to)
    );

    if (error) throw new Error(error.message);

    gameIds.push(...(data || []).map((row) => row.game_id));
  }

  const games = await fetchGamesByIds(gameIds);

  return { kind: "franchise", name: franchise.name, games };
}

// games.developer/games.publisher are free-text strings (no separate
// entity/id table - see docs/PROJECT_DOCUMENTATION.md's Data Model and the
// Add/Edit Game forms, which are single plain-text inputs). There's no
// reliable delimiter to split a value into multiple companies: several
// real values already contain commas as part of one legal name (e.g.
// "Thekla, Inc", "Nicalis, Inc."), which a naive split would break into
// fake sub-entities. So each stored string is treated as one entity, linked
// as a single page, matching what the game detail page already displays as
// one field. The slug is derived from that whole string (lib/gameHelpers'
// slugify - same helper scripts/import-games.js uses for game slugs), with
// trim/case/whitespace normalization so minor formatting differences still
// resolve to the same page instead of silently fragmenting into lookalike
// entities.
function normalizeCompanyName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

async function resolveCompanyVariants(
  column: "developer" | "publisher",
  slug: string
): Promise<string[]> {
  // Page through every games row - otherwise companies whose games all fall
  // past Supabase's first 1000 rows resolve to no variants (404).
  const { data, error } = await fetchAllRows((from, to) =>
    supabase
      .from("games")
      .select(column)
      .not(column, "is", null)
      .order("id")
      .range(from, to)
  );

  if (error) throw new Error(error.message);

  const variants = new Set<string>();

  for (const row of data as Record<string, string | null>[]) {
    const raw = row[column];
    if (!raw || !normalizeCompanyName(raw)) continue;
    if (slugify(raw) === slug) variants.add(raw);
  }

  return [...variants];
}

async function fetchCompanyPageData(
  kind: "developer" | "publisher",
  slug: string
): Promise<BrowsingEntityPageData | null> {
  const variants = await resolveCompanyVariants(kind, slug);

  if (variants.length === 0) return null;

  const { data, error } = await fetchAllRows((from, to) =>
    supabase
      .from("games")
      .select(CARD_COLUMNS)
      .in(kind, variants)
      .order("id")
      .range(from, to)
  );

  if (error) throw new Error(error.message);

  const games = sortByTitle(
    ((data || []) as DbGame[]).map(mapDbGameToUiGame)
  );

  // Variants normally collapse to a single exact string (confirmed against
  // the live library data). When case/whitespace variants do exist, show
  // whichever raw spelling the most games actually use.
  const nameCounts = new Map<string, number>();
  for (const game of games) {
    const raw = kind === "developer" ? game.developer : game.publisher;
    if (raw) nameCounts.set(raw, (nameCounts.get(raw) || 0) + 1);
  }
  const name =
    [...nameCounts.entries()].sort((first, second) => second[1] - first[1])[0]?.[0] ||
    variants[0];

  return { kind, name, games };
}

// Mirrors getHomeGames (lib/server/homeGames.ts): unstable_cache keeps
// repeat visits to the same entity page instant, admin routes that can
// change franchise/developer/publisher data call
// revalidateTag(CACHE_TAGS.browsingEntities, { expire: 0 }) so an edit
// shows up on the next request, and the revalidate window below is just a
// safety net in case a mutation path forgets to call revalidateTag.
export const getFranchisePageData = unstable_cache(
  fetchFranchisePageData,
  ["franchise-page"],
  { tags: [CACHE_TAGS.browsingEntities], revalidate: 300 }
);

export const getDeveloperPageData = unstable_cache(
  (slug: string) => fetchCompanyPageData("developer", slug),
  ["developer-page"],
  { tags: [CACHE_TAGS.browsingEntities], revalidate: 300 }
);

export const getPublisherPageData = unstable_cache(
  (slug: string) => fetchCompanyPageData("publisher", slug),
  ["publisher-page"],
  { tags: [CACHE_TAGS.browsingEntities], revalidate: 300 }
);

import { supabase } from "./supabase";
import { mapDbGameToUiGame } from "./gameMappers";
import type { UiGame } from "./gameTypes";

export type Game = UiGame;

const gameColumns = `
  id,
  title,
  slug,
  release,
  date_started,
  date_of_purchase,
  completion_last_played,
  score,
  price,
  hours_played,
  status,
  store,
  platform,
  hardware,
  genres,
  cover_url,
  hero_url,
  wide_cover_url,
  steam_vertical_cover,
  summary,
  screenshots,
  developer,
  publisher,
  igdb_id,
  igdb_slug,
  steam_appid
`;

/** Just the `games` row, mapped to UiGame shape. No franchise. */
export async function getGameRow(id: number): Promise<UiGame | null> {
  const { data, error } = await supabase
    .from("games")
    .select(gameColumns)
    .eq("id", id)
    .limit(1)
    .single();

  if (error || !data) return null;

  return mapDbGameToUiGame(data);
}

/** The canonical_game_id this game is linked to, if any. */
export async function getGameIdentity(id: number): Promise<string | null> {
  const { data, error } = await supabase
    .from("game_identity_links")
    .select("canonical_game_id")
    .eq("game_id", id)
    .maybeSingle();

  if (error) return null;

  return data?.canonical_game_id ?? null;
}

export async function getFranchiseName(
  canonicalGameId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("canonical_game_franchises")
    .select("franchise:game_franchises(name)")
    .eq("canonical_game_id", canonicalGameId)
    .limit(1)
    .maybeSingle();

  if (error) return null;

  const joinedFranchise = data?.franchise as
    | { name: string | null }
    | { name: string | null }[]
    | null
    | undefined;

  return Array.isArray(joinedFranchise)
    ? joinedFranchise[0]?.name || null
    : joinedFranchise?.name || null;
}

export async function getGameById(id: number) {
  // game row + identity link don't depend on each other, so fetch in
  // parallel; franchise depends on the identity link's result.
  const [game, canonicalGameId] = await Promise.all([
    getGameRow(id),
    getGameIdentity(id),
  ]);

  if (!game) return null;

  const franchise = canonicalGameId
    ? await getFranchiseName(canonicalGameId)
    : null;

  return { ...game, franchise };
}

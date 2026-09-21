import { supabase } from "./supabase";
import { mapDbGameToUiGame } from "./gameMappers";
import type { UiGame } from "./gameTypes";

export type Game = UiGame;

export async function getGameById(id: number) {
  const [gameResult, identityResult] = await Promise.all([
    supabase
      .from("games")
      .select(
        `
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
        steam_appid
      `
      )
      .eq("id", id)
      .limit(1)
      .single(),
    supabase
      .from("game_identity_links")
      .select("canonical_game_id")
      .eq("game_id", id)
      .maybeSingle(),
  ]);

  if (gameResult.error || !gameResult.data) {
    return null;
  }

  let franchise: string | null = null;
  const canonicalGameId = identityResult.data?.canonical_game_id;

  if (!identityResult.error && canonicalGameId) {
    const membership = await supabase
      .from("canonical_game_franchises")
      .select("franchise:game_franchises(name)")
      .eq("canonical_game_id", canonicalGameId)
      .limit(1)
      .maybeSingle();

    if (!membership.error) {
      const joinedFranchise = membership.data?.franchise as
        | { name: string | null }
        | { name: string | null }[]
        | null
        | undefined;
      franchise = Array.isArray(joinedFranchise)
        ? joinedFranchise[0]?.name || null
        : joinedFranchise?.name || null;
    }
  }

  return { ...mapDbGameToUiGame(gameResult.data), franchise };
}

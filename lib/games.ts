import { supabase } from "./supabase";
import { mapDbGameToUiGame } from "./gameMappers";
import type { UiGame } from "./gameTypes";

export type Game = UiGame;

export async function getGameById(id: number) {
  const { data, error } = await supabase
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
        genre,
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
    .single();

  if (error || !data) {
    return null;
  }

  return mapDbGameToUiGame(data);
}

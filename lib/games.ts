import { supabase } from "./supabase";
import { mapDbGameToUiGame } from "./gameMappers";
import type { UiGame } from "./gameTypes";

export type Game = UiGame;

export async function getGameById(id: number) {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return mapDbGameToUiGame(data);
}

import { supabase } from "./supabase";
import { slugify } from "./gameHelpers";

export type Game = {
  id: number;
  slug: string;

  Title: string;
  Release: string;
  "Date of Purchase": string;
  "Completion Last Played": string;
  Score: string;
  Price: string;
  Hours: string;
  "Hours Played": string;
  Status: string;
  Store: string;
  Platform: string;
  "Hardware (1)": string;
    cover_url: string;
hero_url: string;
wide_cover_url: string;
steam_vertical_cover: string;
summary: string;
  genre: string;
  developer: string;
  publisher: string;
  igdb_id: number | null;
  screenshots: string;
};

function mapGame(game: any) {
  return {
    ...game,
    Title: game.title,
    Store: game.store,
    Platform: game.platform,
    Hardware: game.hardware,
    "Hardware (1)": game.hardware,
    Genre: game.genre,
    Score: game.score,
    Status: game.status,
    Price: game.price,
    "Hours Played": game.hours_played,
    Release: game.release,
    "Date of Purchase": game.date_of_purchase,
    "Completion Last Played": game.completion_last_played,
    "Completion / Last Played": game.completion_last_played,
    Cover: game.steam_vertical_cover || game.cover_url,
  };
}
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

  return mapGame(data);
}
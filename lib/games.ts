import { supabase } from "./supabase";

export type Game = {
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
};

export function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapGame(game: any): Game {
  return {
    Title: game.title || "",
    Release: game.release || "",
    "Date of Purchase": game.date_of_purchase || "",
    "Completion Last Played": game.completion_last_played || "",
    Score: game.score?.toString() || "",
    Price: game.price || "",
    Hours: game.hours_played?.toString() || "",
    "Hours Played": game.hours_played?.toString() || "",
    Status: game.status || "",
    Store: game.store || "",
    Platform: game.platform || "",
    "Hardware (1)": game.hardware || "",
  };
}

export async function getGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from("games")
    .select("*");

  if (error) {
    throw error;
  }

  return data.map(mapGame);
}

export async function getGameBySlug(slug: string) {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("slug", slug)
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return mapGame(data);
}
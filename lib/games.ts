import { supabase } from "./supabase";

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

export function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapGame(game: any): Game {
  return {
    id: game.id,
    slug: game.slug,

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
    cover_url: game.cover_url || "",
hero_url: game.hero_url || "",
wide_cover_url: game.wide_cover_url || "",
steam_vertical_cover: game.steam_vertical_cover || "",
summary: game.summary || "",
genre: game.genre || "",
developer: game.developer || "",
publisher: game.publisher || "",
igdb_id: game.igdb_id || null,
screenshots: game.screenshots || "",
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
export async function getGamesForRanking() {
  const { data } = await supabase
    .from("games")
    .select(`
      id,
      release,
      completion_last_played,
      score,
      hours_played,
      status
    `);

  return (data || []).map(mapGame);
}
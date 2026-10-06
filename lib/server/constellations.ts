import "server-only";
import { supabase } from "@/lib/supabase";
import { PIPELINE_GAME_FIELDS } from "./pipeline";
import type { PlayRoute, RouteGame } from "@/lib/constellations";
export async function getPlayRoutes(): Promise<PlayRoute[]> {
  const { data, error } = await supabase
    .from("play_routes")
    .select(
      `*,play_route_games(game_id,position,status,games!inner(${PIPELINE_GAME_FIELDS}))`,
    )
    .order("position")
    .order("created_at");
  if (error) throw new Error("Unable to load routes. Please try again.");
  return (data || []).map((row) => {
    const { play_route_games, ...route } = row;
    return {
      ...route,
      games: play_route_games
        .map(
          (entry: {
            games: RouteGame["game"];
            game_id: number;
            position: number;
            status: RouteGame["status"];
          }) => ({
            game_id: entry.game_id,
            position: entry.position,
            status: entry.status,
            game: entry.games,
          }),
        )
        .sort((a: RouteGame, b: RouteGame) => a.position - b.position),
    };
  });
}

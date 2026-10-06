import type { PipelineGame } from "./pipeline";
export type RouteStatus = "upcoming" | "current" | "completed";
export type RouteGame = {
  game_id: number;
  position: number;
  status: RouteStatus;
  game: PipelineGame;
};
export type PlayRoute = {
  id: string;
  name: string;
  icon: string;
  accent: string;
  description: string;
  position: number;
  created_at: string;
  revision: number;
  games: RouteGame[];
};
export const routeIcons = ["✦", "◈", "☾", "⌘", "⚡", "◎"];
export function displayState(
  games: RouteGame[],
  index: number,
): RouteStatus | "next" {
  const item = games[index];
  if (item.status !== "upcoming") return item.status;
  const current = games.findIndex((g) => g.status === "current");
  const next = games.findIndex(
    (g, i) => g.status === "upcoming" && i > current,
  );
  return index === next ? "next" : "upcoming";
}
export function orderedGames(games: RouteGame[]): RouteGame[] {
  return games.map((g, i) => ({ ...g, position: i + 1 }));
}
export const constellationSlots = [
  { x: 8, y: 30 },
  { x: 25, y: 58 },
  { x: 42, y: 28 },
  { x: 59, y: 64 },
  { x: 76, y: 38 },
  { x: 92, y: 60 },
];

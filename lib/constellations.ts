import type { PipelineGame } from "./pipeline";
export type RouteStatus = "upcoming" | "current" | "completed";
export type VisualState = "normal" | "current" | "completed";
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
export function getConnectionState(
  from: VisualState,
  to: VisualState,
): VisualState {
  if (from === "current" || to === "current") return "current";
  if (from === "completed" || to === "completed") return "completed";
  return "normal";
}
export function displayState(
  games: RouteGame[],
  index: number,
): VisualState {
  const statusOf = (entry: RouteGame): RouteStatus => {
    if (entry.status !== "upcoming") return entry.status;
    const libraryStatus = entry.game.status?.trim().toLowerCase();
    if (libraryStatus === "playing" || libraryStatus === "current") return "current";
    if (libraryStatus === "completed") return "completed";
    return "upcoming";
  };
  const status = statusOf(games[index]);
  return status === "upcoming" ? "normal" : status;
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
export function verticalConstellationSlots(count: number) {
  return Array.from({ length: count }, (_, i) => ({ x: i % 2 ? 55 : 45, y: (i + 0.5) * 100 / count }));
}

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
// Membership IDs stay unique even when the same library game belongs to two routes.
export function routeGameDragId(routeId: string, gameId: number) {
  return `route-game:${routeId}:${gameId}`;
}
export function routeTransferError(source: PlayRoute, target: PlayRoute, gameId: number): string | null {
  const entry = source.games.find(g => g.game_id === gameId);
  if (!entry) return "This game is no longer in the source route.";
  if (source.id === target.id) return null;
  if (target.games.some(g => g.game_id === gameId)) return "This game is already in the destination route.";
  if (target.games.length >= 100) return "The destination route already has 100 games.";
  if (entry.status === "current" && target.games.some(g => g.status === "current"))
    return "The destination route already has a now-playing game. Change its route status before moving this game.";
  return null;
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

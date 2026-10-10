export type Award = {
  id: string; nominee_name: string; nominee_type: "game" | "person" | "team" | "adaptation" | "event" | "other";
  game_title: string | null; game_id: number | null; image_url: string | null;
  status: "winner" | "nominee"; category_key: string; category_name: string;
  display_order: number; year: number; organization: string; owned: boolean;
  library_game_ids?: number[];
};
export type AwardSummary = { wins: number; nominations: number; goty: boolean; label: string };
// Deliberately retain edition, remake, DLC and collection words, numbers, and accents.
export function normalizeAwardTitle(title: string) {
  return title.normalize("NFC").toLowerCase().replace(/[™®]/g, "").replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
}
export function matchAwardGame(entry: { nominee_type: string; game_title?: string | null; nominee_name: string; external_game_id?: number | null }, games: { id: number; title: string; igdb_id?: number | null; status?: string | null; canonical_game_id?: string | null; canonical_title?: string | null; canonical_igdb_id?: number | null; canonical_confidence?: number | null }[]) {
  const title = entry.game_title || (entry.nominee_type === "game" ? entry.nominee_name : null);
  if (!title) return null;
  const exact = games.filter(g => normalizeAwardTitle(g.title) === normalizeAwardTitle(title));
  // Even a supplied identifier must not silently cross an edition boundary.
  const candidates = entry.external_game_id ? exact.filter(g => g.igdb_id === entry.external_game_id) : exact;
  if (candidates.length === 1) return candidates[0].id;
  if (candidates.length > 1 && candidates.every(g => g.canonical_game_id && g.canonical_confidence === 1 && g.canonical_title && normalizeAwardTitle(g.canonical_title) === normalizeAwardTitle(title) && g.igdb_id != null && g.igdb_id === g.canonical_igdb_id) && new Set(candidates.map(g => g.canonical_game_id)).size === 1) {
    return [...candidates].sort((a,b) => Number(a.status === "Wishlist")-Number(b.status === "Wishlist") || a.id-b.id)[0].id;
  }
  return null;
}
export function awardStats(entries: Award[]) {
  const games = entries.filter(e => e.nominee_type === "game" || e.nominee_type === "person" && e.game_title);
  const owned = entries.filter(e => e.owned && e.game_id != null);
  const key = (e: Award) => normalizeAwardTitle(e.game_title || e.nominee_name);
  return {
    categories: new Set(entries.map(e => e.category_key)).size,
    games: new Set(games.map(key)).size,
    libraryGames: new Set(owned.map(key)).size,
    winningGames: new Set(owned.filter(e => e.status === "winner").map(key)).size,
    nominations: owned.length, wins: owned.filter(e => e.status === "winner").length,
    goty: new Set(owned.filter(e => e.status === "winner" && e.category_key === "game-of-the-year").map(key)).size,
  };
}
export function summarizeAwards(entries: Award[]): AwardSummary | undefined {
  if (!entries.length) return;
  const sorted = [...entries].sort((a,b) => Number(b.status === "winner") - Number(a.status === "winner") || Number(b.category_key === "game-of-the-year") - Number(a.category_key === "game-of-the-year") || b.year-a.year);
  const best = sorted[0];
  return { wins: entries.filter(e => e.status === "winner").length, nominations: entries.length,
    goty: entries.some(e => e.status === "winner" && e.category_key === "game-of-the-year"),
    label: `${best.category_name} ${best.status === "winner" ? "Winner" : "Nominee"} — ${best.year}${entries.length > 1 ? ` · ${entries.length} nominations, ${entries.filter(e => e.status === "winner").length} wins` : ""}` };
}

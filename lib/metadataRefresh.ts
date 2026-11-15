export const REFRESH_TYPES = ["metadata", "hltb", "metacritic"] as const;
export type RefreshType = typeof REFRESH_TYPES[number];
export type RefreshOptions = {
  types: RefreshType[];
  scope: "all" | "wishlist" | "owned";
  months: number;
  includeUpcoming: boolean;
  mode: "missing" | "all";
};
export type RefreshGame = Record<string, unknown> & { id: number; title: string | null };
export const METADATA_FIELDS = ["release", "summary", "genres", "developer", "publisher", "cover_url", "hero_url", "screenshots", "igdb_slug"];
export const HLTB_FIELDS = ["hltb_main", "hltb_main_extra", "hltb_completionist"];

export function parseRefreshOptions(input: unknown): RefreshOptions {
  if (!input || typeof input !== "object") throw new Error("Invalid refresh options");
  const value = input as Record<string, unknown>;
  if (!Array.isArray(value.types) || !value.types.length || value.types.some(t => !REFRESH_TYPES.includes(t)) ||
      !["all", "wishlist", "owned"].includes(String(value.scope)) ||
      !["all", "missing"].includes(String(value.mode)) ||
      typeof value.months !== "number" || !Number.isInteger(value.months) || value.months < 0 || value.months > 1200 ||
      typeof value.includeUpcoming !== "boolean") throw new Error("Invalid refresh options");
  return { types: [...new Set(value.types)] as RefreshType[], scope: value.scope as RefreshOptions["scope"], months: value.months, includeUpcoming: value.includeUpcoming, mode: value.mode as RefreshOptions["mode"] };
}

export function isEmptyMetadata(value: unknown) {
  return value == null || (typeof value === "string" && !value.trim()) ||
    (typeof value === "number" && value <= 0) || (Array.isArray(value) && !value.length);
}

export function releaseCutoff(months: number, now = new Date()) {
  const date = new Date(now);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

export function matchesRefreshScope(game: RefreshGame, options: RefreshOptions, now = new Date()) {
  if (options.scope === "wishlist" && game.status !== "Wishlist") return false;
  if (options.scope === "owned" && (!game.status || game.status === "Wishlist")) return false;
  const release = typeof game.release === "string" ? game.release.slice(0, 10) : null;
  const today = now.toISOString().slice(0, 10);
  if (!release) return options.includeUpcoming || options.months === 0;
  if (release > today) return options.includeUpcoming;
  return !options.months || release >= releaseCutoff(options.months, now);
}

export function needsRefresh(game: RefreshGame, type: RefreshType, mode: RefreshOptions["mode"]) {
  if (type === "hltb" && game.hltb_locked === true) return false;
  const fields = type === "metadata" ? METADATA_FIELDS : type === "hltb" ? HLTB_FIELDS : ["score"];
  return mode === "all" || fields.some(field => isEmptyMetadata(game[field]));
}

// Apply missing-only per field, never per game, and never erase a stored value on a miss.
export function metadataPatch(game: RefreshGame, incoming: Record<string, unknown>, mode: RefreshOptions["mode"]) {
  return Object.fromEntries(Object.entries(incoming).filter(([field, value]) =>
    !isEmptyMetadata(value) && (mode === "all" || isEmptyMetadata(game[field])) &&
    JSON.stringify(game[field]) !== JSON.stringify(value)
  ));
}

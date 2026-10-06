/** Never Played is a virtual filter, not a value stored in games.status. */
export function resolvePlayHistoryFilter(statuses: string[], playHistory?: string | null) {
  const neverPlayed = statuses.some(status => status.trim().toLowerCase() === "never played") ||
    playHistory?.trim() === "never-played";
  return {
    statuses: neverPlayed ? [] : statuses,
    playHistory: neverPlayed ? "never-played" : null,
  };
}

export function applyNeverPlayedFilter<T extends { eq(column: string, value: string): T; or(filter: string): T }>(query: T, completedIds: number[]): T {
  const unplayed = query.eq("status", "Unplayed");
  // SQL NOT IN excludes NULL too; games with no external ID must remain visible.
  return completedIds.length
    ? unplayed.or(`igdb_id.is.null,igdb_id.not.in.(${completedIds.join(",")})`)
    : unplayed;
}

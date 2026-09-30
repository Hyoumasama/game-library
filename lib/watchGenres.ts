// Watch-library genre cleanup, the counterpart of lib/genres.ts for games.
// TMDB names TV genres as pairs ("Action & Adventure", "Sci-Fi & Fantasy")
// but movie genres singly ("Action", "Science Fiction"), so the same genre
// showed up under different names. Movie genres are folded into the TV
// pairs rather than splitting the pairs, because TMDB does not say which
// half of a pair applies (splitting would tag every fantasy series Sci-Fi).
// "Animation" is dropped because every work in this library is anime.

const GENRE_MAP = new Map<string, string | null>([
  ["action", "Action & Adventure"],
  ["adventure", "Action & Adventure"],
  ["science fiction", "Sci-Fi & Fantasy"],
  ["fantasy", "Sci-Fi & Fantasy"],
  ["war", "War & Politics"],
  ["animation", null],
]);

export function normalizeWatchGenres(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const genres: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") continue;

    const trimmed = item.trim();
    const mapped = GENRE_MAP.has(trimmed.toLowerCase())
      ? GENRE_MAP.get(trimmed.toLowerCase())
      : trimmed;
    const key = mapped?.toLowerCase();

    if (!mapped || !key || seen.has(key)) continue;

    seen.add(key);
    genres.push(mapped);
  }

  return genres;
}

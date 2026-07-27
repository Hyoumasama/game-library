const GENRE_MAP = new Map<string, string>([
  ["role-playing (rpg)", "RPG"],
  ["hack and slash/beat 'em up", "Hack and Slash"],
  ["turn-based strategy (tbs)", "Turn-Based Strategy"],
  ["real time strategy (rts)", "RTS"],
  ["simulator", "Simulation"],
  ["sport", "Sports"],
]);

function canonicalGenre(value: string) {
  return GENRE_MAP.get(value.toLowerCase()) || value;
}

export function normalizeGenres(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const genres: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const genre = canonicalGenre(item.trim());
    const key = genre.toLowerCase();

    if (!genre || seen.has(key)) {
      continue;
    }

    seen.add(key);
    genres.push(genre);
  }

  return genres;
}

export function parseGenreText(value: string): string[] {
  return normalizeGenres(value.split(","));
}

export function formatGenres(genres: string[] | null | undefined): string {
  return normalizeGenres(genres).join(", ");
}

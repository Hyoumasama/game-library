// Adult games are marked with a plain "Adult" genre (not a separate flag) so
// they show up in the existing genre filter/search with no extra plumbing.
export const ADULT_GENRE = "Adult";

// Steam content descriptor ids: 3 = Adult Only Sexual Content,
// 4 = Frequent Nudity or Sexual Content. (1 = "Some Nudity" is deliberately
// excluded - plenty of mainstream games carry it.)
const STEAM_ADULT_DESCRIPTOR_IDS = new Set([3, 4]);

export const IGDB_EROTIC_THEME = "Erotic";

export function isSteamAdultContent(descriptorIds: number[] | null | undefined) {
  return (descriptorIds || []).some((id) =>
    STEAM_ADULT_DESCRIPTOR_IDS.has(Number(id))
  );
}

export function hasAdultGenre(genres: string[] | null | undefined) {
  return (genres || []).some(
    (genre) => genre.trim().toLowerCase() === ADULT_GENRE.toLowerCase()
  );
}

export function withAdultGenre(genres: string[], isAdult: boolean) {
  return isAdult && !hasAdultGenre(genres) ? [...genres, ADULT_GENRE] : genres;
}

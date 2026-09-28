// Title normalization shared by the Metacritic and HowLongToBeat matchers.

export function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[™®©]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function stripEditionWords(value: string) {
  return normalizeTitle(value)
    .replace(/\b(the|a)\b/g, " ")
    .replace(
      /\b(tom clancy s|definitive|enhanced|ultimate|collector s|anniversary|remastered|remaster|hd|dx|edition)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

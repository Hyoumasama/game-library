export function formatHours(hours?: string | number) {
  const value = Number(hours || 0);
  if (!value) return "0";
  return value.toFixed(1).replace(".0", "");
}

export function getCompletionDate(game: any) {
  return game["Completion Last Played"] || game["Completion / Last Played"] || "";
}

export function getReleaseYear(game: any) {
  const match = game.Release?.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : "";
}

export function getYearFromDate(value?: string) {
  const match = value?.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : "";
}
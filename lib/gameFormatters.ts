export function formatHours(hours?: string | number | null) {
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

export function getYearFromDate(value?: string | null) {
  const match = value?.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : "";
}
export function formatDisplayDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const formatted = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return formatted.replace(/ (\d{4})$/, ", $1");
}

export function getDaysBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return "-";

  const startDate = new Date(start);
  const endDate = new Date(end);

  const diff =
    Math.abs(endDate.getTime() - startDate.getTime()) /
    (1000 * 60 * 60 * 24);

  return `${Math.round(diff)} Days`;
}

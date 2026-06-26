export { getIcon } from "./gameIcons";

export {
  formatHours,
  getCompletionDate,
  getReleaseYear,
  getYearFromDate,
  formatDisplayDate,
  getDaysBetween,
} from "./gameFormatters";

export { getScoreClass } from "./gameRanking";

export function slugify(title?: string) {
  return (title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
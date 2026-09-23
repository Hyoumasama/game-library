import type { UiGame } from "@/lib/gameTypes";

// Groups wishlist games into the /wishlist release timeline:
// - the current year is split into months (only months that have games),
//   followed by "DATE TBA" for games known to release this year but with
//   no known month;
// - every other year is one flat, chronologically ordered group;
// - games with no known release year go in a final "TBA" group.
// Only the precision actually present in `release` is used - no month or
// day is ever invented. `games.release` is a `date` column today, so every
// non-null value is a full date, but year-only / year-month strings are
// handled the same way if they ever appear.

export type WishlistMonthGroup = {
  month: number; // 1-12
  games: UiGame[];
};

export type WishlistYearGroup =
  | { kind: "year"; year: number; games: UiGame[] }
  | {
      kind: "current-year";
      year: number;
      months: WishlistMonthGroup[];
      dateTba: UiGame[];
    };

export type WishlistTimeline = {
  years: WishlistYearGroup[];
  tba: UiGame[];
};

type ReleaseParts = { year: number; month: number | null; day: number | null };

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function parseRelease(release?: string | null): ReleaseParts | null {
  const match = String(release || "").match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/);

  if (!match) return null;

  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : null;
  const day = month && match[3] ? Number(match[3]) : null;

  return {
    year,
    month: month && month >= 1 && month <= 12 ? month : null,
    day: day && day >= 1 && day <= 31 ? day : null,
  };
}

export function getMonthName(month: number) {
  return MONTH_NAMES[month - 1];
}

// Short label for a card: as precise as the stored data, never more.
export function formatWishlistRelease(release?: string | null) {
  const parts = parseRelease(release);

  if (!parts) return "TBA";

  const monthName = parts.month ? getMonthName(parts.month).slice(0, 3) : null;

  if (monthName && parts.day) return `${monthName} ${parts.day}, ${parts.year}`;
  if (monthName) return `${monthName} ${parts.year}`;

  return String(parts.year);
}

// Chronological within a year; less precise dates sort after more precise
// ones in the same period (month-only after that month's days, year-only
// last), then by title.
function compareByRelease(first: UiGame, second: UiGame) {
  const a = parseRelease(first.Release);
  const b = parseRelease(second.Release);

  return (
    (a?.month ?? 13) - (b?.month ?? 13) ||
    (a?.day ?? 32) - (b?.day ?? 32) ||
    first.Title.localeCompare(second.Title)
  );
}

function compareByTitle(first: UiGame, second: UiGame) {
  return first.Title.localeCompare(second.Title);
}

function toDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

// Full-date releases from one month ago through today, newest first; the
// rest go on to buildWishlistTimeline so no game is shown twice. Year- or
// month-only releases never qualify - "released" needs a known day.
export function splitRecentlyReleased(games: UiGame[], today: Date) {
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const todayKey = toDateKey(today);
  const monthAgoKey = toDateKey(monthAgo);
  const recent: UiGame[] = [];
  const rest: UiGame[] = [];

  for (const game of games) {
    const parts = parseRelease(game.Release);
    const releaseKey = String(game.Release || "").slice(0, 10);
    const isRecent =
      !!parts?.day && releaseKey >= monthAgoKey && releaseKey <= todayKey;

    (isRecent ? recent : rest).push(game);
  }

  recent.sort(
    (first, second) =>
      String(second.Release).localeCompare(String(first.Release)) ||
      first.Title.localeCompare(second.Title)
  );

  return { recent, rest, todayKey };
}

export function buildWishlistTimeline(
  games: UiGame[],
  currentYear: number
): WishlistTimeline {
  const gamesByYear = new Map<number, UiGame[]>();
  const tba: UiGame[] = [];

  for (const game of games) {
    const parts = parseRelease(game.Release);

    if (!parts) {
      tba.push(game);
      continue;
    }

    gamesByYear.set(parts.year, [...(gamesByYear.get(parts.year) || []), game]);
  }

  const years = [...gamesByYear.keys()]
    .sort((first, second) => first - second)
    .map((year): WishlistYearGroup => {
      const yearGames = gamesByYear.get(year)!.sort(compareByRelease);

      if (year !== currentYear) return { kind: "year", year, games: yearGames };

      const gamesByMonth = new Map<number, UiGame[]>();
      const dateTba: UiGame[] = [];

      for (const game of yearGames) {
        const month = parseRelease(game.Release)?.month;

        if (!month) {
          dateTba.push(game);
          continue;
        }

        gamesByMonth.set(month, [...(gamesByMonth.get(month) || []), game]);
      }

      return {
        kind: "current-year",
        year,
        months: [...gamesByMonth.entries()]
          .sort(([first], [second]) => first - second)
          .map(([month, monthGames]) => ({ month, games: monthGames })),
        dateTba: dateTba.sort(compareByTitle),
      };
    });

  return { years, tba: tba.sort(compareByTitle) };
}

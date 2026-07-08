import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getIcon } from "@/lib/gameIcons";
import StatsYearSelect from "./StatsYearSelect";

const monthNames = [
  "",
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

const monthShortNames = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const palette = [
  "#22d3ee",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#64748b",
  "#14b8a6",
  "#a855f7",
];

type GameRelation =
  | {
      id: number;
      title: string | null;
      release: string | null;
      date_started: string | null;
      date_of_purchase: string | null;
      completion_last_played: string | null;
      steam_vertical_cover: string | null;
      cover_url: string | null;
      wide_cover_url: string | null;
      platform: string | null;
      hardware: string | null;
      store: string | null;
      status: string | null;
      score: string | number | null;
      price: string | number | null;
      genres: string[] | null;
    }
  | {
      id: number;
      title: string | null;
      release: string | null;
      date_started: string | null;
      date_of_purchase: string | null;
      completion_last_played: string | null;
      steam_vertical_cover: string | null;
      cover_url: string | null;
      wide_cover_url: string | null;
      platform: string | null;
      hardware: string | null;
      store: string | null;
      status: string | null;
      score: string | number | null;
      price: string | number | null;
      genres: string[] | null;
    }[]
  | null;

type PlayLog = {
  log_id: number;
  game_id: number;
  title: string;
  hours: number;
  month: number;
  year: number;
  games: GameRelation;
};

type LibraryGame = {
  id: number;
  title: string | null;
  date_of_purchase: string | null;
  steam_vertical_cover: string | null;
  cover_url: string | null;
  wide_cover_url: string | null;
  release?: string | null;
  date_started?: string | null;
  completion_last_played?: string | null;
  platform?: string | null;
  hardware?: string | null;
  store: string | null;
  status?: string | null;
  score: string | number | null;
  price: string | number | null;
  hours_played?: string | number | null;
  genres?: string[] | null;
};

type ArchiveGame = Required<
  Pick<
    LibraryGame,
    | "id"
    | "title"
    | "release"
    | "date_started"
    | "date_of_purchase"
    | "completion_last_played"
    | "steam_vertical_cover"
    | "cover_url"
    | "wide_cover_url"
    | "platform"
    | "hardware"
    | "store"
    | "status"
    | "score"
    | "price"
    | "hours_played"
    | "genres"
  >
>;

type TimelineGame = {
  id: number;
  title: string;
  hours: number;
  month: number;
  percent: number;
  cover: string | null;
  wideCover: string | null;
  firstPlayedThisYear: boolean;
  returningThisYear: boolean;
  platform: string | null;
  hardware: string;
  releaseYear: number | null;
  status: string | null;
  score: number;
  price: number;
  store: string | null;
  genres: string[];
  startedDate: string | null;
  purchaseDate: string | null;
  completionDate: string | null;
};

type TopGame = {
  id: number;
  title: string;
  hours: number;
  percent: number;
  cover: string | null;
  platform: string | null;
  months: number[];
};

type PurchaseGame = {
  id: number;
  title: string;
  price: number;
  score: number;
  cover: string | null;
  wideCover: string | null;
  store: string | null;
  purchaseDate: string | null;
};

type StatsPageProps = {
  searchParams: Promise<{
    year?: string;
  }>;
};

type StatsYearRow = {
  year: number | string | null;
};

function getGame(log: PlayLog) {
  if (!log.games) return null;
  return Array.isArray(log.games) ? log.games[0] || null : log.games;
}

function getCover(log: PlayLog) {
  const game = getGame(log);
  return game?.steam_vertical_cover || game?.cover_url || null;
}

function getWideCover(log: PlayLog) {
  const game = getGame(log);
  return (
    game?.wide_cover_url ||
    game?.cover_url ||
    game?.steam_vertical_cover ||
    null
  );
}

function getYear(value: string | null | undefined) {
  if (!value) return null;
  const text = String(value).trim();
  const fourDigitYear = text.match(/\b(19|20)\d{2}\b/);
  if (fourDigitYear) return Number(fourDigitYear[0]);

  const excelDateYear = text.match(/\b\d{1,2}[-/][A-Za-z]{3,9}[-/](\d{2})\b/);
  if (excelDateYear) return 2000 + Number(excelDateYear[1]);

  const parsedDate = new Date(text);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.getFullYear();
}

function getMonth(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getMonth() + 1;
}

function getFirstPlayedYear(log: PlayLog) {
  const game = getGame(log);
  return (
    getYear(game?.date_started) ||
    getYear(game?.date_of_purchase) ||
    log.year
  );
}

function getHardware(log: PlayLog) {
  const game = getGame(log);
  return game?.hardware || game?.platform || game?.store || "Unknown";
}

function getPlatform(log: PlayLog) {
  const game = getGame(log);
  return game?.platform || null;
}

function getStatus(log: PlayLog) {
  const game = getGame(log);
  return game?.status || null;
}

function getStore(log: PlayLog) {
  const game = getGame(log);
  return game?.store || null;
}

function getScore(log: PlayLog) {
  const game = getGame(log);
  return Number(game?.score || 0);
}

function parsePrice(rawPrice: string | number | null | undefined) {
  if (rawPrice === null || rawPrice === undefined) return 0;
  if (typeof rawPrice === "number") return rawPrice;

  const cleaned = rawPrice.trim().replace(/[^\d.,]/g, "");
  const normalized =
    cleaned.includes(",") && !cleaned.includes(".")
      ? cleaned.replace(",", ".")
      : cleaned.replace(/,/g, "");

  return Number(normalized || 0);
}

function getPrice(log: PlayLog) {
  const game = getGame(log);
  return parsePrice(game?.price);
}

function formatPrice(value: number) {
  const formatted = Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, "");

  return `${formatted} SAR`;
}

function isPiracyStore(store: string | null) {
  return (store || "").toLowerCase().includes("piracy");
}

function getGenres(log: PlayLog) {
  const game = getGame(log);
  return game?.genres?.filter(Boolean) || [];
}

function getStartedDate(log: PlayLog) {
  const game = getGame(log);
  return game?.date_started || game?.date_of_purchase || null;
}

function getPurchaseDate(log: PlayLog) {
  const game = getGame(log);
  return game?.date_of_purchase || null;
}

function getCompletionDate(log: PlayLog) {
  const game = getGame(log);
  return game?.completion_last_played || null;
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDaysBetween(start: string | null, end: string | null) {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (!startDate || !endDate || endDate < startDate) return null;

  return Math.max(
    1,
    Math.round((endDate.getTime() - startDate.getTime()) / 86400000)
  );
}

function formatDuration(days: number | null) {
  if (!days) return "-";
  if (days >= 365) return `${(days / 365).toFixed(1)}y`;
  if (days >= 30) return `${Math.round(days / 30)}mo`;
  return `${days}d`;
}

function formatPercent(value: number) {
  if (value > 0 && value < 1) return "<1%";
  return `${Math.round(value)}%`;
}

function buildTimelineGames(
  logs: PlayLog[],
  monthHours: Record<number, number>,
  year: number
) {
  return logs.map((log) => {
    const game = getGame(log);
    const hours = Number(log.hours || 0);
    const monthTotal = monthHours[log.month] || 0;
    const startedYear = getYear(getStartedDate(log));

    return {
      id: log.game_id,
      title: game?.title || log.title,
      hours,
      month: log.month,
      percent: monthTotal > 0 ? (hours / monthTotal) * 100 : 0,
      cover: getCover(log),
      wideCover: getWideCover(log),
      firstPlayedThisYear: getFirstPlayedYear(log) === year,
      returningThisYear: !!startedYear && startedYear < year,
      platform: getPlatform(log),
      hardware: getHardware(log),
      releaseYear: getYear(game?.release),
      status: getStatus(log),
      score: getScore(log),
      price: getPrice(log),
      store: getStore(log),
      genres: getGenres(log),
      startedDate: getStartedDate(log),
      purchaseDate: getPurchaseDate(log),
      completionDate: getCompletionDate(log),
    };
  });
}

function buildArchiveTimelineGames(
  games: ArchiveGame[],
  monthHours: Record<number, number>,
  year: number
) {
  return games.map((game) => {
    const month = getMonth(game.completion_last_played) || 1;
    const hours = Number(game.hours_played || 0);
    const monthTotal = monthHours[month] || 0;
    const startedYear =
      getYear(game.date_started) || getYear(game.date_of_purchase);

    return {
      id: game.id,
      title: game.title || "Untitled",
      hours,
      month,
      percent: monthTotal > 0 ? (hours / monthTotal) * 100 : 0,
      cover: game.steam_vertical_cover || game.cover_url || null,
      wideCover:
        game.wide_cover_url ||
        game.cover_url ||
        game.steam_vertical_cover ||
        null,
      firstPlayedThisYear: startedYear === year,
      returningThisYear: false,
      platform: game.platform || null,
      hardware: game.hardware || game.platform || game.store || "Unknown",
      releaseYear: getYear(game.release),
      status: game.status || null,
      score: Number(game.score || 0),
      price: parsePrice(game.price),
      store: game.store || null,
      genres: game.genres?.filter(Boolean) || [],
      startedDate: game.date_started || game.date_of_purchase || null,
      purchaseDate: game.date_of_purchase,
      completionDate: game.completion_last_played,
    };
  });
}

function groupByMonth(games: TimelineGame[]) {
  const groups = games.reduce<Record<number, TimelineGame[]>>((groups, game) => {
    if (!groups[game.month]) groups[game.month] = [];
    groups[game.month].push(game);
    return groups;
  }, {});

  for (const month of Object.keys(groups)) {
    groups[Number(month)].sort(
      (a, b) => b.hours - a.hours || a.title.localeCompare(b.title)
    );
  }

  return groups;
}

function getDeviceStats(games: TimelineGame[]) {
  const stats = games.reduce<
    Record<string, { label: string; hours: number; gameIds: Set<number> }>
  >((groups, game) => {
    const label = game.hardware;
    if (!groups[label]) {
      groups[label] = { label, hours: 0, gameIds: new Set<number>() };
    }

    groups[label].hours += game.hours;
    groups[label].gameIds.add(game.id);
    return groups;
  }, {});

  return Object.values(stats).sort((a, b) => b.hours - a.hours);
}

function getTopGames(
  games: TimelineGame[],
  totalHours: number,
  limit = 3
) {
  const topGames = games.reduce<
    Record<number, Omit<TopGame, "percent" | "months"> & { months: Set<number> }>
  >((groups, game) => {
    if (!groups[game.id]) {
      groups[game.id] = {
        id: game.id,
        title: game.title,
        hours: 0,
        cover: game.cover,
        platform: game.platform,
        months: new Set<number>(),
      };
    }

    groups[game.id].hours += game.hours;
    groups[game.id].months.add(game.month);
    if (!groups[game.id].cover && game.cover) groups[game.id].cover = game.cover;
    if (!groups[game.id].platform && game.platform) {
      groups[game.id].platform = game.platform;
    }

    return groups;
  }, {});

  return Object.values(topGames)
    .map((game) => ({
      ...game,
      percent: totalHours > 0 ? (game.hours / totalHours) * 100 : 0,
      months: Array.from(game.months).sort((a, b) => a - b),
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, limit);
}

function getTopGenres(games: TimelineGame[]) {
  const genres = games.reduce<Record<string, { label: string; hours: number }>>(
    (groups, game) => {
      const gameGenres = game.genres.length > 0 ? game.genres : ["Unknown"];

      gameGenres.forEach((genre) => {
        if (!groups[genre]) groups[genre] = { label: genre, hours: 0 };
        groups[genre].hours += game.hours;
      });

      return groups;
    },
    {}
  );

  return Object.values(genres).sort((a, b) => b.hours - a.hours).slice(0, 5);
}

function getCompletionSpotlight(games: TimelineGame[], selectedYear: number) {
  const completedGames = games.filter(
    (game) =>
      game.status === "Completed" &&
      getYear(game.completionDate) === selectedYear
  );
  const uniqueCompleted = new Set(completedGames.map((game) => game.id));
  const longest = completedGames.reduce<
    | (TimelineGame & {
        daysToComplete: number;
      })
    | null
  >((current, game) => {
    const daysToComplete = getDaysBetween(game.startedDate, game.completionDate);
    if (!daysToComplete) return current;
    if (!current || daysToComplete > current.daysToComplete) {
      return { ...game, daysToComplete };
    }
    return current;
  }, null);

  return {
    count: uniqueCompleted.size,
    longest,
  };
}

function getCompletedPurchaseImpact(
  games: TimelineGame[],
  selectedYear: number
) {
  const completedByGame = games.reduce<Record<number, TimelineGame>>(
    (groups, game) => {
      if (
        game.status !== "Completed" ||
        getYear(game.completionDate) !== selectedYear
      ) {
        return groups;
      }

      if (!groups[game.id]) groups[game.id] = game;
      return groups;
    },
    {}
  );

  const completed = Object.values(completedByGame);
  const sameYear = completed.filter(
    (game) => getYear(game.purchaseDate) === selectedYear
  );
  const backlog = completed.filter((game) => {
    const purchaseYear = getYear(game.purchaseDate);
    return !!purchaseYear && purchaseYear < selectedYear;
  });
  const unknown = completed.length - sameYear.length - backlog.length;

  return {
    total: completed.length,
    sameYear,
    backlog,
    unknown,
  };
}

function getPaidPurchasesFromLibrary(
  games: LibraryGame[],
  selectedYear: number
) {
  return games
    .filter((game) => {
      const price = parsePrice(game.price);

      return (
        getYear(game.date_of_purchase) === selectedYear &&
        price > 0 &&
        !isPiracyStore(game.store)
      );
    })
    .map((game) => ({
      id: game.id,
      title: game.title || "Untitled",
      price: parsePrice(game.price),
      score: Number(game.score || 0),
      cover: game.steam_vertical_cover || game.cover_url || null,
      wideCover:
        game.wide_cover_url || game.cover_url || game.steam_vertical_cover || null,
      store: game.store,
      purchaseDate: game.date_of_purchase,
    }))
    .sort((a, b) => b.price - a.price || a.title.localeCompare(b.title))
    .slice(0, 10);
}

async function getAvailableStatsYears() {
  const { data: statsYears, error: statsYearsError } =
    await supabase.rpc("get_stats_years");

  if (!statsYearsError) {
    return ((statsYears || []) as StatsYearRow[])
      .map((item) => Number(item.year))
      .filter(Boolean);
  }

  const { data: yearsData, error: yearsError } = await supabase
    .from("monthly_play_logs")
    .select("year")
    .order("year", { ascending: false });

  if (yearsError) {
    throw yearsError;
  }

  return Array.from(
    new Set((yearsData || []).map((item) => Number(item.year)).filter(Boolean))
  ).sort((a, b) => b - a);
}

function getTopRatedCompletions(games: TimelineGame[], selectedYear: number) {
  const completed = games.reduce<Record<number, PurchaseGame>>(
    (groups, game) => {
      if (
        game.status !== "Completed" ||
        getYear(game.completionDate) !== selectedYear ||
        game.score <= 0
      ) {
        return groups;
      }

      if (!groups[game.id]) {
        groups[game.id] = {
          id: game.id,
          title: game.title,
          price: game.price,
          score: game.score,
          cover: game.cover,
          wideCover: game.wideCover,
          store: game.store,
          purchaseDate: game.purchaseDate,
        };
      }

      return groups;
    },
    {}
  );

  return Object.values(completed)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

function getReleaseMix(games: TimelineGame[], selectedYear: number) {
  return games.reduce(
    (mix, game) => {
      if (!game.releaseYear) {
        mix.unknown += game.hours;
      } else if (game.releaseYear === selectedYear) {
        mix.new += game.hours;
      } else if (game.releaseYear >= selectedYear - 4) {
        mix.recent += game.hours;
      } else {
        mix.classic += game.hours;
      }

      return mix;
    },
    { new: 0, recent: 0, classic: 0, unknown: 0 }
  );
}

function conicGradient(items: { value: number; color: string }[]) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) return "#18181b";

  let cursor = 0;
  const stops = items.map((item) => {
    const start = cursor;
    cursor += (item.value / total) * 100;
    return `${item.color} ${start}% ${cursor}%`;
  });

  return `conic-gradient(${stops.join(", ")})`;
}

function GamePoster({
  game,
}: {
  game: TimelineGame;
  isMonthlyChampion?: boolean;
}) {
  const isDropped = game.status?.toLowerCase() === "dropped";

  return (
    <Link
      href={`/game/${game.id}`}
      className={`group relative block aspect-[2/3] min-h-[150px] overflow-hidden rounded-lg bg-zinc-950 shadow-[0_18px_32px_rgba(0,0,0,0.42)] ${
        isDropped
          ? "border-2 border-red-500/80 shadow-[0_0_26px_rgba(239,68,68,0.28),0_18px_32px_rgba(0,0,0,0.42)]"
          : "border border-zinc-800"
      }`}
      title={game.title}
    >
      {game.cover ? (
        <img
          src={game.cover}
          alt={game.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-3xl font-black text-zinc-600">
          {game.title.slice(0, 2)}
        </div>
      )}

      {isDropped ? (
        <div className="absolute left-0 top-0 bg-red-500 px-2 py-1 text-[9px] font-black uppercase leading-none text-white shadow-[0_0_14px_rgba(239,68,68,0.55)]">
          Dropped
        </div>
      ) : game.returningThisYear ? (
        <div className="absolute left-0 top-0 bg-violet-400 px-2 py-1 text-[9px] font-black uppercase leading-none text-black">
          Returning
        </div>
      ) : null}

      {isDropped && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-red-500/10 via-transparent to-red-950/25" />
      )}

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-md bg-zinc-100 px-2 py-0.5 text-[11px] font-black text-zinc-950">
        {formatPercent(game.percent)}
      </div>

      <div className="pointer-events-none absolute inset-x-2 bottom-8 translate-y-2 rounded-lg border border-zinc-700 bg-zinc-950/95 p-2 text-left opacity-0 shadow-2xl transition duration-200 group-hover:translate-y-0 group-hover:opacity-100">
        <p className="line-clamp-2 text-[11px] font-black leading-tight text-white">
          {game.title}
        </p>
        <p className="mt-1 text-[10px] font-semibold text-zinc-300">
          {game.hours.toFixed(1)}h in {monthShortNames[game.month]} -{" "}
          {formatPercent(game.percent)} of month
        </p>
        <p className="mt-1 text-[10px] font-semibold text-zinc-500">
          {game.hardware}
        </p>
      </div>
    </Link>
  );
}

function TopGameCard({
  game,
}: {
  game: TopGame;
}) {
  const platformIcon = getIcon(game.platform);

  return (
    <Link
      href={`/game/${game.id}`}
      className="group relative block aspect-[2/3] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
    >
      {game.cover ? (
        <img
          src={game.cover}
          alt={game.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-4xl font-black text-zinc-600">
          {game.title.slice(0, 2)}
        </div>
      )}

      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
        {platformIcon ? (
          <img
            src={platformIcon}
            alt=""
            title={game.platform || ""}
            className="h-5 w-5 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
          />
        ) : (
          <div />
        )}
        <div className="rounded-full border border-white/15 bg-black/70 px-3 py-1 text-xs font-black text-white backdrop-blur">
          {formatPercent(game.percent)}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-16">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-black">{Math.round(game.hours)}h</p>
            <p className="text-[10px] font-bold uppercase text-zinc-500">
              Playtime
            </p>
          </div>
          <p className="max-w-28 text-right text-xs font-semibold text-zinc-400">
            {game.months.map((month) => monthShortNames[month]).join(", ")}
          </p>
        </div>
      </div>
    </Link>
  );
}

function StatTile({
  value,
  label,
  sublabel,
}: {
  value: string | number;
  label: string;
  sublabel?: string;
}) {
  return (
    <div className="min-h-36 rounded-xl border border-zinc-800 bg-zinc-900/75 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <p className="text-5xl font-black leading-none text-white md:text-6xl">
        {value}
      </p>
      <p className="mt-2 text-sm font-black uppercase text-white">{label}</p>
      {sublabel && (
        <p className="mt-1 text-xs font-semibold text-zinc-400">{sublabel}</p>
      )}
    </div>
  );
}

function StoreBadge({ store }: { store: string | null }) {
  const icon = getIcon(store);

  return icon ? (
    <img
      src={icon}
      alt=""
      title={store || "Unknown store"}
      className="h-5 w-5 object-contain"
    />
  ) : (
    <span
      title={store || "Unknown store"}
      className="inline-flex h-5 w-5 items-center justify-center text-[10px] font-black text-zinc-400"
    >
      {(store || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

export default async function StatsPage({ searchParams }: StatsPageProps) {
  const params = await searchParams;

  const availableYears = await getAvailableStatsYears();
  const selectedYear = Number(params.year || availableYears[0] || new Date().getFullYear());
  const useArchiveTimeline = selectedYear < 2024;
  const purchaseYearStart = `${selectedYear}-01-01`;
  const purchaseYearEnd = `${selectedYear + 1}-01-01`;
  const completionYearStart = `${selectedYear}-01-01`;
  const completionYearEnd = `${selectedYear + 1}-01-01`;

  const [logsResult, libraryGamesResult, archiveGamesResult] = await Promise.all([
    supabase
      .from("monthly_play_logs")
      .select(
        `
          log_id,
          game_id,
          title,
          hours,
          month,
          year,
          games (
            id,
            title,
            release,
            date_started,
            date_of_purchase,
            completion_last_played,
            steam_vertical_cover,
            cover_url,
            wide_cover_url,
            platform,
            hardware,
            store,
            status,
            score,
            price,
            genres
          )
        `
      )
      .eq("year", selectedYear)
      .order("month", { ascending: true })
      .order("hours", { ascending: false }),
    supabase
      .from("games")
      .select(
        `
          id,
          title,
          date_of_purchase,
          steam_vertical_cover,
          cover_url,
          wide_cover_url,
          store,
          score,
          price
        `
      )
      .gte("date_of_purchase", purchaseYearStart)
      .lt("date_of_purchase", purchaseYearEnd),
    supabase
      .from("games")
      .select(
        `
          id,
          title,
          release,
          date_started,
          date_of_purchase,
          completion_last_played,
          steam_vertical_cover,
          cover_url,
          wide_cover_url,
          platform,
          hardware,
          store,
          status,
          score,
          price,
          hours_played,
          genres
        `
      )
      .gte("completion_last_played", completionYearStart)
      .lt("completion_last_played", completionYearEnd)
      .order("completion_last_played", { ascending: true })
      .order("hours_played", { ascending: false }),
  ]);

  if (logsResult.error) {
    throw logsResult.error;
  }

  if (libraryGamesResult.error) {
    throw libraryGamesResult.error;
  }

  if (archiveGamesResult.error) {
    throw archiveGamesResult.error;
  }

  const logs = (logsResult.data || []) as unknown as PlayLog[];
  const archiveGames = (archiveGamesResult.data || []) as ArchiveGame[];
  const archiveMonthHours = archiveGames.reduce<Record<number, number>>(
    (totals, game) => {
      const month = getMonth(game.completion_last_played) || 1;
      totals[month] = (totals[month] || 0) + Number(game.hours_played || 0);
      return totals;
    },
    {}
  );
  const logMonthHours = logs.reduce<Record<number, number>>((totals, log) => {
    totals[log.month] = (totals[log.month] || 0) + Number(log.hours || 0);
    return totals;
  }, {});
  const timelineGames = useArchiveTimeline
    ? buildArchiveTimelineGames(archiveGames, archiveMonthHours, selectedYear)
    : buildTimelineGames(logs, logMonthHours, selectedYear);
  const totalHours = timelineGames.reduce((sum, game) => sum + game.hours, 0);
  const gamesByMonth = groupByMonth(timelineGames);
  const months = Object.keys(gamesByMonth).map(Number).sort((a, b) => a - b);
  const completedGames = timelineGames.filter(
    (game) => game.status === "Completed"
  );
  const completedHours = completedGames.reduce(
    (sum, game) => sum + game.hours,
    0
  );
  const topGames = getTopGames(completedGames, completedHours, 5);
  const paidPurchases = getPaidPurchasesFromLibrary(
    (libraryGamesResult.data || []) as LibraryGame[],
    selectedYear
  );
  const topRatedCompletions = getTopRatedCompletions(
    timelineGames,
    selectedYear
  );
  const uniqueGameIds = new Set(timelineGames.map((game) => game.id));
  const newGames = timelineGames.filter((game) => game.firstPlayedThisYear);
  const newDiscoveryHours = newGames.reduce((sum, game) => sum + game.hours, 0);
  const newDiscoveries = getTopGames(newGames, newDiscoveryHours).slice(0, 5);
  const completedPurchaseImpact = getCompletedPurchaseImpact(
    timelineGames,
    selectedYear
  );
  const deviceStats = getDeviceStats(timelineGames);
  const topDevice = deviceStats[0];
  const topGenres = getTopGenres(timelineGames);
  const topGenre = topGenres[0];
  const completionSpotlight = getCompletionSpotlight(
    timelineGames,
    selectedYear
  );
  const releaseMix = getReleaseMix(timelineGames, selectedYear);
  const releaseTotal =
    releaseMix.new + releaseMix.recent + releaseMix.classic + releaseMix.unknown;
  const newReleasePercent =
    releaseTotal > 0 ? Math.round((releaseMix.new / releaseTotal) * 100) : 0;
  const monthTotals = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const games = gamesByMonth[month] || [];
    return {
      month,
      total: games.reduce((sum, game) => sum + game.hours, 0),
      games: games.slice(0, 4),
    };
  });
  const bestMonth = [...monthTotals].sort((a, b) => b.total - a.total)[0];
  const activeMonths = monthTotals.filter((month) => month.total > 0);
  const quietMonth = [...activeMonths].sort((a, b) => a.total - b.total)[0];
  const peakQuietDelta =
    bestMonth && quietMonth ? Math.max(bestMonth.total - quietMonth.total, 0) : 0;
  const maxMonthTotal = Math.max(...monthTotals.map((month) => month.total), 1);
  const yearPersonality = topGenre?.label || topDevice?.label || "Mixed";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070a0f] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(24,24,27,0.7),rgba(7,10,15,0.88)_34%,rgba(7,10,15,1)),linear-gradient(135deg,rgba(34,211,238,0.09),transparent_38%,rgba(139,92,246,0.08))]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative mx-auto max-w-7xl px-4 py-6 md:px-8">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:border-zinc-500"
          >
            Back to Library
          </Link>

          {availableYears.length > 0 && (
            <StatsYearSelect
              years={availableYears}
              selectedYear={selectedYear}
            />
          )}
        </header>

        <section className="pt-14 text-center md:pt-20">
          <p className="text-sm font-black uppercase tracking-[0.36em] text-cyan-300">
            Game Replay {selectedYear}
          </p>
          <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
            Explore the games you played this year
          </h1>

          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile value={uniqueGameIds.size} label="Games Played" />
            <StatTile value={Math.round(totalHours)} label="Hours Played" />
            <StatTile value={newGames.length} label="New Games" />
            <StatTile
              value={bestMonth?.total ? monthShortNames[bestMonth.month] : "-"}
              label="Top Month"
              sublabel={
                bestMonth?.total
                  ? `${Math.round(bestMonth.total)} hours`
                  : undefined
              }
            />
          </div>
        </section>

        {timelineGames.length === 0 ? (
          <section className="mx-auto mt-16 max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8 text-center">
            <h2 className="text-2xl font-black">No playtime logged yet</h2>
            <p className="mt-3 text-sm font-semibold text-zinc-400">
              {useArchiveTimeline
                ? `Add completed games for ${selectedYear} and this replay will fill in.`
                : `Add monthly logs for ${selectedYear} and this replay will fill in.`}
            </p>
          </section>
        ) : (
          <>
            <section className="mx-auto mt-16 max-w-6xl">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-300">
                    Finished highlights
                  </p>
                  <h2 className="mt-2 text-3xl font-black">
                    Top Completed Games
                  </h2>
                </div>
                <p className="hidden max-w-sm text-right text-sm font-semibold text-zinc-500 md:block">
                  {useArchiveTimeline
                    ? "Ranked by total playtime from games completed this year."
                    : "Ranked by logged playtime from games marked Completed."}
                </p>
              </div>

              {topGames.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {topGames.map((game) => (
                    <TopGameCard
                      key={game.id}
                      game={game}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 text-sm font-semibold text-zinc-400">
                  No completed games with logged playtime in {selectedYear} yet.
                </div>
              )}
            </section>

            <section className="mx-auto mt-16 max-w-6xl">
              <div className="mb-5">
                <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-300">
                  Collection highlights
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  Premium Picks & Best Finishes
                </h2>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/80">
                  <div className="border-b border-zinc-800 p-5">
                    <p className="text-xs font-black uppercase text-zinc-500">
                      Paid purchases
                    </p>
                    <h3 className="mt-2 text-2xl font-black">
                      Most Expensive Bought Games
                    </h3>
                    <p className="mt-2 text-sm font-semibold text-zinc-400">
                      Paid games bought in {selectedYear}, excluding free and
                      piracy entries.
                    </p>
                  </div>

                  {paidPurchases.length > 0 ? (
                    <div>
                      {paidPurchases.map((game, index) => (
                        <Link
                          key={game.id}
                          href={`/game/${game.id}`}
                          className={`grid grid-cols-[96px_1fr_auto] items-center gap-4 p-4 transition hover:bg-zinc-900 sm:grid-cols-[116px_1fr_auto] ${
                            index > 0 ? "border-t border-zinc-800" : ""
                          }`}
                        >
                          <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-zinc-900">
                            {game.wideCover ? (
                              <img
                                src={game.wideCover}
                                alt={game.title}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-black text-zinc-600">
                                {game.title.slice(0, 2)}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="line-clamp-1 text-sm font-black">
                              {game.title}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <StoreBadge store={game.store} />
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-xl font-black text-cyan-300">
                              {formatPrice(game.price)}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="p-5 text-sm font-semibold text-zinc-500">
                      No paid purchases found for {selectedYear}.
                    </p>
                  )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/80">
                  <div className="border-b border-zinc-800 p-5">
                    <p className="text-xs font-black uppercase text-zinc-500">
                      Finished quality
                    </p>
                    <h3 className="mt-2 text-2xl font-black">
                      Highest Rated Finished Games
                    </h3>
                    <p className="mt-2 text-sm font-semibold text-zinc-400">
                      Completed in {selectedYear}, ranked by your score.
                    </p>
                  </div>

                  {topRatedCompletions.length > 0 ? (
                    <div>
                      {topRatedCompletions.map((game, index) => (
                        <Link
                          key={game.id}
                          href={`/game/${game.id}`}
                          className={`grid grid-cols-[96px_1fr_auto] items-center gap-4 p-4 transition hover:bg-zinc-900 sm:grid-cols-[116px_1fr_auto] ${
                            index > 0 ? "border-t border-zinc-800" : ""
                          }`}
                        >
                          <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-zinc-900">
                            {game.wideCover ? (
                              <img
                                src={game.wideCover}
                                alt={game.title}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-black text-zinc-600">
                                {game.title.slice(0, 2)}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="line-clamp-1 text-sm font-black">
                              {game.title}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <StoreBadge store={game.store} />
                            </div>
                          </div>

                          <div className="flex h-12 min-w-12 items-center justify-center rounded-xl bg-emerald-400 px-3 text-xl font-black text-black">
                            {game.score}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="p-5 text-sm font-semibold text-zinc-500">
                      No scored completed games found for {selectedYear}.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="mx-auto mt-16 max-w-6xl rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 md:p-10">
              <div className="mb-8">
                <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-300">
                  Year insights
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  What shaped {selectedYear}
                </h2>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
                  <p className="text-xs font-black uppercase text-zinc-500">
                    Completion Spotlight
                  </p>
                  <p className="mt-4 text-5xl font-black">
                    {completionSpotlight.count}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-400">
                    games completed in {selectedYear}
                  </p>
                  <div className="mt-5 border-t border-zinc-800 pt-4">
                    <p className="text-xs font-black uppercase text-zinc-500">
                      Longest road
                    </p>
                    <p className="mt-2 line-clamp-2 text-lg font-black">
                      {completionSpotlight.longest?.title || "-"}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-cyan-300">
                      {formatDuration(
                        completionSpotlight.longest?.daysToComplete || null
                      )}{" "}
                      to complete
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
                  <p className="text-xs font-black uppercase text-zinc-500">
                    Most Played Genre
                  </p>
                  <p className="mt-4 text-3xl font-black">
                    {topGenre?.label || "-"}
                  </p>
                  <div className="mt-5 grid gap-3">
                    {topGenres.map((genre, index) => {
                      const percent =
                        totalHours > 0 ? (genre.hours / totalHours) * 100 : 0;

                      return (
                        <div key={genre.label}>
                          <div className="mb-1 flex justify-between text-xs font-black">
                            <span>{genre.label}</span>
                            <span>{formatPercent(percent)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-zinc-800">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(percent, 1)}%`,
                                backgroundColor: palette[index % palette.length],
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
                  <p className="text-xs font-black uppercase text-zinc-500">
                    Year Personality
                  </p>
                  <p className="mt-4 text-3xl font-black">
                    Mostly {yearPersonality}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-400">
                    Your year leaned toward{" "}
                    {topGenre ? "genre playtime" : "device playtime"}.
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-zinc-950 p-4">
                      <p className="text-xs font-black uppercase text-zinc-500">
                        Peak
                      </p>
                      <p className="mt-2 text-2xl font-black">
                        {bestMonth?.total
                          ? monthShortNames[bestMonth.month]
                          : "-"}
                      </p>
                      <p className="text-xs font-semibold text-zinc-500">
                        {Math.round(bestMonth?.total || 0)}h
                      </p>
                    </div>
                    <div className="rounded-lg bg-zinc-950 p-4">
                      <p className="text-xs font-black uppercase text-zinc-500">
                        Quiet
                      </p>
                      <p className="mt-2 text-2xl font-black">
                        {quietMonth?.total
                          ? monthShortNames[quietMonth.month]
                          : "-"}
                      </p>
                      <p className="text-xs font-semibold text-zinc-500">
                        {Math.round(quietMonth?.total || 0)}h
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-zinc-500">
                    Gap: {Math.round(peakQuietDelta)} hours
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
                  <p className="text-xs font-black uppercase text-zinc-500">
                    New Discoveries
                  </p>
                  <div className="mt-4 grid gap-3">
                    {newDiscoveries.length > 0 ? (
                      newDiscoveries.map((game, index) => (
                        <Link
                          key={game.id}
                          href={`/game/${game.id}`}
                          className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg bg-zinc-950 p-3 hover:bg-zinc-900"
                        >
                          <span className="text-sm font-black text-cyan-300">
                            #{index + 1}
                          </span>
                          <span className="line-clamp-1 text-sm font-black">
                            {game.title}
                          </span>
                          <span className="text-sm font-black text-zinc-300">
                            {Math.round(game.hours)}h
                          </span>
                        </Link>
                      ))
                    ) : (
                      <p className="text-sm font-semibold text-zinc-500">
                        No first-played games found for {selectedYear}.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
                  <p className="text-xs font-black uppercase text-zinc-500">
                    Backlog Impact
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-400">
                    Completed games by purchase year.
                  </p>
                  <div className="mt-5 grid gap-4">
                    {[
                      {
                        label: `Bought in ${selectedYear}`,
                        value: completedPurchaseImpact.sameYear.length,
                        color: "#22d3ee",
                      },
                      {
                        label: "Older backlog",
                        value: completedPurchaseImpact.backlog.length,
                        color: "#8b5cf6",
                      },
                    ].map((item) => {
                      const percent =
                        completedPurchaseImpact.total > 0
                          ? (item.value / completedPurchaseImpact.total) * 100
                          : 0;

                      return (
                        <div key={item.label}>
                          <div className="mb-1 flex justify-between text-sm font-black">
                            <span>{item.label}</span>
                            <span>{formatPercent(percent)}</span>
                          </div>
                          <div className="h-3 rounded-full bg-zinc-800">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(percent, 1)}%`,
                                backgroundColor: item.color,
                              }}
                            />
                          </div>
                          <p className="mt-1 text-xs font-semibold text-zinc-500">
                            {item.value} games
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  {completedPurchaseImpact.unknown > 0 && (
                    <p className="mt-4 text-xs font-semibold text-zinc-500">
                      {completedPurchaseImpact.unknown} completed games did not
                      have a purchase year.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="relative mx-auto mt-16 max-w-6xl border-t border-zinc-800 pt-8">
              <div className="absolute left-1/2 top-0 hidden h-full -translate-x-1/2 border-l-4 border-dotted border-zinc-700 md:block" />

              <div className="space-y-12 md:space-y-0">
                {months.map((month, index) => {
                  const games = gamesByMonth[month].slice(0, 8);
                  const isRight = index % 2 === 0;

                  return (
                    <div
                      key={month}
                      className="relative grid gap-4 md:grid-cols-2 md:gap-8"
                    >
                      <div className="absolute left-1/2 top-7 hidden h-4 w-4 -translate-x-1/2 rounded-full border-4 border-[#070a0f] bg-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,0.45)] md:block" />
                      <div
                        className={`absolute top-9 hidden w-8 border-t border-zinc-700 md:block ${
                          isRight ? "left-1/2" : "right-1/2"
                        }`}
                      />

                      <div
                        className={`${
                          isRight
                            ? "md:col-start-2 md:pl-5"
                            : "md:col-start-1 md:pr-5"
                        }`}
                      >
                        <div
                          className={`mb-2 text-xs font-black uppercase ${
                            isRight ? "md:text-left" : "md:text-right"
                          }`}
                        >
                          {monthNames[month]}
                        </div>

                        <div
                          className={`grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:flex md:flex-wrap ${
                            isRight
                              ? "md:flex-row"
                              : "md:flex-row-reverse"
                          }`}
                        >
                          {games.map((game) => (
                            <div
                              key={`${month}-${game.id}`}
                              className="md:w-[calc((100%-18px)/4)]"
                            >
                              <GamePoster game={game} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="relative mx-auto mt-24 max-w-6xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 md:p-10">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),transparent_45%,rgba(139,92,246,0.08))]" />
              <div className="relative text-center">
                <h2 className="text-3xl font-black">
                  You played on {deviceStats.length > 1 ? "more than one device" : topDevice?.label}
                </h2>

                <div className="mt-10 grid gap-10 md:grid-cols-[1fr_1.2fr] md:items-center">
                  <div className="mx-auto flex aspect-square w-full max-w-sm items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/70 p-8">
                    <div
                      className="aspect-square w-full rounded-full"
                      style={{
                        background: conicGradient(
                          deviceStats.map((item, index) => ({
                            value: item.hours,
                            color: palette[index % palette.length],
                          }))
                        ),
                      }}
                    >
                      <div className="m-auto flex h-full w-full scale-[0.52] items-center justify-center rounded-full bg-[#070a0f] text-center">
                        <div>
                          <p className="text-4xl font-black">
                            {topDevice ? Math.round(topDevice.hours) : 0}
                          </p>
                          <p className="text-xs font-black uppercase text-zinc-400">
                            Top device hours
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 text-left">
                    {deviceStats.slice(0, 5).map((item, index) => {
                      const percent =
                        totalHours > 0 ? (item.hours / totalHours) * 100 : 0;

                      return (
                        <div key={item.label}>
                          <div className="mb-1 flex items-center justify-between text-sm font-black">
                            <span className="flex items-center gap-2">
                              <span
                                className="h-3 w-3"
                                style={{
                                  backgroundColor:
                                    palette[index % palette.length],
                                }}
                              />
                              {item.label}
                            </span>
                            <span>{formatPercent(percent)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-zinc-800">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(percent, 1)}%`,
                                backgroundColor: palette[index % palette.length],
                              }}
                            />
                          </div>
                          <p className="mt-1 text-xs font-semibold text-zinc-500">
                            {Math.round(item.hours)} hours, {item.gameIds.size} games
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="mx-auto mt-20 max-w-6xl rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 md:p-10">
              <h2 className="text-center text-3xl font-black">
                Your Playtime by Month
              </h2>

              <div className="mt-10 flex h-80 items-end gap-3 border-b border-zinc-800">
                {monthTotals.map((month) => {
                  const height = Math.max((month.total / maxMonthTotal) * 100, month.total > 0 ? 2 : 0);

                  return (
                    <div
                      key={month.month}
                      className="flex h-full flex-1 flex-col justify-end gap-1"
                      title={`${monthShortNames[month.month]}: ${month.total.toFixed(1)} hours`}
                    >
                      <div className="flex flex-1 items-end">
                        <div
                          className="w-full overflow-hidden rounded-t-md bg-cyan-400/80"
                          style={{ height: `${height}%` }}
                        >
                          {month.games.map((game, index) => (
                            <div
                              key={`${month.month}-${game.id}-${index}`}
                              className="w-full"
                              style={{
                                height: `${Math.max(
                                  (game.hours / Math.max(month.total, 1)) * 100,
                                  8
                                )}%`,
                                backgroundColor: palette[index % palette.length],
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="-rotate-45 pb-2 text-[10px] font-black uppercase text-zinc-400">
                        {monthShortNames[month.month]}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="mx-auto mt-20 mb-12 max-w-6xl rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 md:p-10">
              <div className="grid gap-10 md:grid-cols-[260px_1fr_1fr] md:items-center">
                <div>
                  <p className="text-sm font-black">
                    New, Recent, and Classic Games
                  </p>
                  <div
                    className="mt-8 aspect-square max-w-56 rounded-full"
                    style={{
                      background: conicGradient([
                        { value: releaseMix.new, color: "#22d3ee" },
                        { value: releaseMix.recent, color: "#8b5cf6" },
                        { value: releaseMix.classic, color: "#f59e0b" },
                        { value: releaseMix.unknown, color: "#64748b" },
                      ]),
                    }}
                  >
                    <div className="m-auto h-full w-full scale-[0.45] rounded-full bg-zinc-950" />
                  </div>
                </div>

                <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-7 text-white">
                  <p className="text-5xl font-black">{newReleasePercent}%</p>
                  <h3 className="mt-3 text-xl font-black">New Releases</h3>
                  <p className="mt-3 max-w-md text-sm font-semibold text-zinc-300">
                    The percentage of playtime you had in new releases, games
                    released in {selectedYear}.
                  </p>
                </div>

                <div className="rounded-xl border-2 border-dotted border-zinc-700 p-7">
                  <p className="text-5xl font-black text-cyan-300">
                    {Math.round(totalHours)}h
                  </p>
                  <h3 className="mt-3 text-xl font-black">Total Playtime</h3>
                  <p className="mt-3 max-w-md text-sm font-semibold text-zinc-300">
                    Your logged playtime across {uniqueGameIds.size} games in{" "}
                    {selectedYear}.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

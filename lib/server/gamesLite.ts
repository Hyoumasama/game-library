import { getAchievementBadge, stripGameAchievements } from "@/lib/gameMappers";
import type { DbGame } from "@/lib/gameTypes";
import { supabase } from "@/lib/supabase";

export const GAMES_LITE_PAGE_SIZE = 24;

export type GamesLiteFilters = {
  search: string;
  status: string;
  store: string;
  release: string;
  completion: string;
  genres: string[];
};

export type GamesLiteFilterOptions = {
  stores: string[];
  years: string[];
  completionYears: string[];
  genres: string[];
};

export type GamesLiteData = {
  games: DbGame[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: {
    total_games: number;
    completed_games: number;
    total_hours: number;
    avg_score: number;
  };
  filters: GamesLiteFilterOptions;
};

type SortColumn =
  | "id"
  | "hours_played"
  | "completion_last_played"
  | "score"
  | "release"
  | "date_of_purchase";

type GamesLiteQueryResult = {
  data: DbGame[] | null;
  error: { message: string } | null;
  count: number | null;
};

type GamesLiteFilterableQuery<T> = {
  ilike(column: string, pattern: string): T;
  eq(column: string, value: string): T;
  gte(column: string, value: string): T;
  lt(column: string, value: string): T;
  contains(column: string, value: string[]): T;
};

interface GamesLiteQuery extends GamesLiteFilterableQuery<GamesLiteQuery> {
  is(column: string, value: null): GamesLiteQuery;
  order(
    column: SortColumn,
    options: { ascending: boolean; nullsFirst: boolean }
  ): GamesLiteQuery;
  range(from: number, to: number): PromiseLike<GamesLiteQueryResult>;
}

type GamesLiteStatsRow = {
  status?: string | null;
  hours_played?: string | number | null;
  score?: string | number | null;
};

type GamesLiteStatsQueryResult = {
  data: GamesLiteStatsRow[] | null;
  error: { message: string } | null;
};

interface GamesLiteStatsQuery
  extends GamesLiteFilterableQuery<GamesLiteStatsQuery> {
  range(from: number, to: number): PromiseLike<GamesLiteStatsQueryResult>;
}

const sortOptions: Record<
  string,
  {
    column: SortColumn;
    ascending: boolean;
  }
> = {
  default: {
    column: "id",
    ascending: false,
  },
  "hours-high": {
    column: "hours_played",
    ascending: false,
  },
  "hours-low": {
    column: "hours_played",
    ascending: true,
  },
  "completion-newest": {
    column: "completion_last_played",
    ascending: false,
  },
  "completion-oldest": {
    column: "completion_last_played",
    ascending: true,
  },
  "score-high": {
    column: "score",
    ascending: false,
  },
  "score-low": {
    column: "score",
    ascending: true,
  },
  "release-newest": {
    column: "release",
    ascending: false,
  },
  "release-oldest": {
    column: "release",
    ascending: true,
  },
  "recently-added": {
    column: "date_of_purchase",
    ascending: false,
  },
};

function normalizeYearFilter(value: string) {
  const trimmed = value.trim();

  return /^\d{4}$/.test(trimmed) ? trimmed : "All";
}

function normalizeGamesLiteFilters(filters: GamesLiteFilters): GamesLiteFilters {
  const seenGenres = new Set<string>();
  const genres = filters.genres
    .map((genre) => genre.trim())
    .filter((genre) => {
      const key = genre.toLowerCase();
      const keep = Boolean(genre) && !seenGenres.has(key);
      seenGenres.add(key);
      return keep;
    });

  return {
    search: filters.search.trim().slice(0, 120),
    status: filters.status.trim() || "All",
    store: filters.store.trim() || "All",
    release: normalizeYearFilter(filters.release),
    completion: normalizeYearFilter(filters.completion),
    genres,
  };
}

function applyGameFilters<T extends GamesLiteFilterableQuery<T>>(
  query: T,
  filters: GamesLiteFilters
) {
  const { search, status, store, release, completion, genres } = filters;
  let filteredQuery = query;

  if (search) {
    filteredQuery = filteredQuery.ilike("title", `%${search}%`);
  }

  if (status && status !== "All") {
    filteredQuery = filteredQuery.eq("status", status);
  }

  if (store && store !== "All") {
    filteredQuery = filteredQuery.eq("store", store);
  }

  if (release && release !== "All") {
    filteredQuery = filteredQuery
      .gte("release", `${release}-01-01`)
      .lt("release", `${Number(release) + 1}-01-01`);
  }

  if (genres.length > 0) {
    filteredQuery = filteredQuery.contains("genres", genres);
  }

  if (completion && completion !== "All") {
    filteredQuery = filteredQuery
      .gte("completion_last_played", `${completion}-01-01`)
      .lt("completion_last_played", `${Number(completion) + 1}-01-01`);
  }

  return filteredQuery;
}

function calculateStats(games: GamesLiteStatsRow[]) {
  const scoredGames = games
    .map((game) => Number(game.score || 0))
    .filter((score) => Number.isFinite(score) && score > 0);

  return {
    total_games: games.length,
    completed_games: games.filter((game) => game.status === "Completed").length,
    total_hours: games.reduce(
      (total, game) => total + Number(game.hours_played || 0),
      0
    ),
    avg_score:
      scoredGames.length > 0
        ? Math.round(
            scoredGames.reduce((total, score) => total + score, 0) /
              scoredGames.length
          )
        : 0,
  };
}

export async function getGamesLiteData({
  filters,
  sort,
  page,
  pageSize = GAMES_LITE_PAGE_SIZE,
}: {
  filters: GamesLiteFilters;
  sort: string;
  page: number;
  pageSize?: number;
}): Promise<GamesLiteData> {
  const safeFilters = normalizeGamesLiteFilters(filters);
  const selectedSort = sortOptions[sort] || sortOptions.default;
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safePageSize =
    Number.isFinite(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 24;
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  const baseQuery = supabase
    .from("games")
    .select(
      `
        id,
        title,
        slug,
        release,
        date_started,
        date_of_purchase,
        completion_last_played,
        score,
        price,
        hours_played,
        status,
        store,
        platform,
        hardware,
        genres,
        cover_url,
        hero_url,
        steam_vertical_cover,
        wide_cover_url,
        summary,
        screenshots,
        developer,
        publisher,
        igdb_id,
        steam_appid,
        game_achievements (
          platinum,
          completion_percentage
        )
      `,
      { count: "exact" }
    ) as unknown as GamesLiteQuery;
  const statsQuery = supabase
    .from("games")
    .select("status, hours_played, score") as unknown as GamesLiteStatsQuery;

  const filteredQuery = applyGameFilters(baseQuery, safeFilters).order(
    selectedSort.column,
    {
      ascending: selectedSort.ascending,
      nullsFirst: false,
    }
  );

  const [gamesResult, statsResult, filtersResult] = await Promise.all([
    filteredQuery.range(from, to),
    applyGameFilters(statsQuery, safeFilters).range(0, 9999),
    supabase.rpc("get_games_lite_filters"),
  ]);

  if (gamesResult.error) {
    throw new Error(gamesResult.error.message);
  }

  if (statsResult.error) {
    throw new Error(statsResult.error.message);
  }

  if (filtersResult.error) {
    throw new Error(filtersResult.error.message);
  }

  const filterOptions = filtersResult.data?.[0] || {
    stores: [],
    years: [],
    completion_years: [],
    genres: [],
  };
  const games = ((gamesResult.data || []) as DbGame[]).map((game) => ({
    ...stripGameAchievements(game),
    achievement_badge: getAchievementBadge(game.game_achievements),
  })) as DbGame[];
  const stats = calculateStats(statsResult.data || []);
  const total = gamesResult.count || 0;

  return {
    games,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    stats,
    filters: {
      stores: filterOptions.stores || [],
      years: (filterOptions.years || []).map(String),
      completionYears: (filterOptions.completion_years || []).map(String),
      genres: filterOptions.genres || [],
    },
  };
}

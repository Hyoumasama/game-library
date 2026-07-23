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
  genre: string;
  steamAppId: string;
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

type GamesLiteQuery = {
  ilike(column: string, pattern: string): GamesLiteQuery;
  eq(column: string, value: string): GamesLiteQuery;
  gte(column: string, value: string): GamesLiteQuery;
  lt(column: string, value: string): GamesLiteQuery;
  contains(column: string, value: string[]): GamesLiteQuery;
  is(column: string, value: null): GamesLiteQuery;
  order(
    column: SortColumn,
    options: { ascending: boolean; nullsFirst: boolean }
  ): GamesLiteQuery;
  range(from: number, to: number): PromiseLike<GamesLiteQueryResult>;
};

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
  return {
    search: filters.search.trim().slice(0, 120),
    status: filters.status.trim() || "All",
    store: filters.store.trim() || "All",
    release: normalizeYearFilter(filters.release),
    completion: normalizeYearFilter(filters.completion),
    genre: filters.genre.trim() || "All",
    steamAppId: filters.steamAppId.trim() || "All",
  };
}

function applyGameFilters(query: GamesLiteQuery, filters: GamesLiteFilters) {
  const { search, status, store, release, completion, genre, steamAppId } =
    filters;
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

  if (genre && genre !== "All") {
    filteredQuery = filteredQuery.contains("genres", [genre]);
  }

  if (completion && completion !== "All") {
    filteredQuery = filteredQuery
      .gte("completion_last_played", `${completion}-01-01`)
      .lt("completion_last_played", `${Number(completion) + 1}-01-01`);
  }

  if (steamAppId === "missing") {
    filteredQuery = filteredQuery.is("steam_appid", null);
  }

  return filteredQuery;
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
        date_of_purchase,
        completion_last_played,
        score,
        price,
        hours_played,
        status,
        store,
        platform,
        hardware,
        genre,
        genres,
        cover_url,
        steam_vertical_cover,
        wide_cover_url,
        igdb_id,
        steam_appid,
        game_achievements (
          platinum,
          completion_percentage
        )
      `,
      { count: "exact" }
    ) as unknown as GamesLiteQuery;

  const filteredQuery = applyGameFilters(baseQuery, safeFilters).order(
    selectedSort.column,
    {
      ascending: selectedSort.ascending,
      nullsFirst: false,
    }
  );

  const [gamesResult, statsResult, filtersResult] = await Promise.all([
    filteredQuery.range(from, to),
    supabase.rpc("get_games_lite_stats", {
      p_search: safeFilters.search,
      p_status: safeFilters.status,
      p_store: safeFilters.store,
      p_release: safeFilters.release,
      p_completion: safeFilters.completion,
      p_genre: safeFilters.genre,
    }),
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
  const stats = statsResult.data?.[0] || {
    total_games: 0,
    completed_games: 0,
    total_hours: 0,
    avg_score: 0,
  };
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

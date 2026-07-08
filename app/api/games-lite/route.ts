import { getAchievementBadge, stripGameAchievements } from "@/lib/gameMappers";
import type { DbGame } from "@/lib/gameTypes";
import { supabase } from "@/lib/supabase";

type GameFilters = {
  search: string;
  status: string;
  store: string;
  release: string;
  completion: string;
  genre: string;
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
  order(
    column: SortColumn,
    options: { ascending: boolean; nullsFirst: boolean }
  ): GamesLiteQuery;
  range(from: number, to: number): PromiseLike<GamesLiteQueryResult>;
};

function applyGameFilters(query: GamesLiteQuery, filters: GameFilters) {
  const { search, status, store, release, completion, genre } = filters;
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

  return filteredQuery;
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || 24);
  const filters = {
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "",
    store: searchParams.get("store") || "",
    release: searchParams.get("release") || "",
    completion: searchParams.get("completion") || "",
    genre: searchParams.get("genre") || "",
  };
  const sort = searchParams.get("sort") || "";
  const selectedSort = sortOptions[sort] || sortOptions.default;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

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
          game_achievements (
            platinum,
            completion_percentage
          )
        `,
        { count: "exact" }
      ) as unknown as GamesLiteQuery;

  const filteredQuery = applyGameFilters(baseQuery, filters).order(selectedSort.column, {
    ascending: selectedSort.ascending,
    nullsFirst: false,
  });

  const [gamesResult, statsResult, filtersResult] = await Promise.all([
    filteredQuery.range(from, to),
    supabase.rpc("get_games_lite_stats", {
      p_search: filters.search,
      p_status: filters.status,
      p_store: filters.store,
      p_release: filters.release,
      p_completion: filters.completion,
      p_genre: filters.genre,
    }),
    supabase.rpc("get_games_lite_filters"),
  ]);

  if (gamesResult.error) {
    return Response.json({ error: gamesResult.error.message }, { status: 500 });
  }

  if (statsResult.error) {
    return Response.json({ error: statsResult.error.message }, { status: 500 });
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
  }));
  const stats = statsResult.data?.[0] || {
    total_games: 0,
    completed_games: 0,
    total_hours: 0,
    avg_score: 0,
  };

  return Response.json({
    games,
    total: gamesResult.count || 0,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((gamesResult.count || 0) / pageSize)),
    stats,
    filters: {
      stores: filterOptions.stores || [],
      years: (filterOptions.years || []).map(String),
      completionYears: (filterOptions.completion_years || []).map(String),
      genres: filterOptions.genres || [],
    },
  });
}

import { supabase } from "@/lib/supabase";
import { getAchievementBadge, stripGameAchievements } from "@/lib/gameMappers";

type GameFilters = {
  search: string;
  status: string;
  store: string;
  release: string;
  completion: string;
  genre: string;
};

function applyGameFilters(query: any, filters: GameFilters) {
  const { search, status, store, release, completion, genre } = filters;

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  if (status && status !== "All") {
    query = query.eq("status", status);
  }

  if (store && store !== "All") {
    query = query.eq("store", store);
  }

  if (release && release !== "All") {
    query = query
      .gte("release", `${release}-01-01`)
      .lt("release", `${Number(release) + 1}-01-01`);
  }

  if (genre && genre !== "All") {
    query = query.contains("genres", [genre]);
  }

  if (completion && completion !== "All") {
    query = query
      .gte("completion_last_played", `${completion}-01-01`)
      .lt("completion_last_played", `${Number(completion) + 1}-01-01`);
  }

  return query;
}

async function getFilteredStats(filters: GameFilters) {
  const pageSize = 1000;
  let from = 0;
  let totalCount = 0;
  let rows: Array<{
    status: string | null;
    hours_played: number | string | null;
    score: number | string | null;
  }> = [];

  while (true) {
    const query = applyGameFilters(
      supabase
        .from("games")
        .select("status, hours_played, score", { count: "exact" }),
      filters
    );
    const { data, error, count } = await query.range(
      from,
      from + pageSize - 1
    );

    if (error) {
      return { error: error.message, stats: null };
    }

    totalCount = count || totalCount;
    rows = [...rows, ...(data || [])];

    if (!data || data.length < pageSize) break;

    from += pageSize;
  }

  const scoreValues = rows
    .map((game) => Number(game.score || 0))
    .filter((score) => score > 0);

  return {
    error: null,
    stats: {
      total_games: totalCount,
      completed_games: rows.filter((game) => game.status === "Completed")
        .length,
      total_hours: rows.reduce(
        (total, game) => total + Number(game.hours_played || 0),
        0
      ),
      avg_score:
        scoreValues.length > 0
          ? Math.round(
              scoreValues.reduce((total, score) => total + score, 0) /
                scoreValues.length
            )
          : 0,
    },
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || 24);

  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const store = searchParams.get("store") || "";
  const release = searchParams.get("release") || "";
  const completion = searchParams.get("completion") || "";
  const sort = searchParams.get("sort") || "";
  const genre = searchParams.get("genre") || "";
  const filters = { search, status, store, release, completion, genre };

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
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
    );

  query = applyGameFilters(query, filters);

 const sortOptions: Record<
  string,
  {
    column:
      | "id"
      | "hours_played"
      | "completion_last_played"
      | "score"
      | "release"
      | "date_of_purchase";
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

const selectedSort = sortOptions[sort] || sortOptions.default;

query = query.order(selectedSort.column, {
  ascending: selectedSort.ascending,
  nullsFirst: false,
});

  const [gamesResult, statsResult, filtersResult] = await Promise.all([
    query.range(from, to),

    getFilteredStats(filters),

    supabase.rpc("get_games_lite_filters"),
  ]);

  const { data, error, count } = gamesResult;
  const { data: filtersData } = filtersResult;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (statsResult.error) {
    return Response.json({ error: statsResult.error }, { status: 500 });
  }

  const stats = statsResult.stats || {
    total_games: 0,
    completed_games: 0,
    total_hours: 0,
    avg_score: 0,
  };

  const filterOptions = filtersData?.[0] || {
  stores: [],
  years: [],
  completion_years: [],
  genres: [],
};

  const games = (data || []).map((game) => {
    return {
      ...stripGameAchievements(game),
      achievement_badge: getAchievementBadge(game.game_achievements),
    };
  });
  
  return Response.json({
    games,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
    stats,
    filters: {
  stores: filterOptions.stores || [],
  years: (filterOptions.years || []).map(String),
  completionYears: (filterOptions.completion_years || []).map(String),
  genres: filterOptions.genres || [],
},
  });
}

import { supabase } from "@/lib/supabase";


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

if (completion && completion !== "All") {
  query = query
    .gte("completion_last_played", `${completion}-01-01`)
    .lt("completion_last_played", `${Number(completion) + 1}-01-01`);
}

 const sortOptions: Record<
  string,
  {
    column: "id" | "hours_played" | "completion_last_played";
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
};

const selectedSort = sortOptions[sort] || sortOptions.default;

query = query.order(selectedSort.column, {
  ascending: selectedSort.ascending,
  nullsFirst: false,
});

  const { data, error, count } = await query.range(from, to);
  const { data: statsData } = await supabase.rpc("get_games_lite_stats", {
  p_search: search || null,
  p_status: status && status !== "All" ? status : null,
  p_store: store && store !== "All" ? store : null,
  p_release_year: release && release !== "All" ? Number(release) : null,
  p_completion_year:
    completion && completion !== "All" ? Number(completion) : null,
});

const stats = statsData?.[0] || {
  total_games: 0,
  completed_games: 0,
  total_hours: 0,
  avg_score: 0,
};

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

    const { data: filtersData } = await supabase.rpc(
  "get_games_lite_filters"
);

const filters = filtersData?.[0] || {
  stores: [],
  years: [],
  completion_years: [],
};

    const games = (data || []).map((game: any) => {
    const achievement = Array.isArray(game.game_achievements)
  ? game.game_achievements[0]
  : game.game_achievements;

    let achievement_badge = null;

    if (Number(achievement?.completion_percentage || 0) >= 100) {
      achievement_badge = "100completion";
    } else if (Number(achievement?.platinum || 0) > 0) {
      achievement_badge = "platinum";
    }

    const { game_achievements, ...cleanGame } = game;

    return {
      ...cleanGame,
      achievement_badge,
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
  stores: filters.stores || [],
  years: (filters.years || []).map(String),
  completionYears: (filters.completion_years || []).map(String),
},
  });
}
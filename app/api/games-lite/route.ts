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
        wide_cover_url
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

  if (sort === "completion-newest") {
    query = query.order("completion_last_played", {
      ascending: false,
      nullsFirst: false,
    });
  } else {
    query = query.order("id", { ascending: false });
  }

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

  return Response.json({
    games: data || [],
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
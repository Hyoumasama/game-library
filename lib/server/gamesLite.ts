import { getAchievementBadge, stripGameAchievements } from "@/lib/gameMappers";
import type { DbGame } from "@/lib/gameTypes";
import { supabase } from "@/lib/supabase";

export const GAMES_LITE_PAGE_SIZE = 24;
const SUPABASE_PAGE_SIZE = 1000;

export type GamesLiteFilters = {
  search: string;
  statuses: string[];
  stores: string[];
  releases: string[];
  completions: string[];
  genres: string[];
  playHistory?: string | null;
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
  in(column: string, values: string[]): T;
  gte(column: string, value: string): T;
  lt(column: string, value: string): T;
  contains(column: string, value: string[]): T;
  or(filters: string): T;
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

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();

  return values
    .map((value) => value.trim())
    .filter((value) => {
      const key = value.toLowerCase();
      const keep = Boolean(value) && key !== "all" && !seen.has(key);
      seen.add(key);
      return keep;
    });
}

function normalizeYearFilters(values: string[]) {
  return uniqueStrings(values).filter((value) => /^\d{4}$/.test(value));
}

function normalizeGamesLiteFilters(filters: GamesLiteFilters): GamesLiteFilters {
  return {
    search: filters.search.trim().slice(0, 120),
    statuses: uniqueStrings(filters.statuses),
    stores: uniqueStrings(filters.stores),
    releases: normalizeYearFilters(filters.releases),
    completions: normalizeYearFilters(filters.completions),
    genres: uniqueStrings(filters.genres),
    playHistory: (filters.playHistory || "").trim() || null,
  };
}

function applyGameFilters<T extends GamesLiteFilterableQuery<T>>(
  query: T,
  filters: GamesLiteFilters
) {
  const { search, statuses, stores, releases, completions, genres } = filters;
  let filteredQuery = query;

  if (search) {
    filteredQuery = filteredQuery.ilike("title", `%${search}%`);
  }

  if (statuses.length > 0) {
    filteredQuery = filteredQuery.in("status", statuses);
  }

  if (stores.length > 0) {
    filteredQuery = filteredQuery.in("store", stores);
  }

  if (releases.length > 0) {
    filteredQuery = filteredQuery.or(
      releases
        .map(
          (release) =>
            `and(release.gte.${release}-01-01,release.lt.${Number(release) + 1}-01-01)`
        )
        .join(",")
    );
  }

  if (genres.length > 0) {
    filteredQuery = filteredQuery.contains("genres", genres);
  }

  if (completions.length > 0) {
    filteredQuery = filteredQuery.or(
      completions
        .map(
          (completion) =>
            `and(completion_last_played.gte.${completion}-01-01,completion_last_played.lt.${Number(completion) + 1}-01-01)`
        )
        .join(",")
    );
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

async function fetchAllStatsRows(
  filters: GamesLiteFilters,
  options: { isNeverPlayed: boolean; completedIgdbIds: number[] }
) {
  const rows: GamesLiteStatsRow[] = [];
  let from = 0;

  while (true) {
    let query = applyGameFilters(
      supabase
        .from("games")
        .select("status, hours_played, score") as unknown as GamesLiteStatsQuery,
      filters
    );

    if (options.isNeverPlayed) {
      query = applyNeverPlayedToQuery(query, options.completedIgdbIds);
    }

    const { data, error } = await query.range(
      from,
      from + SUPABASE_PAGE_SIZE - 1
    );

    if (error) {
      throw new Error(error.message);
    }

    const pageRows = data || [];
    rows.push(...pageRows);

    if (pageRows.length < SUPABASE_PAGE_SIZE) break;

    from += SUPABASE_PAGE_SIZE;
  }

  return rows;
}

async function fetchCompletedIgdbIds() {
  const ids = new Set<number>();
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("games")
      .select("igdb_id")
      .neq("igdb_id", null)
      .eq("status", "Completed")
      .range(from, from + SUPABASE_PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const rows = data || [];

    rows
      .map((row) => Number(row.igdb_id))
      .filter(Boolean)
      .forEach((id) => ids.add(id));

    if (rows.length < SUPABASE_PAGE_SIZE) break;

    from += SUPABASE_PAGE_SIZE;
  }

  return Array.from(ids);
}

function applyNeverPlayedToQuery<T>(
  query: T,
  completedIds: number[]
) {
  let q: any = query;
  q = q.eq("status", "Unplayed");
  if (completedIds.length > 0) {
    const list = completedIds.join(",");
    q = q.not("igdb_id", "in", `(${list})`);
  }
  return q;
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
  const filteredQuery = applyGameFilters(baseQuery, safeFilters).order(
    selectedSort.column,
    {
      ascending: selectedSort.ascending,
      nullsFirst: false,
    }
  );

  // Apply 'Never Played' server-side filter before pagination/stats if requested
  const isNeverPlayed = (safeFilters.playHistory || "") === "never-played";

  // If Never Played, first collect igdb_ids that have Completed games globally
  let completedIgdbIds: number[] = [];

  if (isNeverPlayed) {
    completedIgdbIds = await fetchCompletedIgdbIds();
  }

  const gamesPromise = isNeverPlayed
    ? applyNeverPlayedToQuery(filteredQuery, completedIgdbIds).range(from, to)
    : filteredQuery.range(from, to);

  const statsPromise = fetchAllStatsRows(safeFilters, {
    isNeverPlayed,
    completedIgdbIds,
  });

  const [gamesResult, statsResult, filtersResult] = await Promise.all([
    gamesPromise,
    statsPromise,
    supabase.rpc("get_games_lite_filters"),
  ]);

  if (gamesResult.error) {
    throw new Error(gamesResult.error.message);
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
  // Compute "completed elsewhere" metadata without causing N+1 queries.
  // 1) Collect igdb_ids for games on this page that are Unplayed or Dropped
  const candidateIgdbIds = new Set<number>();

  games.forEach((g) => {
    const status = String(g.status || "");
    if (
      (status === "Unplayed" || status === "Dropped") &&
      g.igdb_id !== null &&
      g.igdb_id !== undefined
    ) {
      candidateIgdbIds.add(Number(g.igdb_id));
    }
  });

  const completedMap = new Map<number, { id: number; store: string | null; platform: string | null; hardware: string | null; }[]>();

  if (candidateIgdbIds.size > 0) {
    const igdbList = Array.from(candidateIgdbIds);

    const { data: completedRows, error: completedError } = await supabase
      .from("games")
      .select("id, igdb_id, store, platform, hardware")
      .in("igdb_id", igdbList)
      .eq("status", "Completed");

    if (completedError) {
      throw new Error(completedError.message);
    }

    (completedRows || []).forEach((row: any) => {
      const igdb = Number(row.igdb_id);
      const list = completedMap.get(igdb) || [];
      list.push({ id: Number(row.id), store: row.store || null, platform: row.platform || null, hardware: row.hardware || null });
      completedMap.set(igdb, list);
    });
  }

  // Attach computed fields to games
  const enrichedGames = games.map((g) => {
    const igdb = g.igdb_id == null ? null : Number(g.igdb_id);

    const status = String(g.status || "");

    if (igdb && (status === "Unplayed" || status === "Dropped")) {
      const completed = (completedMap.get(igdb) || []).filter((r) => Number(r.id) !== Number(g.id));

      // Build unique locations (case-insensitive) keyed by priority hardware > platform > store
      const seen = new Set<string>();
      const locations: { store?: string | null; platform?: string | null; hardware?: string | null }[] = [];

      completed.forEach((row) => {
        const key = ((row.hardware || row.platform || row.store) || "").toLowerCase();
        if (!key) return;
        if (seen.has(key)) return;
        seen.add(key);
        locations.push({ store: row.store, platform: row.platform, hardware: row.hardware });
      });

      return {
        ...g,
        completed_elsewhere: locations.length > 0,
        completed_elsewhere_locations: locations,
      } as DbGame;
    }

    return {
      ...g,
      completed_elsewhere: false,
      completed_elsewhere_locations: [],
    } as DbGame;
  });

  // Use enrichedGames for return
  const stats = calculateStats(statsResult);
  const total = gamesResult.count || 0;

  return {
    games: enrichedGames,
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

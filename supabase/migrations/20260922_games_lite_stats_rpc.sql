-- All Games was computing its dashboard stats (total games, completed,
-- total hours, average score) by paging through the *entire* `games` table
-- client-side (lib/server/gamesLite.ts: fetchAllStatsRows), 1000 rows at a
-- time, on every single page load, filter change, sort change, and page
-- click. That's 2-3+ sequential Supabase round trips (~1.1s) doing work the
-- database can do in one indexed aggregate query.
--
-- This replaces it with a single RPC that computes the same aggregates
-- server-side. Unlike the older get_games_lite_stats() in
-- 202607081_stats_performance.sql (which only accepted single-value
-- filters), this accepts the array-based multi-select filters the UI
-- actually sends, plus the "Never Played" special case
-- (lib/server/gamesLite.ts: applyNeverPlayedToQuery) so it's a full
-- replacement rather than a partial one. The old function is left in place
-- untouched since nothing calls it.

create index if not exists games_status_idx
on public.games (status);

create or replace function public.get_games_lite_stats_v2(
  p_search text default '',
  p_statuses text[] default '{}',
  p_stores text[] default '{}',
  p_release_years int[] default '{}',
  p_completion_years int[] default '{}',
  p_genres text[] default '{}',
  p_never_played boolean default false
)
returns table(
  total_games bigint,
  completed_games bigint,
  total_hours numeric,
  avg_score integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint as total_games,
    count(*) filter (where g.status = 'Completed')::bigint as completed_games,
    coalesce(sum(coalesce(g.hours_played, 0)), 0)::numeric as total_hours,
    coalesce(round(avg(nullif(g.score, 0)))::integer, 0) as avg_score
  from public.games g
  where
    (p_search = '' or g.title ilike '%' || p_search || '%')
    and (cardinality(p_statuses) = 0 or g.status = any(p_statuses))
    and (cardinality(p_stores) = 0 or g.store = any(p_stores))
    and (
      cardinality(p_release_years) = 0
      or extract(year from g.release)::int = any(p_release_years)
    )
    and (
      cardinality(p_completion_years) = 0
      or extract(year from g.completion_last_played)::int = any(p_completion_years)
    )
    and (cardinality(p_genres) = 0 or g.genres @> p_genres)
    and (
      not p_never_played
      or (
        g.status = 'Unplayed'
        and not exists (
          select 1
          from public.games completed
          where completed.status = 'Completed'
            and completed.igdb_id = g.igdb_id
        )
      )
    );
$$;

grant execute on function public.get_games_lite_stats_v2(
  text,
  text[],
  text[],
  int[],
  int[],
  text[],
  boolean
) to anon, authenticated, service_role;

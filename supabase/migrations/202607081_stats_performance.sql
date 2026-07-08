create index if not exists monthly_play_logs_year_idx
on public.monthly_play_logs (year);

create index if not exists monthly_play_logs_year_month_hours_idx
on public.monthly_play_logs (year, month, hours desc);

create index if not exists games_date_of_purchase_idx
on public.games (date_of_purchase);

create index if not exists games_completion_last_played_idx
on public.games (completion_last_played);

create or replace function public.get_stats_years()
returns table(year integer)
language sql
stable
security definer
set search_path = public
as $$
  select distinct years.year
  from (
    select monthly_play_logs.year::integer as year
    from public.monthly_play_logs
    where monthly_play_logs.year is not null

    union

    select extract(year from games.completion_last_played)::integer as year
    from public.games
    where games.completion_last_played is not null
  ) as years
  order by 1 desc;
$$;

grant execute on function public.get_stats_years() to anon, authenticated, service_role;

create or replace function public.get_games_lite_stats(
  p_search text default '',
  p_status text default '',
  p_store text default '',
  p_release text default '',
  p_completion text default '',
  p_genre text default ''
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
  with filters as (
    select
      coalesce(p_search, '') as search,
      coalesce(p_status, '') as status,
      coalesce(p_store, '') as store,
      case when coalesce(p_release, '') ~ '^\d{4}$' then p_release::integer end as release_year,
      case when coalesce(p_completion, '') ~ '^\d{4}$' then p_completion::integer end as completion_year,
      coalesce(p_genre, '') as genre
  )
  select
    count(*)::bigint as total_games,
    count(*) filter (where games.status = 'Completed')::bigint as completed_games,
    coalesce(sum(coalesce(games.hours_played, 0)), 0)::numeric as total_hours,
    coalesce(
      round(avg(nullif(games.score, 0)))::integer,
      0
    ) as avg_score
  from public.games
  cross join filters
  where
    (filters.search = '' or games.title ilike '%' || filters.search || '%')
    and (filters.status in ('', 'All') or games.status = filters.status)
    and (filters.store in ('', 'All') or games.store = filters.store)
    and (
      filters.release_year is null
      or (
        games.release >= make_date(filters.release_year, 1, 1)
        and games.release < make_date(filters.release_year + 1, 1, 1)
      )
    )
    and (
      filters.completion_year is null
      or (
        games.completion_last_played >= make_date(filters.completion_year, 1, 1)
        and games.completion_last_played < make_date(filters.completion_year + 1, 1, 1)
      )
    )
    and (
      filters.genre in ('', 'All')
      or games.genres @> array[filters.genre]::text[]
    );
$$;

grant execute on function public.get_games_lite_stats(
  text,
  text,
  text,
  text,
  text,
  text
) to anon, authenticated, service_role;

begin;

create or replace function public.get_distributed_game_hours(
  p_year integer
)
returns table (
  game_id bigint,
  title text,
  year integer,
  month integer,
  estimated_hours numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with distributions as (
    select
      d.game_id,
      g.title,
      d.start_month,
      coalesce(
        d.end_month,
        date_trunc('month', current_date)::date
      ) as effective_end_month,
      coalesce(g.hours_played, 0::numeric) as lifetime_hours
    from public.game_hour_distributions d
    inner join public.games g
      on g.id = d.game_id
    where
      p_year < 2024
      and d.start_month <= coalesce(
        d.end_month,
        date_trunc('month', current_date)::date
      )
  ),
  calculated as (
    select
      distributions.*,
      greatest(
        1,
        (
          extract(
            year from age(
              effective_end_month,
              start_month
            )
          )::integer * 12
          +
          extract(
            month from age(
              effective_end_month,
              start_month
            )
          )::integer
          + 1
        )
      ) as active_months
    from distributions
  )
  select
    calculated.game_id,
    calculated.title,
    extract(year from generated.month_start)::integer as year,
    extract(month from generated.month_start)::integer as month,
    (
      calculated.lifetime_hours
      / calculated.active_months::numeric
    ) as estimated_hours
  from calculated
  cross join lateral generate_series(
    calculated.start_month::timestamp,
    calculated.effective_end_month::timestamp,
    interval '1 month'
  ) as generated(month_start)
  where extract(year from generated.month_start)::integer = p_year
  order by
    calculated.game_id,
    month;
$$;

grant execute on function public.get_distributed_game_hours(integer)
to anon, authenticated, service_role;

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

    union

    select extract(year from generated.month_start)::integer as year
    from public.game_hour_distributions d
    cross join lateral generate_series(
      d.start_month::timestamp,
      coalesce(
        d.end_month,
        date_trunc('month', current_date)::date
      )::timestamp,
      interval '1 month'
    ) as generated(month_start)
    where
      d.start_month <= coalesce(
        d.end_month,
        date_trunc('month', current_date)::date
      )
      and extract(year from generated.month_start)::integer < 2024
  ) as years
  where years.year is not null
  order by 1 desc;
$$;

grant execute on function public.get_stats_years()
to anon, authenticated, service_role;

commit;

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
    where d.start_month <= coalesce(
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

commit;
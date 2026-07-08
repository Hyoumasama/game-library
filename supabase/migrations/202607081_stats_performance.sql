create index if not exists monthly_play_logs_year_idx
on public.monthly_play_logs (year);

create index if not exists monthly_play_logs_year_month_hours_idx
on public.monthly_play_logs (year, month, hours desc);

create index if not exists games_date_of_purchase_idx
on public.games (date_of_purchase);

create or replace function public.get_stats_years()
returns table(year integer)
language sql
stable
security definer
set search_path = public
as $$
  select distinct monthly_play_logs.year::integer
  from public.monthly_play_logs
  where monthly_play_logs.year is not null
  order by 1 desc;
$$;

grant execute on function public.get_stats_years() to anon, authenticated, service_role;

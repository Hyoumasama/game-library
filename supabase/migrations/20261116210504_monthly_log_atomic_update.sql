-- Only the server's service-role client may call this RPC.
create or replace function public.update_monthly_play_log(
  p_log_id bigint,
  p_hours numeric,
  p_month integer,
  p_year integer,
  p_expected_hours numeric,
  p_expected_month integer,
  p_expected_year integer
)
returns public.monthly_play_logs
language plpgsql
security invoker
set search_path = ''
as $$
declare
  old_log public.monthly_play_logs;
  updated_log public.monthly_play_logs;
begin
  if p_hours is null or p_hours <= 0 or p_hours::text in ('NaN', 'Infinity', '-Infinity')
    or p_month is null or p_month not between 1 and 12
    or p_year is null or p_year not between 2000 and 9999 then
    raise exception 'Invalid hours, month, or year' using errcode = '22023';
  end if;

  select * into old_log from public.monthly_play_logs
  where log_id = p_log_id for update;
  if not found then
    raise exception 'Monthly log was not found' using errcode = 'P0002';
  end if;

  if old_log.hours is distinct from p_expected_hours
    or old_log.month is distinct from p_expected_month
    or old_log.year is distinct from p_expected_year then
    raise exception 'Monthly log changed elsewhere' using errcode = '40001';
  end if;

  update public.monthly_play_logs
  set hours = p_hours, month = p_month, year = p_year
  where log_id = p_log_id returning * into updated_log;

  update public.games
  set hours_played = greatest(coalesce(hours_played, 0) + p_hours - coalesce(old_log.hours, 0), 0)
  where id = old_log.game_id;
  if not found then
    raise exception 'Game was not found' using errcode = 'P0002';
  end if;

  return updated_log;
end;
$$;

revoke all on function public.update_monthly_play_log(bigint, numeric, integer, integer, numeric, integer, integer)
  from public, anon, authenticated;
grant execute on function public.update_monthly_play_log(bigint, numeric, integer, integer, numeric, integer, integer)
  to service_role;

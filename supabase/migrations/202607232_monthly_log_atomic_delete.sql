create or replace function public.delete_monthly_play_log(
  p_log_id bigint
)
returns table (
  log_id bigint,
  game_id bigint,
  deleted_hours numeric,
  new_total_hours numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_log public.monthly_play_logs;
begin
  select *
  into deleted_log
  from public.monthly_play_logs
  where monthly_play_logs.log_id = p_log_id
  for update;

  if not found then
    raise exception 'Monthly log % was not found', p_log_id;
  end if;

  delete from public.monthly_play_logs
  where monthly_play_logs.log_id = p_log_id;

  update public.games
  set hours_played = greatest(
    coalesce(hours_played, 0) - coalesce(deleted_log.hours, 0),
    0
  )
  where id = deleted_log.game_id
  returning hours_played into new_total_hours;

  if not found then
    raise exception 'Game % was not found', deleted_log.game_id;
  end if;

  log_id := deleted_log.log_id;
  game_id := deleted_log.game_id;
  deleted_hours := deleted_log.hours;

  return next;
end;
$$;

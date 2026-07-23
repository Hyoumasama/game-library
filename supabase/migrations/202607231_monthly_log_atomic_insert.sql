create or replace function public.insert_monthly_play_log(
  p_game_id bigint,
  p_title text,
  p_hours numeric,
  p_month integer,
  p_year integer,
  p_status text default null,
  p_date_started date default null,
  p_completion_last_played date default null
)
returns public.monthly_play_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  created_log public.monthly_play_logs;
begin
  insert into public.monthly_play_logs (
    game_id,
    title,
    hours,
    month,
    year
  )
  values (
    p_game_id,
    trim(p_title),
    p_hours,
    p_month,
    p_year
  )
  returning * into created_log;

  update public.games
  set
    hours_played = coalesce(hours_played, 0) + p_hours,
    status = coalesce(nullif(trim(p_status), ''), status),
    date_started = coalesce(p_date_started, date_started),
    completion_last_played = coalesce(
      p_completion_last_played,
      completion_last_played
    )
  where id = p_game_id;

  if not found then
    raise exception 'Game % was not found', p_game_id;
  end if;

  return created_log;
end;
$$;

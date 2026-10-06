-- The project enables safeupdate: keep the replacement scoped to valid slots.
-- PT409 returns an HTTP conflict without triggering PostgREST's automatic
-- serialization retries. Also qualify the library membership lookup.
create or replace function public.save_game_pipeline(game_ids bigint[], expected_ids bigint[])
returns void language plpgsql security invoker set search_path = '' as $$
declare current_ids bigint[];
begin
  perform pg_advisory_xact_lock(61006120000);
  select coalesce(array_agg(game_id order by position), '{}'::bigint[])
    into current_ids from public.game_pipeline;
  if current_ids is distinct from expected_ids then
    raise exception 'Pipeline changed. Reload and try again.' using errcode = 'PT409';
  end if;
  if game_ids is null or cardinality(game_ids) > 15 or
     exists (select 1 from unnest(game_ids) id where id is null or id <= 0) or
     (select count(distinct id) from unnest(game_ids) id) <> cardinality(game_ids) then
    raise exception 'Invalid pipeline order' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(game_ids) as requested(game_id) where not exists
    (select 1 from public.games g where g.id = requested.game_id)) then
    raise exception 'Choose games from your library' using errcode = '22023';
  end if;
  delete from public.game_pipeline where position between 1 and 15;
  insert into public.game_pipeline (game_id, position)
    select id, ordinal::integer from unnest(game_ids) with ordinality as t(id, ordinal);
end;
$$;
revoke all on function public.save_game_pipeline(bigint[], bigint[]) from public, anon, authenticated;
grant execute on function public.save_game_pipeline(bigint[], bigint[]) to service_role;




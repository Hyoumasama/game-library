-- Atomic cross-route transfer. Review locally; no production application authorized.
create function public.move_play_route_game(payload jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  source_id uuid := (payload->>'source_id')::uuid;
  destination_id uuid := (payload->>'destination_id')::uuid;
  moved_game_id bigint := (payload->>'game_id')::bigint;
  before_game_id bigint := (payload->>'before_game_id')::bigint;
  source_revision integer;
  destination_revision integer;
  moved public.play_route_games%rowtype;
  item jsonb;
  source_games jsonb;
  destination_games jsonb;
  ordinal integer := 0;
  inserted boolean := false;
begin
  -- All route mutation RPCs share this lock, including edits in other tabs.
  perform pg_advisory_xact_lock(61006152124);
  if source_id is null or destination_id is null or source_id = destination_id or moved_game_id is null then
    raise exception 'Invalid transfer';
  end if;
  select revision into source_revision from public.play_routes where id = source_id for update;
  if not found or source_revision is distinct from (payload->>'source_revision')::integer then
    raise exception 'Route changed' using errcode = 'PT409';
  end if;
  select revision into destination_revision from public.play_routes where id = destination_id for update;
  if not found or destination_revision is distinct from (payload->>'destination_revision')::integer then
    raise exception 'Route changed' using errcode = 'PT409';
  end if;
  select * into moved from public.play_route_games where route_id = source_id and game_id = moved_game_id;
  if not found then raise exception 'Route changed' using errcode = 'PT409'; end if;
  if exists(select 1 from public.play_route_games where route_id = destination_id and game_id = moved_game_id) then
    raise exception 'This game is already in the destination route.' using errcode = 'PT422';
  end if;
  if (select count(*) from public.play_route_games where route_id = destination_id) >= 100 then
    raise exception 'The destination route already has 100 games.' using errcode = 'PT422';
  end if;
  if moved.status = 'current' and exists(select 1 from public.play_route_games where route_id = destination_id and status = 'current') then
    raise exception 'The destination route already has a now-playing game. Change its route status before moving this game.' using errcode = 'PT422';
  end if;
  if before_game_id is not null and not exists(select 1 from public.play_route_games where route_id = destination_id and game_id = before_game_id) then
    raise exception 'Route changed' using errcode = 'PT409';
  end if;
  select coalesce(jsonb_agg(to_jsonb(g) order by position), '[]'::jsonb) into source_games
    from public.play_route_games g where route_id = source_id and game_id <> moved_game_id;
  select coalesce(jsonb_agg(to_jsonb(g) order by position), '[]'::jsonb) into destination_games
    from public.play_route_games g where route_id = destination_id;
  -- Rebuild the two lists inside the transaction to avoid transient position
  -- uniqueness violations. Preserve membership IDs, timestamps and statuses.
  delete from public.play_route_games where route_id in (source_id, destination_id);
  for item in select value from jsonb_array_elements(source_games) loop
    ordinal := ordinal + 1;
    insert into public.play_route_games(id, route_id, game_id, position, status, created_at) overriding system value
      values ((item->>'id')::bigint, source_id, (item->>'game_id')::bigint, ordinal, item->>'status', (item->>'created_at')::timestamptz);
  end loop;
  ordinal := 0;
  for item in select value from jsonb_array_elements(destination_games) loop
    if (item->>'game_id')::bigint = before_game_id then
      ordinal := ordinal + 1;
      insert into public.play_route_games(id, route_id, game_id, position, status, created_at) overriding system value
        values (moved.id, destination_id, moved.game_id, ordinal, moved.status, moved.created_at);
      inserted := true;
    end if;
    ordinal := ordinal + 1;
    insert into public.play_route_games(id, route_id, game_id, position, status, created_at) overriding system value
      values ((item->>'id')::bigint, destination_id, (item->>'game_id')::bigint, ordinal, item->>'status', (item->>'created_at')::timestamptz);
  end loop;
  if not inserted then
    insert into public.play_route_games(id, route_id, game_id, position, status, created_at) overriding system value
      values (moved.id, destination_id, moved.game_id, ordinal + 1, moved.status, moved.created_at);
  end if;
  update public.play_routes set revision = revision + 1 where id in (source_id, destination_id);
  return destination_id;
end $$;
revoke all on function public.move_play_route_game(jsonb) from public, anon, authenticated;
grant execute on function public.move_play_route_game(jsonb) to service_role;

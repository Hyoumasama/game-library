-- Persist visual route order atomically, using the same lock as route edits.
create function public.reorder_play_routes(payload jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare item jsonb; ordinal integer := 0;
begin
  perform pg_advisory_xact_lock(61006152124);
  if jsonb_typeof(payload->'routes') is distinct from 'array' then
    raise exception 'Invalid order';
  end if;
  if jsonb_array_length(payload->'routes') <> (select count(*) from public.play_routes)
    or (select count(distinct value->>'id') from jsonb_array_elements(payload->'routes')) <> jsonb_array_length(payload->'routes') then
    raise exception 'Routes changed' using errcode = 'PT409';
  end if;
  for item in select value from jsonb_array_elements(payload->'routes') loop
    ordinal := ordinal + 1;
    update public.play_routes set position = ordinal, revision = revision + 1
    where id = (item->>'id')::uuid and revision = (item->>'revision')::integer;
    if not found then raise exception 'Route changed' using errcode = 'PT409'; end if;
  end loop;
end $$;
revoke all on function public.reorder_play_routes(jsonb) from public, anon, authenticated;
grant execute on function public.reorder_play_routes(jsonb) to service_role;

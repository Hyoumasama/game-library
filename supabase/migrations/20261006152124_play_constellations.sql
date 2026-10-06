create table public.play_routes (
 id uuid primary key default gen_random_uuid(), name text not null check (length(name) between 1 and 80),
 icon text not null default '✦' check(length(icon) <= 16), accent text not null default '#67e8f9' check(accent ~ '^#[0-9a-fA-F]{6}$'),
 description text not null default '' check(length(description) <= 500), position integer not null,
 revision integer not null default 0, created_at timestamptz not null default now()
);
create table public.play_route_games (
 id bigint generated always as identity primary key, route_id uuid not null references public.play_routes(id) on delete cascade,
 game_id bigint not null references public.games(id) on delete cascade, position integer not null check(position between 1 and 100),
 status text not null default 'upcoming' check(status in ('upcoming','current','completed')), created_at timestamptz not null default now(),
 unique(route_id,game_id), unique(route_id,position)
);
create unique index one_current_per_route on public.play_route_games(route_id) where status='current';
alter table public.play_routes enable row level security;
alter table public.play_route_games enable row level security;
revoke all on public.play_routes, public.play_route_games from anon, authenticated;
grant all on public.play_routes, public.play_route_games to service_role;
grant usage,select on sequence public.play_route_games_id_seq to service_role;
-- Preserve the legacy table as a rollback snapshot. Never infer route statuses.
with new_route as (insert into public.play_routes(name,position) values ('My Pipeline',1) returning id)
insert into public.play_route_games(route_id,game_id,position,created_at)
select new_route.id,p.game_id,p.position,p.created_at from public.game_pipeline p cross join new_route;
create function public.mutate_play_route(payload jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare rid uuid; current_revision integer; item jsonb; ordinal integer := 0;
begin
 perform pg_advisory_xact_lock(61006152124);
 if payload->>'action'='create' then
   insert into public.play_routes(name,icon,accent,description,position)
   values (trim(payload->>'name'),coalesce(payload->>'icon','✦'),coalesce(payload->>'accent','#67e8f9'),coalesce(payload->>'description',''),
     (select coalesce(max(position),0)+1 from public.play_routes)) returning id into rid;
   return rid;
 end if;
 rid := (payload->>'id')::uuid;
 select revision into current_revision from public.play_routes where id=rid for update;
 if not found or current_revision is distinct from (payload->>'revision')::integer then
   raise exception 'Route changed' using errcode='PT409';
 end if;
 if payload->>'action'='delete' then
   delete from public.play_routes where id=rid; return rid;
 end if;
 if payload->>'action' is distinct from 'save' or jsonb_typeof(payload->'games') is distinct from 'array' then
   raise exception 'Invalid route';
 end if;
 if jsonb_array_length(payload->'games') > 100 then raise exception 'Route limit is 100 games'; end if;
 update public.play_routes set name=trim(payload->>'name'),icon=payload->>'icon',accent=payload->>'accent',description=payload->>'description',revision=revision+1 where id=rid;
 delete from public.play_route_games where route_id=rid;
 for item in select value from jsonb_array_elements(payload->'games') loop
   ordinal := ordinal+1;
   insert into public.play_route_games(route_id,game_id,position,status) values(rid,(item->>'game_id')::bigint,ordinal,item->>'status');
 end loop;
 return rid;
end $$;
revoke all on function public.mutate_play_route(jsonb) from public,anon,authenticated;
grant execute on function public.mutate_play_route(jsonb) to service_role;
-- Freeze legacy writes so old browser tabs cannot diverge from the migrated route.
create or replace function public.save_game_pipeline(game_ids bigint[],expected_ids bigint[]) returns void language plpgsql security invoker set search_path='' as $$
begin raise exception 'Pipeline upgraded to Play Constellations. Reload.' using errcode='PT409'; end $$;

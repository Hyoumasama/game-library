begin;
create table public.canonical_games (
 id uuid primary key default gen_random_uuid(), identity_key text unique,
 title text not null check (length(trim(title)) between 1 and 300), normalized_title text not null,
 igdb_id bigint, steam_appid bigint, release_date date, metadata jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- External identifiers are indexed, not unique: disputed identifiers must remain representable.
create index canonical_games_igdb_idx on public.canonical_games(igdb_id) where igdb_id is not null;
create index canonical_games_steam_idx on public.canonical_games(steam_appid) where steam_appid is not null;
create index canonical_games_title_idx on public.canonical_games(normalized_title text_pattern_ops);
create index canonical_games_search_idx on public.canonical_games using gin(to_tsvector('simple', title));
create table public.game_versions (
 id uuid primary key default gen_random_uuid(), canonical_game_id uuid not null unique references public.canonical_games on delete cascade,
 name text not null, version_type text not null check(version_type in ('edition','enhanced_edition','remake','remaster')),
 metadata jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.game_identity_links (
 game_id bigint primary key references public.games on delete cascade,
 canonical_game_id uuid not null references public.canonical_games on delete restrict,
 version_id uuid references public.game_versions on delete restrict,
 match_type text not null check(match_type in ('igdb_exact','steam_exact','manual','heuristic','import')),
 confidence numeric not null check(confidence between 0 and 1),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index game_identity_links_canonical_idx on public.game_identity_links(canonical_game_id);
create index game_identity_links_version_idx on public.game_identity_links(version_id);
create table public.game_franchises (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 200), slug text not null unique,
 igdb_franchise_id bigint unique, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.game_series (
 id uuid primary key default gen_random_uuid(), franchise_id uuid references public.game_franchises on delete restrict,
 name text not null check(length(trim(name)) between 1 and 200), slug text not null unique,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index game_series_franchise_idx on public.game_series(franchise_id);
create table public.canonical_game_series (
 canonical_game_id uuid not null references public.canonical_games on delete cascade,
 series_id uuid not null references public.game_series on delete cascade, sort_order numeric,
 created_at timestamptz not null default now(), primary key(canonical_game_id,series_id)
);
create index canonical_game_series_series_idx on public.canonical_game_series(series_id);
create table public.canonical_game_franchises (
 canonical_game_id uuid not null references public.canonical_games on delete cascade,
 franchise_id uuid not null references public.game_franchises on delete cascade,
 created_at timestamptz not null default now(), primary key(canonical_game_id,franchise_id)
);
create index canonical_game_franchises_franchise_idx on public.canonical_game_franchises(franchise_id);
create table public.game_relationships (
 id uuid primary key default gen_random_uuid(),
 source_game_id uuid not null references public.canonical_games on delete restrict,
 target_game_id uuid not null references public.canonical_games on delete restrict,
 relation_type text not null check(relation_type in ('sequel_of','prequel_of','spinoff_of','dlc_of','expansion_of','standalone_expansion_of','remake_of','remaster_of','edition_of','enhanced_edition_of','collection_contains','episode_of','reboot_of','successor_to','related_to')),
 confidence numeric not null check(confidence between 0 and 1), source text not null check(length(trim(source)) between 1 and 100), notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(source_game_id <> target_game_id), unique(source_game_id,target_game_id,relation_type)
);
comment on table public.game_relationships is 'Directed: derived game is source, original is target. Collection is source, contained game is target. Inverse labels are derived; do not store reverse rows.';
-- A sequel/prequel pair describes the same fact. Expression index prevents both even under concurrent inserts.
create unique index game_relationships_inverse_unique on public.game_relationships (
 (case when relation_type='prequel_of' then target_game_id when relation_type='related_to' then least(source_game_id,target_game_id) else source_game_id end),
 (case when relation_type='prequel_of' then source_game_id when relation_type='related_to' then greatest(source_game_id,target_game_id) else target_game_id end),
 (case when relation_type='prequel_of' then 'sequel_of' else relation_type end)
);
create index game_relationships_target_idx on public.game_relationships(target_game_id,relation_type);
create table public.game_relationship_reviews (
 id uuid primary key default gen_random_uuid(), candidate_key text not null unique,
 kind text not null check(kind in ('identity','relationship')),
 source_game_id uuid not null references public.canonical_games on delete restrict,
 target_game_id uuid not null references public.canonical_games on delete restrict,
 proposed_relation text, confidence numeric not null check(confidence between 0 and 1),
 reason text not null, identifiers jsonb not null default '{}',
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 decision_notes text, resolved_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(source_game_id <> target_game_id), check(kind <> 'relationship' or proposed_relation is not null)
);
create index game_relationship_reviews_status_idx on public.game_relationship_reviews(status,created_at,id);
create index game_relationship_reviews_source_idx on public.game_relationship_reviews(source_game_id);
create index game_relationship_reviews_target_idx on public.game_relationship_reviews(target_game_id);
create table public.game_relationship_backfill_runs (
 id uuid primary key default gen_random_uuid(), report jsonb not null, created_at timestamptz not null default now()
);
create function public.relationship_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin
 foreach t in array array['canonical_games','game_versions','game_identity_links','game_franchises','game_series','game_relationships','game_relationship_reviews'] loop
 execute format('create trigger relationship_updated_at before update on public.%I for each row execute function public.relationship_updated_at()',t);
 end loop;
 foreach t in array array['canonical_games','game_versions','game_identity_links','game_franchises','game_series','canonical_game_series','canonical_game_franchises','game_relationships','game_relationship_reviews','game_relationship_backfill_runs'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 if t not in ('game_relationship_reviews','game_relationship_backfill_runs') then
 execute format('grant select on public.%I to anon, authenticated',t);
 execute format('create policy public_read on public.%I for select to anon, authenticated using(true)',t);
 end if;
 end loop;
end $$;
create function public.apply_game_identity_backfill(plan jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r jsonb; begin
 perform pg_advisory_xact_lock(809162026);
 -- Abort stale plans instead of silently linking changed metadata.
 for r in select value from jsonb_array_elements(plan->'snapshots') loop
 if not exists(select 1 from public.games g where g.id=(r->>'id')::bigint and
 jsonb_build_object('title',g.title,'igdb_id',g.igdb_id,'steam_appid',g.steam_appid,'release',g.release,'platform',g.platform)=r->'metadata') then
 raise exception 'Game metadata changed during backfill; regenerate the plan'; end if;
 end loop;
 insert into public.canonical_games(id,identity_key,title,normalized_title,igdb_id,steam_appid,release_date,metadata)
 select x.id,x.identity_key,x.title,x.normalized_title,x.igdb_id,x.steam_appid,x.release_date,coalesce(x.metadata,'{}')
 from jsonb_to_recordset(plan->'canonical') x(id uuid,identity_key text,title text,normalized_title text,igdb_id bigint,steam_appid bigint,release_date date,metadata jsonb)
 on conflict(id) do nothing;
 insert into public.game_versions(id,canonical_game_id,name,version_type)
 select x.id,x.canonical_game_id,x.name,x.version_type from jsonb_to_recordset(plan->'versions') x(id uuid,canonical_game_id uuid,name text,version_type text)
 on conflict(canonical_game_id) do nothing;
 insert into public.game_identity_links(game_id,canonical_game_id,version_id,match_type,confidence)
 select x.game_id,x.canonical_game_id,x.version_id,x.match_type,x.confidence
 from jsonb_to_recordset(plan->'links') x(game_id bigint,canonical_game_id uuid,version_id uuid,match_type text,confidence numeric)
 on conflict(game_id) do nothing;
 insert into public.game_relationship_reviews(candidate_key,kind,source_game_id,target_game_id,proposed_relation,confidence,reason,identifiers)
 select x.candidate_key,x.kind,x.source_game_id,x.target_game_id,x.proposed_relation,x.confidence,x.reason,x.identifiers
 from jsonb_to_recordset(plan->'reviews') x(candidate_key text,kind text,source_game_id uuid,target_game_id uuid,proposed_relation text,confidence numeric,reason text,identifiers jsonb)
 on conflict(candidate_key) do nothing;
 insert into public.game_relationship_backfill_runs(report) values(plan->'report');
 return plan->'report';
end $$;
create function public.resolve_game_relationship_review(review_id uuid, approve boolean, notes text default null) returns void language plpgsql security invoker set search_path='' as $$
declare r public.game_relationship_reviews; begin
 select * into r from public.game_relationship_reviews where id=review_id for update;
 if not found then raise exception 'Review not found'; end if;
 if r.status <> 'pending' then raise exception 'Review already resolved'; end if;
 if approve then
 if r.kind='identity' then
 -- Only copy mappings move; canonical metadata and existing relationship endpoints are preserved.
 if exists(select 1 from public.game_relationships where source_game_id=r.source_game_id or target_game_id=r.source_game_id)
 or exists(select 1 from public.canonical_game_series where canonical_game_id=r.source_game_id)
 or exists(select 1 from public.canonical_game_franchises where canonical_game_id=r.source_game_id) then
 raise exception 'Source has relationships or memberships. Resolve these before consolidating its identity'; end if;
 update public.game_identity_links set canonical_game_id=r.target_game_id, version_id=(select id from public.game_versions where canonical_game_id=r.target_game_id), match_type='manual',confidence=1 where canonical_game_id=r.source_game_id;
 else
 insert into public.game_relationships(source_game_id,target_game_id,relation_type,confidence,source,notes)
 values(r.source_game_id,r.target_game_id,r.proposed_relation,0.95,'manual_review',r.reason) on conflict do nothing;
 end if;
 end if;
 update public.game_relationship_reviews set status=case when approve then 'approved' else 'rejected' end, decision_notes=notes,resolved_at=now() where id=review_id;
end $$;
revoke all on function public.apply_game_identity_backfill(jsonb) from public,anon,authenticated;
revoke all on function public.resolve_game_relationship_review(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.apply_game_identity_backfill(jsonb),public.resolve_game_relationship_review(uuid,boolean,text) to service_role;
commit;

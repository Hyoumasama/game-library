-- Awards are independent of the personal games inventory. No INSERT/UPDATE on games.
-- Install atomically; fail quickly rather than wait indefinitely for production locks.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '120s';
create table if not exists public.award_events (
 id uuid primary key default gen_random_uuid(), award_organization text not null,
 year integer not null check (year >= 2014), ceremony_name text not null,
 ceremony_date date, status text not null default 'incomplete' check(status in ('incomplete','published')),
 logo_url text, source_url text not null, official_source_url text, data_notes text, verification_notes text,
 created_at timestamptz not null default now(),
 check(status != 'published' or nullif(trim(verification_notes),'') is not null),
 unique(award_organization,year)
);
create table if not exists public.award_categories (
 id uuid primary key default gen_random_uuid(), organization text not null, category_key text not null,
 name text not null, description text, display_order integer not null default 100,
 created_at timestamptz not null default now(), unique(organization,category_key)
);
-- Ceremony-specific names and ordering: categories may change between years.
create table if not exists public.award_event_categories (
 award_event_id uuid references public.award_events(id) on delete cascade,
 award_category_id uuid references public.award_categories(id), name text not null,
 display_order integer not null, honorary boolean not null default false, primary key(award_event_id,award_category_id)
);
create table if not exists public.award_entries (
 id uuid primary key default gen_random_uuid(), award_event_id uuid not null,
 award_category_id uuid not null, entry_key text not null, nominee_name text not null,
 nominee_type text not null check(nominee_type in ('game','person','team','adaptation','event','other')),
 game_title text, game_id bigint references public.games(id) on delete set null,
 external_game_id bigint, image_url text, canonical_game_id uuid references public.canonical_games(id) on delete set null,
 status text not null check(status in ('winner','nominee')), match_method text check(match_method in ('exact','identifier','canonical','manual','blocked')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(award_event_id,award_category_id) references public.award_event_categories(award_event_id,award_category_id) on delete cascade,
 unique(award_event_id,award_category_id,entry_key),
 check(nominee_type in ('game','person') or game_id is null),
 check(nominee_type != 'person' or game_id is null or game_title is not null)
);
create index if not exists award_entries_game on public.award_entries(game_id) where game_id is not null;
create index if not exists award_entries_canonical on public.award_entries(canonical_game_id) where canonical_game_id is not null;
create index if not exists award_entries_event on public.award_entries(award_event_id,award_category_id);
create index if not exists award_entries_unmatched on public.award_entries(game_title) where game_id is null;
alter table public.award_events enable row level security;
alter table public.award_categories enable row level security;
alter table public.award_event_categories enable row level security;
alter table public.award_entries enable row level security;
-- The app uses its server-only service client and signed admin cookie; direct client writes are denied.
revoke all on public.award_events,public.award_categories,public.award_event_categories,public.award_entries from public,anon,authenticated;
grant all on public.award_events,public.award_categories,public.award_event_categories,public.award_entries to service_role;
create or replace function public.award_normalize_title(value text) returns text
 language sql immutable strict parallel safe set search_path='' as $$
 select trim(regexp_replace(replace(replace(translate(lower(normalize(value,NFC)), U&'\2019\2018\00A0\202F', chr(39)||chr(39)||'  '), U&'\2122', ''), U&'\00AE', ''), '\s+', ' ', 'g'))
$$;
create index if not exists games_award_title on public.games(public.award_normalize_title(title));
create or replace view public.award_details with (security_invoker=true) as
 select e.id,e.nominee_name,e.nominee_type,e.game_title,e.game_id,
 coalesce(g.steam_vertical_cover,g.cover_url,e.image_url) as image_url,e.status,
 c.category_key,ec.name as category_name,ec.display_order,v.year,v.award_organization as organization,
 v.status as event_status,(g.id is not null and coalesce(g.status,'') != 'Wishlist') as owned,
 array(select e.game_id where e.game_id is not null union select copy.id from public.game_identity_links l
 join public.games copy on copy.id=l.game_id join public.canonical_games cg on cg.id=l.canonical_game_id
 where e.canonical_game_id is not null and l.canonical_game_id=e.canonical_game_id and l.confidence=1 and copy.igdb_id=cg.igdb_id
 and public.award_normalize_title(copy.title)=public.award_normalize_title(coalesce(e.game_title,e.nominee_name))) as library_game_ids
 from public.award_entries e join public.award_events v on v.id=e.award_event_id
 join public.award_categories c on c.id=e.award_category_id
 join public.award_event_categories ec on ec.award_event_id=e.award_event_id and ec.award_category_id=e.award_category_id
 left join public.games g on g.id=e.game_id;
revoke all on public.award_details from public,anon,authenticated;
grant select on public.award_details to service_role;
-- Recompute automatic matches so adding a second identical title removes an ambiguous link.
-- Manual matches and explicit rejections are preserved. Performance credits only match their associated game.
create or replace function public.match_award_entries() returns void
 language sql security invoker set search_path='' as $$
 with candidates as (
 select e.id as entry_id,g.id,g.status,
 case when l.confidence=1 and g.igdb_id=cg.igdb_id and public.award_normalize_title(cg.title)=public.award_normalize_title(g.title) then cg.id end as canonical_id
 from public.award_entries e join public.games g on public.award_normalize_title(g.title)=public.award_normalize_title(coalesce(e.game_title,case when e.nominee_type='game' then e.nominee_name end))
 left join public.game_identity_links l on l.game_id=g.id left join public.canonical_games cg on cg.id=l.canonical_game_id
 where e.nominee_type in ('game','person') and coalesce(e.match_method,'') not in ('manual','blocked') and (e.external_game_id is null or g.igdb_id=e.external_game_id)
 ), resolved as (
 select entry_id,case when count(*)=1 or (count(canonical_id)=count(*) and count(distinct canonical_id)=1) then
 (array_agg(id order by case when status='Wishlist' then 1 else 0 end,id))[1] end as game_id,
 case when count(canonical_id)=count(*) and count(distinct canonical_id)=1 then (array_agg(canonical_id))[1] end as canonical_id,
 count(*) as candidates from candidates group by entry_id
 )
 update public.award_entries e set game_id=r.game_id,canonical_game_id=r.canonical_id,
 match_method=case when r.game_id is null then null when e.external_game_id is not null then 'identifier' when r.candidates>1 then 'canonical' else 'exact' end,updated_at=now()
 from (select e2.id,r2.game_id,r2.canonical_id,r2.candidates from public.award_entries e2 left join resolved r2 on r2.entry_id=e2.id where e2.nominee_type in ('game','person') and coalesce(e2.match_method,'') not in ('manual','blocked')) r
 where e.id=r.id and (e.game_id is distinct from r.game_id or e.canonical_game_id is distinct from r.canonical_id or
 e.match_method is distinct from case when r.game_id is null then null when e.external_game_id is not null then 'identifier' when r.candidates>1 then 'canonical' else 'exact' end);
$$;
create or replace function public.refresh_award_game_links() returns trigger
 language plpgsql security invoker set search_path='' as $$ begin
 -- Never turn an otherwise permitted library write into an awards permission error.
 -- Unprivileged writes leave links for a later trusted reconciliation; no RLS bypass.
 if not has_function_privilege(current_user, 'public.match_award_entries()', 'EXECUTE')
    or not has_table_privilege(current_user, 'public.award_entries', 'SELECT')
    or not has_table_privilege(current_user, 'public.award_entries', 'UPDATE')
    or not has_table_privilege(current_user, 'public.games', 'SELECT')
    or not has_table_privilege(current_user, 'public.game_identity_links', 'SELECT')
    or not has_table_privilege(current_user, 'public.canonical_games', 'SELECT') then
   return null;
 end if;
 perform public.match_award_entries(); return null; end $$;
drop trigger if exists awards_game_links_insert on public.games;
create trigger awards_game_links_insert after insert or delete on public.games for each statement execute function public.refresh_award_game_links();
drop trigger if exists awards_game_links_update on public.games;
create trigger awards_game_links_update after update of title,igdb_id,status on public.games for each statement execute function public.refresh_award_game_links();
drop trigger if exists awards_identity_links_change on public.game_identity_links;
create trigger awards_identity_links_change after insert or update or delete on public.game_identity_links for each statement execute function public.refresh_award_game_links();
drop trigger if exists awards_canonical_game_update on public.canonical_games;
create trigger awards_canonical_game_update after update of title,igdb_id on public.canonical_games for each statement execute function public.refresh_award_game_links();
revoke all on function public.match_award_entries(),public.refresh_award_game_links() from public,anon,authenticated;
grant execute on function public.match_award_entries(),public.refresh_award_game_links() to service_role;
-- Atomic per-year replacement. Upserts stable keys, removes obsolete awards only, preserves manual links.
create or replace function public.import_award_event(payload jsonb) returns uuid
 language plpgsql security invoker set search_path='' as $$
 declare event_id uuid; category_id uuid; cat jsonb; ent jsonb; imported_keys text[];
 begin
 if coalesce(payload->>'status','') not in ('incomplete','published') then raise exception 'Invalid event status'; end if;
 if coalesce(jsonb_typeof(payload->'categories'),'') != 'array' then raise exception 'Categories must be an array'; end if;
 if jsonb_array_length(payload->'categories')=0 then raise exception 'Empty event'; end if;
 if (select count(*) from jsonb_array_elements(payload->'categories')) != (select count(distinct a->>'key') from jsonb_array_elements(payload->'categories') a) then raise exception 'Duplicate or missing category keys'; end if;
 if payload->>'status'='published' and (coalesce(payload->>'verified','false') != 'true' or coalesce(payload->>'verification_notes','')='') then raise exception 'Published events require documented verification'; end if;
 insert into public.award_events(award_organization,year,ceremony_name,ceremony_date,status,source_url,official_source_url,data_notes,verification_notes)
 values(payload->>'organization',(payload->>'year')::int,payload->>'ceremony_name',nullif(payload->>'ceremony_date','')::date,'incomplete',payload->>'source_url',payload->>'official_source_url',payload->>'data_notes',payload->>'verification_notes')
 on conflict(award_organization,year) do update set status='incomplete',source_url=excluded.source_url,official_source_url=excluded.official_source_url,data_notes=excluded.data_notes,verification_notes=excluded.verification_notes,ceremony_name=excluded.ceremony_name,ceremony_date=excluded.ceremony_date returning id into event_id;
 -- Serialize edits to existing entries while replacement checks and writes run.
 perform 1 from public.award_entries where award_event_id=event_id for update;
 for cat in select value from jsonb_array_elements(payload->'categories') loop
 if coalesce(jsonb_typeof(cat->'entries'),'') != 'array' then raise exception 'Entries must be an array'; end if;
 if (select count(*) from jsonb_array_elements(cat->'entries')) != (select count(distinct a->>'key') from jsonb_array_elements(cat->'entries') a) then raise exception 'Duplicate or missing entry keys'; end if;
 if jsonb_array_length(cat->'entries')=0 or (not coalesce((cat->>'honorary')::boolean,false) and (select count(*) from jsonb_array_elements(cat->'entries') a where a->>'status'='winner') != 1) then raise exception 'Competitive category requires entries and exactly one winner'; end if;
 if coalesce((cat->>'honorary')::boolean,false) and not exists(select 1 from jsonb_array_elements(cat->'entries') a where a->>'status'='winner') then raise exception 'Honorary category requires a recipient'; end if;
 insert into public.award_categories(organization,category_key,name,display_order) values(payload->>'organization',cat->>'key',cat->>'name',(cat->>'display_order')::int)
 on conflict(organization,category_key) do update set name=excluded.name,display_order=excluded.display_order returning id into category_id;
 -- A reviewed link/rejection must never disappear or attach to a new identity silently.
 if exists (
   select 1 from public.award_entries e
   where e.award_event_id=event_id and e.award_category_id=category_id
     and e.match_method in ('manual','blocked')
     and not exists (
       select 1 from jsonb_array_elements(cat->'entries') a
       where a->>'key'=e.entry_key and a->>'nominee_name'=e.nominee_name
         and a->>'nominee_type'=e.nominee_type
         and (a->>'game_title') is not distinct from e.game_title
         and nullif(a->>'external_game_id','')::bigint is not distinct from e.external_game_id
     )
 ) then raise exception 'Import would remove or change a protected manual/blocked entry; review it explicitly first'; end if;
 insert into public.award_event_categories(award_event_id,award_category_id,name,display_order,honorary) values(event_id,category_id,cat->>'name',(cat->>'display_order')::int,coalesce((cat->>'honorary')::boolean,false))
 on conflict(award_event_id,award_category_id) do update set name=excluded.name,display_order=excluded.display_order,honorary=excluded.honorary;
 -- Clear winner before changing it, avoiding transient partial unique-index conflicts.
 update public.award_entries set status='nominee' where award_event_id=event_id and award_category_id=category_id;
 imported_keys=array[]::text[];
 for ent in select value from jsonb_array_elements(cat->'entries') loop
 imported_keys=array_append(imported_keys,ent->>'key');
 insert into public.award_entries(award_event_id,award_category_id,entry_key,nominee_name,nominee_type,game_title,external_game_id,image_url,status)
 values(event_id,category_id,ent->>'key',ent->>'nominee_name',ent->>'nominee_type',ent->>'game_title',nullif(ent->>'external_game_id','')::bigint,ent->>'image_url',ent->>'status')
 on conflict(award_event_id,award_category_id,entry_key) do update set nominee_name=excluded.nominee_name,nominee_type=excluded.nominee_type,game_title=excluded.game_title,external_game_id=excluded.external_game_id,image_url=excluded.image_url,status=excluded.status,updated_at=now();
 end loop;
 delete from public.award_entries where award_event_id=event_id and award_category_id=category_id and not(entry_key=any(imported_keys));
 end loop;
 if exists (
   select 1 from public.award_entries e join public.award_categories c on c.id=e.award_category_id
   where e.award_event_id=event_id and e.match_method in ('manual','blocked')
     and not exists(select 1 from jsonb_array_elements(payload->'categories') a where a->>'key'=c.category_key)
 ) then raise exception 'Import would remove a category containing protected manual/blocked entries; review it explicitly first'; end if;
 delete from public.award_event_categories ec using public.award_categories c where ec.award_event_id=event_id and c.id=ec.award_category_id and not exists(select 1 from jsonb_array_elements(payload->'categories') a where a->>'key'=c.category_key);
 perform public.match_award_entries();
 update public.award_events set status=payload->>'status' where id=event_id;
 return event_id;
 end $$;
revoke all on function public.import_award_event(jsonb) from public,anon,authenticated;
grant execute on function public.import_award_event(jsonb) to service_role;
commit;

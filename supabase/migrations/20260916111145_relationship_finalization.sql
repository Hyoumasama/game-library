begin;
alter table public.game_relationships drop constraint game_relationships_relation_type_check;
alter table public.game_relationships add constraint game_relationships_relation_type_check check(relation_type in ('sequel_of','prequel_of','spinoff_of','dlc_of','expansion_of','standalone_expansion_of','remake_of','remaster_of','edition_of','enhanced_edition_of','collection_contains','episode_of','reboot_of','successor_to','related_to','demo_of','playtest_of','beta_of','prologue_of'));
alter table public.game_relationship_reviews drop constraint game_review_relation_check;
alter table public.game_relationship_reviews add constraint game_review_relation_check check((kind='identity' and proposed_relation is null) or (kind='relationship' and proposed_relation in ('sequel_of','prequel_of','spinoff_of','dlc_of','expansion_of','standalone_expansion_of','remake_of','remaster_of','edition_of','enhanced_edition_of','collection_contains','episode_of','reboot_of','successor_to','related_to','demo_of','playtest_of','beta_of','prologue_of')));
alter table public.game_relationship_reviews drop constraint game_relationship_reviews_status_check;
alter table public.game_relationship_reviews add constraint game_relationship_reviews_status_check check(status in ('pending','approved','rejected','resolved'));
alter table public.game_relationship_reviews add column semantic_key text;
alter table public.game_relationship_reviews add column identifier_fingerprint text;
-- Normalize inverse facts and unordered identity proposals independently of importer keys.
create function public.game_review_fact_key(kind text, src uuid, dst uuid, rel text) returns text language sql immutable set search_path='' as $$
 select case when kind='identity' then 'identity:'||least(src,dst)||':'||greatest(src,dst)
 when rel='prequel_of' then 'relationship:'||dst||':'||src||':sequel_of'
 when rel='related_to' then 'relationship:'||least(src,dst)||':'||greatest(src,dst)||':related_to'
 else 'relationship:'||src||':'||dst||':'||rel end;
$$;
-- Only external identifiers affect suppression. Titles, reasons, timestamps, platform and copy count do not.
create function public.game_review_identifiers(src uuid,dst uuid) returns text language sql stable security invoker set search_path='' as $$
 select md5(coalesce(jsonb_agg(x.payload order by x.id)::text,'[]')) from (
 select c.id,jsonb_build_object('canonical_id',c.id,'igdb_id',c.igdb_id,'steam_appid',c.steam_appid,
 'owned_identifiers',coalesce((select jsonb_agg(z.p order by z.p::text) from (select distinct jsonb_build_array(g.igdb_id,g.steam_appid) p from public.game_identity_links l join public.games g on g.id=l.game_id where l.canonical_game_id=c.id)z),'[]'::jsonb))payload
 from public.canonical_games c where c.id in(src,dst))x;
$$;
create function public.game_review_resolution(kind text,src uuid,dst uuid,rel text) returns text language plpgsql stable security invoker set search_path='' as $$
declare owned jsonb; begin
 if kind='relationship' and exists(select 1 from public.game_relationships e where public.game_review_fact_key('relationship',e.source_game_id,e.target_game_id,e.relation_type)=public.game_review_fact_key(kind,src,dst,rel)) then return 'Proposed relationship already exists';end if;
 if kind='identity' then
 if exists(select 1 from public.game_relationships e where (e.source_game_id=src and e.target_game_id=dst) or(e.source_game_id=dst and e.target_game_id=src))then return 'Distinct releases already connected by a relationship; identity proposal superseded';end if;
 select metadata->'ownership_ids' into owned from public.canonical_games where id=src;
 if jsonb_typeof(owned)='array' and jsonb_array_length(owned)>0 and
 exists(select 1 from public.game_identity_links l where l.game_id in(select value::bigint from jsonb_array_elements_text(owned)) and l.canonical_game_id=dst) and
 not exists(select 1 from public.game_identity_links l where l.game_id in(select value::bigint from jsonb_array_elements_text(owned)) and l.canonical_game_id<>dst)then return 'Owned copies already share the target identity';end if;
 select metadata->'ownership_ids' into owned from public.canonical_games where id=dst;
 if jsonb_typeof(owned)='array' and jsonb_array_length(owned)>0 and
 exists(select 1 from public.game_identity_links l where l.game_id in(select value::bigint from jsonb_array_elements_text(owned)) and l.canonical_game_id=src) and
 not exists(select 1 from public.game_identity_links l where l.game_id in(select value::bigint from jsonb_array_elements_text(owned)) and l.canonical_game_id<>src)then return 'Owned copies already share the source identity';end if;
 end if;return null;
end $$;
update public.game_relationship_reviews set semantic_key=public.game_review_fact_key(kind,source_game_id,target_game_id,proposed_relation),identifier_fingerprint=public.game_review_identifiers(source_game_id,target_game_id);
-- Preserve duplicate history; rejection takes precedence and only one semantic proposal remains active.
with ranked as(select id,row_number()over(partition by semantic_key,identifier_fingerprint order by case status when 'rejected' then 0 when 'approved' then 1 when 'resolved' then 2 else 3 end,created_at,id)n from public.game_relationship_reviews)
update public.game_relationship_reviews r set semantic_key='historical-duplicate:'||r.id,status='resolved',resolved_at=now(),decision_notes='Duplicate proposal retained as historical record' from ranked d where r.id=d.id and d.n>1;
update public.game_relationship_reviews set candidate_key=semantic_key||':'||identifier_fingerprint;
alter table public.game_relationship_reviews alter column semantic_key set not null;
alter table public.game_relationship_reviews alter column identifier_fingerprint set not null;
create unique index game_review_semantic_identifiers_unique on public.game_relationship_reviews(semantic_key,identifier_fingerprint);
create function public.prepare_game_relationship_review() returns trigger language plpgsql security invoker set search_path='' as $$
declare reason text;begin
 new.semantic_key:=public.game_review_fact_key(new.kind,new.source_game_id,new.target_game_id,new.proposed_relation);
 new.identifier_fingerprint:=public.game_review_identifiers(new.source_game_id,new.target_game_id);
 new.candidate_key:=new.semantic_key||':'||new.identifier_fingerprint;
 -- Expire old evidence without erasing a rejection. Changed identifiers permit a new proposal.
 update public.game_relationship_reviews set status='resolved',resolved_at=now(),decision_notes='Superseded by materially changed external identifiers'
 where semantic_key=new.semantic_key and identifier_fingerprint<>new.identifier_fingerprint and status='pending';
 reason:=public.game_review_resolution(new.kind,new.source_game_id,new.target_game_id,new.proposed_relation);
 if reason is not null then new.status:='resolved';new.resolved_at:=now();new.decision_notes:=reason;end if;
 return new;
end $$;
create trigger prepare_game_relationship_review before insert on public.game_relationship_reviews for each row execute function public.prepare_game_relationship_review();
create function public.reconcile_game_relationship_reviews() returns integer language plpgsql security invoker set search_path='' as $$
declare n integer;begin
 update public.game_relationship_reviews r set status='resolved',resolved_at=now(),decision_notes=public.game_review_resolution(r.kind,r.source_game_id,r.target_game_id,r.proposed_relation)
 where status='pending' and public.game_review_resolution(r.kind,r.source_game_id,r.target_game_id,r.proposed_relation)is not null;
 get diagnostics n=row_count;return n;
end $$;
create or replace function public.resolve_game_relationship_review(review_id uuid,approve boolean,notes text default null) returns void language plpgsql security invoker set search_path='' as $$
declare r public.game_relationship_reviews;reason text;begin
 perform pg_advisory_xact_lock(809162026);
 select * into r from public.game_relationship_reviews where id=review_id for update;
 if not found then raise exception 'Review not found';end if;
 if r.status<>'pending' then return;end if;
 reason:=public.game_review_resolution(r.kind,r.source_game_id,r.target_game_id,r.proposed_relation);
 if reason is not null then update public.game_relationship_reviews set status='resolved',resolved_at=now(),decision_notes=reason where id=review_id;return;end if;
 if r.identifier_fingerprint<>public.game_review_identifiers(r.source_game_id,r.target_game_id) then
 update public.game_relationship_reviews set status='resolved',resolved_at=now(),decision_notes='Identifiers changed; rerun backfill to review current evidence' where id=review_id;return;end if;
 if approve then
 if r.kind='identity' then
 if exists(select 1 from public.game_relationships where source_game_id=r.source_game_id or target_game_id=r.source_game_id)
 or exists(select 1 from public.canonical_game_series where canonical_game_id=r.source_game_id)
 or exists(select 1 from public.canonical_game_franchises where canonical_game_id=r.source_game_id)then raise exception 'Source has relationships or memberships. Resolve these before consolidating its identity';end if;
 update public.game_identity_links set canonical_game_id=r.target_game_id,version_id=(select id from public.game_versions where canonical_game_id=r.target_game_id),match_type='manual',confidence=1 where canonical_game_id=r.source_game_id;
 else insert into public.game_relationships(source_game_id,target_game_id,relation_type,confidence,source,notes)values(r.source_game_id,r.target_game_id,r.proposed_relation,0.95,'manual_review',r.reason)on conflict do nothing;end if;
 end if;
 update public.game_relationship_reviews set status=case when approve then 'approved' else 'rejected'end,decision_notes=notes,resolved_at=now()where id=review_id;
 perform public.reconcile_game_relationship_reviews();
end $$;
-- Verified by the owner: preserve both dated Stellar Blade release identities and their demo variants.
with verified(src_title,dst_title,src_year,dst_year,igdb,rel) as(values
 ('stellar blade demo','stellar blade',2024,2024,117170::bigint,'demo_of'),
 ('stellar blade demo','stellar blade',2025,2025,117170::bigint,'demo_of'),
 ('hell is us demo','hell is us',2025,2025,196954::bigint,'demo_of'),
 ('valor mortis playtest','valor mortis',2025,2026,361833::bigint,'playtest_of')),
 pairs as(select s.id src,t.id dst,v.rel from verified v join public.canonical_games s on s.normalized_title=v.src_title and s.igdb_id=v.igdb and extract(year from s.release_date)=v.src_year join public.canonical_games t on t.normalized_title=v.dst_title and t.igdb_id=v.igdb and extract(year from t.release_date)=v.dst_year
 where (select count(*)from public.canonical_games where normalized_title=v.src_title and igdb_id=v.igdb and extract(year from release_date)=v.src_year)=1 and(select count(*)from public.canonical_games where normalized_title=v.dst_title and igdb_id=v.igdb and extract(year from release_date)=v.dst_year)=1)
insert into public.game_relationships(source_game_id,target_game_id,relation_type,confidence,source,notes)
select src,dst,rel,1,'owner_verified','Owner verified demo/playtest relationship; release variants preserved'from pairs on conflict do nothing;
select public.reconcile_game_relationship_reviews();
create or replace function public.apply_game_relationship_enrichment(plan jsonb) returns void language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(809162026);
 insert into public.game_franchises(id,name,slug,igdb_franchise_id)
 select x.id,x.name,x.slug,x.igdb_franchise_id from jsonb_to_recordset(plan->'franchises') x(id uuid,name text,slug text,igdb_franchise_id bigint) on conflict do nothing;
 insert into public.game_series(id,name,slug)
 select x.id,x.name,x.slug from jsonb_to_recordset(plan->'series') x(id uuid,name text,slug text) on conflict do nothing;
 insert into public.canonical_game_franchises(canonical_game_id,franchise_id)
 select x.canonical_game_id,x.franchise_id from jsonb_to_recordset(plan->'franchise_memberships') x(canonical_game_id uuid,franchise_id uuid) on conflict do nothing;
 insert into public.canonical_game_series(canonical_game_id,series_id)
 select x.canonical_game_id,x.series_id from jsonb_to_recordset(plan->'series_memberships') x(canonical_game_id uuid,series_id uuid) on conflict do nothing;
 insert into public.game_relationships(source_game_id,target_game_id,relation_type,confidence,source,notes)
 select x.source_game_id,x.target_game_id,x.relation_type,0.95,'igdb_verified',x.notes from jsonb_to_recordset(plan->'relationships') x(source_game_id uuid,target_game_id uuid,relation_type text,notes text)
 where not exists(select 1 from public.game_relationship_reviews r where r.source_game_id=x.source_game_id and r.target_game_id=x.target_game_id and r.proposed_relation=x.relation_type and r.status='rejected' and r.identifier_fingerprint=public.game_review_identifiers(x.source_game_id,x.target_game_id))
 on conflict do nothing;
 insert into public.game_relationship_reviews(candidate_key,kind,source_game_id,target_game_id,proposed_relation,confidence,reason,identifiers)
 select x.candidate_key,'relationship',x.source_game_id,x.target_game_id,x.proposed_relation,x.confidence,x.reason,x.identifiers from jsonb_to_recordset(plan->'reviews') x(candidate_key text,source_game_id uuid,target_game_id uuid,proposed_relation text,confidence numeric,reason text,identifiers jsonb)
 on conflict(candidate_key) do nothing;
 -- Downgrade only untouched facts inserted by this enrichment tool when current evidence is suspicious.
 delete from public.game_relationships e using jsonb_to_recordset(plan->'reviews') x(source_game_id uuid,target_game_id uuid,proposed_relation text)
 where e.source='igdb_verified' and e.updated_at=e.created_at and e.source_game_id=x.source_game_id and e.target_game_id=x.target_game_id and e.relation_type=x.proposed_relation;
 update public.game_relationship_reviews r set status='pending',resolved_at=null,decision_notes=null
 where r.status='approved' and r.decision_notes='Verified by explicit IGDB relationship metadata'
 and exists(select 1 from jsonb_to_recordset(plan->'reviews') x(source_game_id uuid,target_game_id uuid,proposed_relation text) where r.source_game_id=x.source_game_id and r.target_game_id=x.target_game_id and r.proposed_relation=x.proposed_relation)
 and not exists(select 1 from public.game_relationships e where e.source_game_id=r.source_game_id and e.target_game_id=r.target_game_id and e.relation_type=r.proposed_relation);
 -- Resolve matching pending heuristic proposals only after a verified fact exists. Explicit rejections remain intact.
 update public.game_relationship_reviews r set status='approved',resolved_at=now(),decision_notes='Verified by explicit IGDB relationship metadata'
 where r.kind='relationship' and r.status='pending' and exists(select 1 from public.game_relationships e where e.source_game_id=r.source_game_id and e.target_game_id=r.target_game_id and e.relation_type=r.proposed_relation and e.source='igdb_verified');
 perform public.reconcile_game_relationship_reviews();
 insert into public.game_relationship_backfill_runs(report) values(plan->'report');
end $$;
create or replace function public.apply_game_identity_backfill(plan jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
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
 perform public.reconcile_game_relationship_reviews();
 insert into public.game_relationship_backfill_runs(report) values(plan->'report');
 return plan->'report';
end $$;
revoke all on function public.game_review_fact_key(text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.game_review_fact_key(text,uuid,uuid,text) to service_role;
revoke all on function public.game_review_identifiers(uuid,uuid) from public,anon,authenticated;
grant execute on function public.game_review_identifiers(uuid,uuid) to service_role;
revoke all on function public.game_review_resolution(text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.game_review_resolution(text,uuid,uuid,text) to service_role;
revoke all on function public.prepare_game_relationship_review() from public,anon,authenticated;
grant execute on function public.prepare_game_relationship_review() to service_role;
revoke all on function public.reconcile_game_relationship_reviews() from public,anon,authenticated;
grant execute on function public.reconcile_game_relationship_reviews() to service_role;

commit;

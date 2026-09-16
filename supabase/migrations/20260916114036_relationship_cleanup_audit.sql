begin;
create or replace function public.game_release_class(title text)returns text language sql immutable set search_path=''as $$
 select case when public.game_identity_title(title)~'\mdemo\M'then 'demo'
 when public.game_identity_title(title)~'\mplaytest\M'then 'playtest'
 when public.game_identity_title(title)~'\mbeta\M'then 'beta'
 when public.game_identity_title(title)~'\mprologue\M'then 'prologue'
 when public.game_identity_title(title)~'\mremaster(ed)?\M'then 'remaster'
 when public.game_identity_title(title)~'\mremake\M'then 'remake'
 when public.game_identity_title(title)~'\mcollection\M'then 'collection'
 when public.game_identity_markers(title)<>''then 'edition'else 'base'end;
$$;
alter function public.audit_game_relationship_integrity()rename to audit_game_relationship_integrity_core;
create function public.audit_game_relationship_integrity()returns jsonb language sql stable security invoker set search_path=''as $$
 with core as(select public.audit_game_relationship_integrity_core()data),
 orphan as(select c.id,c.title from public.canonical_games c where not exists(select 1 from public.game_identity_links where canonical_game_id=c.id)and not exists(select 1 from public.game_relationships where source_game_id=c.id or target_game_id=c.id)and not exists(select 1 from public.canonical_game_series where canonical_game_id=c.id)and not exists(select 1 from public.canonical_game_franchises where canonical_game_id=c.id)and not exists(select 1 from public.game_relationship_reviews where source_game_id=c.id or target_game_id=c.id)),
 broken as(
 select 'identity link'kind,l.game_id::text id from public.game_identity_links l left join public.games g on g.id=l.game_id left join public.canonical_games c on c.id=l.canonical_game_id left join public.game_versions v on v.id=l.version_id and v.canonical_game_id=l.canonical_game_id where g.id is null or c.id is null or(l.version_id is not null and v.id is null)
 union all select 'relationship',e.id::text from public.game_relationships e left join public.canonical_games a on a.id=e.source_game_id left join public.canonical_games b on b.id=e.target_game_id where a.id is null or b.id is null
 union all select 'version',v.id::text from public.game_versions v left join public.canonical_games c on c.id=v.canonical_game_id where c.id is null
 union all select 'review',r.id::text from public.game_relationship_reviews r left join public.canonical_games a on a.id=r.source_game_id left join public.canonical_games b on b.id=r.target_game_id where a.id is null or b.id is null
 union all select 'series membership',m.canonical_game_id::text from public.canonical_game_series m left join public.canonical_games c on c.id=m.canonical_game_id left join public.game_series t on t.id=m.series_id where c.id is null or t.id is null
 union all select 'franchise membership',m.canonical_game_id::text from public.canonical_game_franchises m left join public.canonical_games c on c.id=m.canonical_game_id left join public.game_franchises t on t.id=m.franchise_id where c.id is null or t.id is null
 union all select 'series parent',t.id::text from public.game_series t left join public.game_franchises f on f.id=t.franchise_id where t.franchise_id is not null and f.id is null),
 inverse_conflicts as(select e.id first_id,f.id second_id from public.game_relationships e join public.game_relationships f on e.id<f.id and e.source_game_id=f.target_game_id and e.target_game_id=f.source_game_id where e.relation_type<>'related_to'and f.relation_type<>'related_to'and public.game_review_fact_key('relationship',e.source_game_id,e.target_game_id,e.relation_type)<>public.game_review_fact_key('relationship',f.source_game_id,f.target_game_id,f.relation_type)),
 demo_merges as(select distinct c.id,c.title from public.canonical_games c join public.game_identity_links l on l.canonical_game_id=c.id join public.games g on g.id=l.game_id where public.game_release_class(c.title)<>public.game_release_class(g.title)and(public.game_release_class(c.title)in('demo','playtest','beta','prologue')or public.game_release_class(g.title)in('demo','playtest','beta','prologue'))),
 collection_merges as(select distinct c.id,c.title from public.canonical_games c join public.game_identity_links l on l.canonical_game_id=c.id join public.games g on g.id=l.game_id where (public.game_release_class(c.title)='collection')<>(public.game_release_class(g.title)='collection'))
 select data||jsonb_build_object('counts',(data->'counts')||jsonb_build_object('orphan_canonical_records',(select count(*)from orphan),'broken_foreign_keys',(select count(*)from broken),'conflicting_inverse_relationships',(select count(*)from inverse_conflicts),'duplicate_edition_remaster_links',(select count(*)from jsonb_array_elements(data->'conflicting_relationships')),'demo_full_game_merges',(select count(*)from demo_merges),'collection_component_identity_mistakes',(select count(*)from collection_merges)),
 'orphan_canonical_records',coalesce((select jsonb_agg(to_jsonb(orphan))from orphan),'[]'),
 'broken_foreign_keys',coalesce((select jsonb_agg(to_jsonb(broken))from broken),'[]'),
 'conflicting_inverse_relationships',coalesce((select jsonb_agg(to_jsonb(inverse_conflicts))from inverse_conflicts),'[]'),
 'demo_full_game_merges',coalesce((select jsonb_agg(to_jsonb(demo_merges))from demo_merges),'[]'),
 'collection_component_identity_mistakes',coalesce((select jsonb_agg(to_jsonb(collection_merges))from collection_merges),'[]'))from core;
$$;
revoke all on function public.audit_game_relationship_integrity()from public,anon,authenticated;
grant execute on function public.audit_game_relationship_integrity()to service_role;
-- Enrichment may propose new facts, but it cannot remove previously verified or manually curated facts.
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
 where not exists(select 1 from public.game_relationship_reviews r where r.semantic_key=public.game_review_fact_key('relationship',x.source_game_id,x.target_game_id,x.relation_type) and r.status='rejected' and r.identifier_fingerprint=public.game_review_identifiers(x.source_game_id,x.target_game_id))
 on conflict do nothing;
 insert into public.game_relationship_reviews(candidate_key,kind,source_game_id,target_game_id,proposed_relation,confidence,reason,identifiers)
 select x.candidate_key,'relationship',x.source_game_id,x.target_game_id,x.proposed_relation,x.confidence,x.reason,x.identifiers from jsonb_to_recordset(plan->'reviews') x(candidate_key text,source_game_id uuid,target_game_id uuid,proposed_relation text,confidence numeric,reason text,identifiers jsonb)
 on conflict(candidate_key) do nothing;
 -- Resolve matching pending heuristic proposals only after a verified fact exists. Explicit rejections remain intact.
 update public.game_relationship_reviews r set status='resolved',resolved_at=now(),decision_notes='Verified relationship already exists'
 where r.kind='relationship' and r.status='pending' and exists(select 1 from public.game_relationships e where e.source_game_id=r.source_game_id and e.target_game_id=r.target_game_id and e.relation_type=r.proposed_relation and e.source='igdb_verified');
 perform public.reconcile_game_relationship_reviews();
 insert into public.game_relationship_backfill_runs(report) values(plan->'report');
end $$;
-- Version descriptors match the specific release classification retained by this cleanup.
update public.game_versions v set version_type=replace(e.relation_type,'_of','')from public.game_relationships e join public.canonical_games c on c.id=e.source_game_id where v.canonical_game_id=c.id and c.normalized_title in('hard reset redux','little nightmares enhanced edition','mafia definitive edition','mafia ii definitive edition','metro last light redux','the outer worlds spacer s choice edition')and e.relation_type in('remaster_of','remake_of','enhanced_edition_of');
-- Retire only unreferenced descriptors accidentally created on base identities by the old backfill.
delete from public.game_versions v using public.canonical_games c where c.id=v.canonical_game_id and c.normalized_title in('dishonored','the talos principle','kingdom come deliverance','dark deity','styx shards of darkness')and not exists(select 1 from public.game_identity_links l where l.version_id=v.id);
NOTIFY pgrst,'reload schema';
commit;

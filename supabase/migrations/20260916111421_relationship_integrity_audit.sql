begin;
create function public.game_release_class(title text) returns text language sql immutable set search_path='' as $$
 select case when lower(title)~'(^|[^a-z])demo([^a-z]|$)'then 'demo'
 when lower(title)~'(^|[^a-z])playtest([^a-z]|$)'then 'playtest'
 when lower(title)~'(^|[^a-z])beta([^a-z]|$)'then 'beta'
 when lower(title)~'(^|[^a-z])prologue([^a-z]|$)'then 'prologue'
 when lower(title)~'(^|[^a-z])remaster(ed)?([^a-z]|$)'then 'remaster'
 when lower(title)~'(^|[^a-z])remake([^a-z]|$)'then 'remake'
 when lower(title)~'(edition|director.s cut|redux)'then 'edition' else 'base'end;
$$;
create function public.audit_game_relationship_integrity() returns jsonb language sql stable security invoker set search_path='' as $$
 with missing as(select g.id,g.title from public.games g where not exists(select 1 from public.game_identity_links l where l.game_id=g.id)),
 unused as(select c.id,c.title,c.igdb_id,c.release_date from public.canonical_games c where not exists(select 1 from public.game_identity_links l where l.canonical_game_id=c.id)),
 duplicate_links as(select game_id,count(*)n from public.game_identity_links group by game_id having count(*)>1),
 duplicate_edges as(select public.game_review_fact_key('relationship',source_game_id,target_game_id,relation_type)fact,count(*)n from public.game_relationships group by fact having count(*)>1),
 self_edges as(select * from public.game_relationships where source_game_id=target_game_id),
 review_duplicates as(select semantic_key,identifier_fingerprint,count(*)n from public.game_relationship_reviews where semantic_key not like 'historical-duplicate:%' group by semantic_key,identifier_fingerprint having count(*)>1),
 conflicts as(select e.id first_id,f.id second_id,a.title source,b.title target,e.relation_type first_type,f.relation_type second_type,
 case when e.source_game_id=f.target_game_id then 'Opposing directed facts' else 'Multiple release classifications for the same pair'end reason
 from public.game_relationships e join public.game_relationships f on e.id<f.id and
 ((e.source_game_id=f.target_game_id and e.target_game_id=f.source_game_id and e.relation_type=f.relation_type and e.relation_type<>'related_to') or
 (e.source_game_id=f.source_game_id and e.target_game_id=f.target_game_id and e.relation_type<>f.relation_type and e.relation_type in('demo_of','playtest_of','beta_of','prologue_of','remake_of','remaster_of','edition_of','enhanced_edition_of') and f.relation_type in('demo_of','playtest_of','beta_of','prologue_of','remake_of','remaster_of','edition_of','enhanced_edition_of')))
 join public.canonical_games a on a.id=e.source_game_id join public.canonical_games b on b.id=e.target_game_id),
 suspicious as(select c.id,c.title,jsonb_agg(jsonb_build_object('game_id',g.id,'title',g.title,'igdb_id',g.igdb_id,'steam_appid',g.steam_appid,'release',g.release,'platform',g.platform)order by g.id)copies,
 'Release-class mismatch or conflicting IGDB identifiers; investigate mapping without merging ownership' reason
 from public.canonical_games c join public.game_identity_links l on l.canonical_game_id=c.id join public.games g on g.id=l.game_id
 group by c.id having count(distinct public.game_release_class(g.title))>1 or bool_or(public.game_release_class(g.title)<>public.game_release_class(c.title)) or count(distinct g.igdb_id)filter(where g.igdb_id>0)>1),
 pending as(select r.id,r.kind,a.title source,b.title target,r.proposed_relation,r.confidence,r.reason from public.game_relationship_reviews r join public.canonical_games a on a.id=r.source_game_id join public.canonical_games b on b.id=r.target_game_id where r.status='pending'),
 stale as(select id from public.game_relationship_reviews where status='pending' and identifier_fingerprint<>public.game_review_identifiers(source_game_id,target_game_id)),
 resolved_fact as(select id from public.game_relationship_reviews where status='pending' and public.game_review_resolution(kind,source_game_id,target_game_id,proposed_relation)is not null)
 select jsonb_build_object('snapshot_at',now(),'counts',jsonb_build_object(
 'library_entries',(select count(*)from public.games),'canonical_games',(select count(*)from public.canonical_games),
 'library_entries_without_identity',(select count(*)from missing),'canonical_games_without_library_entries',(select count(*)from unused),
 'duplicate_mappings',(select count(*)from duplicate_links),'duplicate_relationships',(select count(*)from duplicate_edges),'self_relationships',(select count(*)from self_edges),
 'conflicting_relationship_pairs',(select count(*)from conflicts),'suspicious_merge_groups',(select count(*)from suspicious),'duplicate_review_candidates',(select count(*)from review_duplicates),
 'stale_pending_reviews',(select count(*)from stale),'pending_already_resolved',(select count(*)from resolved_fact),
 'relationships',(select count(*)from public.game_relationships),'owner_verified_relationships',(select count(*)from public.game_relationships where source='owner_verified'),
 'pending_reviews',(select count(*)from pending),'pending_identity_reviews',(select count(*)from pending where kind='identity'),'pending_relationship_reviews',(select count(*)from pending where kind='relationship'),
 'resolved_reviews',(select count(*)from public.game_relationship_reviews where status='resolved'),'rejected_reviews',(select count(*)from public.game_relationship_reviews where status='rejected')),
 'missing_identity',coalesce((select jsonb_agg(to_jsonb(missing))from missing),'[]'),
 'unused_canonical',coalesce((select jsonb_agg(to_jsonb(unused))from unused),'[]'),
 'conflicting_relationships',coalesce((select jsonb_agg(to_jsonb(conflicts))from conflicts),'[]'),
 'suspicious_merges',coalesce((select jsonb_agg(to_jsonb(suspicious))from suspicious),'[]'),
 'pending_reviews',coalesce((select jsonb_agg(to_jsonb(pending))from pending),'[]'));
$$;
revoke all on function public.game_release_class(text),public.audit_game_relationship_integrity() from public,anon,authenticated;
grant execute on function public.game_release_class(text),public.audit_game_relationship_integrity() to service_role;
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
 -- Downgrade only untouched facts inserted by this enrichment tool when current evidence is suspicious.
 delete from public.game_relationships e using jsonb_to_recordset(plan->'reviews') x(source_game_id uuid,target_game_id uuid,proposed_relation text)
 where e.source='igdb_verified' and e.updated_at=e.created_at and e.source_game_id=x.source_game_id and e.target_game_id=x.target_game_id and e.relation_type=x.proposed_relation;
 update public.game_relationship_reviews r set status='pending',resolved_at=null,decision_notes=null
 where r.status='approved' and r.decision_notes='Verified by explicit IGDB relationship metadata'
 and exists(select 1 from jsonb_to_recordset(plan->'reviews') x(source_game_id uuid,target_game_id uuid,proposed_relation text) where r.source_game_id=x.source_game_id and r.target_game_id=x.target_game_id and r.proposed_relation=x.proposed_relation)
 and not exists(select 1 from public.game_relationships e where e.source_game_id=r.source_game_id and e.target_game_id=r.target_game_id and e.relation_type=r.proposed_relation);
 -- Resolve matching pending heuristic proposals only after a verified fact exists. Explicit rejections remain intact.
 update public.game_relationship_reviews r set status='resolved',resolved_at=now(),decision_notes='Verified relationship already exists'
 where r.kind='relationship' and r.status='pending' and exists(select 1 from public.game_relationships e where e.source_game_id=r.source_game_id and e.target_game_id=r.target_game_id and e.relation_type=r.proposed_relation and e.source='igdb_verified');
 perform public.reconcile_game_relationship_reviews();
 insert into public.game_relationship_backfill_runs(report) values(plan->'report');
end $$;
commit;

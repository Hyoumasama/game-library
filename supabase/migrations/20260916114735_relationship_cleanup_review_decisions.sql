begin;
-- Different titles after punctuation normalization do not override verified IDs and release chronology.
do $$ declare src uuid; dst uuid; r uuid; begin
 select id into src from public.canonical_games where normalized_title='star wars battlefront ii celebration edition'and igdb_id=26401;
 select id into dst from public.canonical_games where normalized_title='star wars battlefront ii'and igdb_id=142 and extract(year from release_date)=2005;
 if src is not null and dst is not null then
 insert into public.game_relationship_reviews(candidate_key,kind,source_game_id,target_game_id,proposed_relation,confidence,reason)values(gen_random_uuid()::text,'relationship',src,dst,'edition_of',1,'2005 and 2017 Battlefront II are different releases; Celebration belongs to the 2017 game')on conflict(candidate_key)do nothing;
 select id into r from public.game_relationship_reviews where semantic_key=public.game_review_fact_key('relationship',src,dst,'edition_of')and identifier_fingerprint=public.game_review_identifiers(src,dst);
 perform public.resolve_game_relationship_review(r,false,'Verified mismatch: IGDB 142 / Steam 6060 (2005) versus IGDB 26401 / Steam 1237950 (2017)');
 end if;
 select id into src from public.canonical_games where normalized_title='stellar blade demo'and igdb_id=117170 and extract(year from release_date)=2025;
 select id into dst from public.canonical_games where normalized_title='stellar blade demo'and igdb_id=117170 and extract(year from release_date)=2024;
 if src is not null and dst is not null then
 insert into public.game_relationship_reviews(candidate_key,kind,source_game_id,target_game_id,confidence,reason)values(gen_random_uuid()::text,'identity',src,dst,1,'Dated demo release variants have separate owner-verified full-game relationships')on conflict(candidate_key)do nothing;
 select id into r from public.game_relationship_reviews where semantic_key=public.game_review_fact_key('identity',src,dst,null)and identifier_fingerprint=public.game_review_identifiers(src,dst);
 perform public.resolve_game_relationship_review(r,false,'Preserve 2024 and 2025 demo release identities and corresponding owner-verified demo_of edges');
 end if;
end $$;
-- Audit different edition markers even when both releases share the generic edition class and IDs.
create or replace function public.audit_game_relationship_integrity_core()returns jsonb language sql stable security invoker set search_path=''as $$
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
 'Release-class mismatch, conflicting IGDB identifiers or mixed variant release years; investigate mapping without merging ownership' reason
 from public.canonical_games c join public.game_identity_links l on l.canonical_game_id=c.id join public.games g on g.id=l.game_id
 group by c.id having count(distinct public.game_release_class(g.title))>1 or bool_or(public.game_release_class(g.title)<>public.game_release_class(c.title)) or count(distinct g.igdb_id)filter(where g.igdb_id>0)>1 or bool_or((public.game_identity_markers(c.title)<>''or public.game_identity_markers(g.title)<>'')and public.game_identity_title(c.title)<>public.game_identity_title(g.title)) or (public.game_release_class(c.title) in('demo','playtest','beta','prologue','edition','remaster','remake') and count(distinct extract(year from g.release))>1)),
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
NOTIFY pgrst,'reload schema';
commit;

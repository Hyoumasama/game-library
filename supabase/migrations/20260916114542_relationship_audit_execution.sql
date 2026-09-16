begin;
create or replace function public.audit_game_relationship_integrity()returns jsonb language sql stable security invoker set search_path=''as $$
 with core as materialized(select public.audit_game_relationship_integrity_core()data),
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
NOTIFY pgrst,'reload schema';
commit;

begin;
create function public.apply_game_relationship_enrichment(plan jsonb) returns void language plpgsql security invoker set search_path='' as $$
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
 where not exists(select 1 from public.game_relationship_reviews r where r.source_game_id=x.source_game_id and r.target_game_id=x.target_game_id and r.proposed_relation=x.relation_type and r.status='rejected')
 on conflict do nothing;
 insert into public.game_relationship_reviews(candidate_key,kind,source_game_id,target_game_id,proposed_relation,confidence,reason,identifiers)
 select x.candidate_key,'relationship',x.source_game_id,x.target_game_id,x.proposed_relation,x.confidence,x.reason,x.identifiers from jsonb_to_recordset(plan->'reviews') x(candidate_key text,source_game_id uuid,target_game_id uuid,proposed_relation text,confidence numeric,reason text,identifiers jsonb)
 on conflict(candidate_key) do nothing;
 -- Resolve matching pending heuristic proposals only after a verified fact exists. Explicit rejections remain intact.
 update public.game_relationship_reviews r set status='approved',resolved_at=now(),decision_notes='Verified by explicit IGDB relationship metadata'
 where r.kind='relationship' and r.status='pending' and exists(select 1 from public.game_relationships e where e.source_game_id=r.source_game_id and e.target_game_id=r.target_game_id and e.relation_type=r.proposed_relation and e.source='igdb_verified');
 insert into public.game_relationship_backfill_runs(report) values(plan->'report');
end $$;
revoke all on function public.apply_game_relationship_enrichment(jsonb) from public,anon,authenticated;
grant execute on function public.apply_game_relationship_enrichment(jsonb) to service_role;
commit;

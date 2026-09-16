-- Integration assertions run in one transaction and leave production rows unchanged.
begin;
do $$ declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); rid uuid; reviewid uuid; gid bigint; begin
 insert into public.canonical_games(id,title,normalized_title) values(a,'Relationship test original','relationship test original'),(b,'Relationship test derived','relationship test derived');
 insert into public.game_relationships(source_game_id,target_game_id,relation_type,confidence,source) values(b,a,'sequel_of',1,'integration_test') returning id into rid;
 begin insert into public.game_relationships(source_game_id,target_game_id,relation_type,confidence,source) values(b,a,'sequel_of',1,'integration_test');raise exception 'duplicate allowed';exception when unique_violation then null;end;
 begin insert into public.game_relationships(source_game_id,target_game_id,relation_type,confidence,source) values(a,b,'prequel_of',1,'integration_test');raise exception 'inverse duplicate allowed';exception when unique_violation then null;end;
 begin insert into public.game_relationships(source_game_id,target_game_id,relation_type,confidence,source) values(a,a,'related_to',1,'integration_test');raise exception 'self edge allowed';exception when check_violation then null;end;
 begin insert into public.game_relationships(source_game_id,target_game_id,relation_type,confidence,source) values(a,b,'same_game',1,'integration_test');raise exception 'same_game allowed';exception when check_violation then null;end;
 delete from public.game_relationships where id=rid;
 if exists(select 1 from public.game_relationships where id=rid) then raise exception 'deletion failed';end if;
 insert into public.game_relationship_reviews(candidate_key,kind,source_game_id,target_game_id,proposed_relation,confidence,reason) values(a::text,'relationship',b,a,'remaster_of',0.8,'test ambiguity') returning id into reviewid;
 if exists(select 1 from public.game_relationships where source_game_id=b and target_game_id=a)then raise exception 'candidate auto inserted';end if;
 perform public.resolve_game_relationship_review(reviewid,true,'verified');
 if not exists(select 1 from public.game_relationships where source_game_id=b and target_game_id=a and relation_type='remaster_of')then raise exception 'approval failed';end if;
 perform public.resolve_game_relationship_review(reviewid,false);
 if (select status from public.game_relationship_reviews where id=reviewid)<>'approved' then raise exception 'repeat decision changed history';end if;
 insert into public.game_relationships(source_game_id,target_game_id,relation_type,confidence,source) values(b,a,'expansion_of',0.95,'integration_test'),(b,a,'edition_of',0.95,'integration_test');
 insert into public.game_relationship_reviews(candidate_key,kind,source_game_id,target_game_id,proposed_relation,confidence,reason) values(b::text,'relationship',a,b,'related_to',0.5,'test rejection') returning id into reviewid;
 perform public.resolve_game_relationship_review(reviewid,false);
 if exists(select 1 from public.game_relationships where source_game_id=a and target_game_id=b and relation_type='related_to')then raise exception 'rejected inserted';end if;
 select id into gid from public.games order by id limit 1;
 -- Existing mappings can be tested without retaining any mutations because of rollback.
 update public.game_identity_links set canonical_game_id=a,version_id=null where game_id=gid;
 if not exists(select 1 from public.game_identity_links where game_id=gid and canonical_game_id=a)then raise exception 'copy mapping failed';end if;
 if has_table_privilege('anon','public.game_relationship_reviews','SELECT') or has_table_privilege('authenticated','public.game_relationships','INSERT') or has_function_privilege('anon','public.resolve_game_relationship_review(uuid,boolean,text)','EXECUTE')then raise exception 'RLS grants unsafe';end if;
end $$;
do $$ declare g1 bigint; g2 bigint; c uuid; v uuid; reviewid uuid; other uuid:=gen_random_uuid(); begin
 insert into public.games(title,slug,igdb_id,release) values('Relationship ownership test',gen_random_uuid()::text,999999998,'2026-01-01') returning id into g1;
 insert into public.games(title,slug,igdb_id,release) values('Relationship ownership test',gen_random_uuid()::text,999999998,'2026-01-01') returning id into g2;
 select canonical_game_id into c from public.game_identity_links where game_id=g1;
 if c is null or not exists(select 1 from public.game_identity_links where game_id=g2 and canonical_game_id=c) then raise exception 'new ownership copies did not share canonical identity';end if;
 insert into public.canonical_games(id,title,normalized_title) values(other,'Version other','version other');
 insert into public.game_versions(canonical_game_id,name,version_type) values(other,'Definitive Edition','edition') returning id into v;
 begin update public.game_identity_links set version_id=v where game_id=g1;raise exception 'cross-identity version allowed';exception when foreign_key_violation then null;end;
 update public.game_identity_links set canonical_game_id=other,version_id=v where game_id=g2;
 insert into public.game_relationship_reviews(candidate_key,kind,source_game_id,target_game_id,confidence,reason)
 values(gen_random_uuid()::text,'identity',other,c,0.6,'Synthetic ambiguous identity') returning id into reviewid;
 perform public.resolve_game_relationship_review(reviewid,true,'Confirmed same identity');
 if not exists(select 1 from public.game_identity_links where game_id=g2 and canonical_game_id=c and version_id is null and match_type='manual')then raise exception 'identity review approval did not remap ownership';end if;
 if not exists(select 1 from public.games where id=g2)then raise exception 'identity approval removed ownership';end if;
 update public.canonical_games set metadata=jsonb_build_object('ownership_ids',jsonb_build_array(g2)) where id=other;
 insert into public.game_relationship_reviews(candidate_key,kind,source_game_id,target_game_id,confidence,reason)values('already consolidated','identity',c,other,0.7,'inverse existing identity')on conflict(candidate_key)do nothing;
 if public.game_review_resolution('identity',other,c,null)is null then raise exception 'already shared identity was not detected';end if;
end $$;
do $$ declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); r uuid; fingerprint text; t text; begin
 insert into public.canonical_games(id,title,normalized_title)values(a,'Finalization base','finalization base'),(b,'Finalization derived','finalization derived');
 foreach t in array array['demo_of','playtest_of','beta_of','prologue_of'] loop
 insert into public.game_relationships(source_game_id,target_game_id,relation_type,confidence,source)values(b,a,t,1,'integration_test');
 insert into public.game_relationship_reviews(candidate_key,kind,source_game_id,target_game_id,proposed_relation,confidence,reason)values(gen_random_uuid()::text,'relationship',b,a,t,1,'existing fact')returning id into r;
 if(select status from public.game_relationship_reviews where id=r)<>'resolved'then raise exception 'existing fact did not resolve: %',t;end if;
 perform public.resolve_game_relationship_review(r,true);
 end loop;
 insert into public.game_relationship_reviews(candidate_key,kind,source_game_id,target_game_id,confidence,reason)values(gen_random_uuid()::text,'identity',a,b,0.5,'distinct release') returning id into r;
 if(select status from public.game_relationship_reviews where id=r)<>'resolved'then raise exception 'distinct identity fact not resolved';end if;
 insert into public.game_relationship_reviews(candidate_key,kind,source_game_id,target_game_id,proposed_relation,confidence,reason)values('first','relationship',b,a,'sequel_of',0.5,'reject me')returning id,identifier_fingerprint into r,fingerprint;
 perform public.resolve_game_relationship_review(r,false,'Not verified');
 insert into public.game_relationship_reviews(candidate_key,kind,source_game_id,target_game_id,proposed_relation,confidence,reason)values('different importer key','relationship',a,b,'prequel_of',0.7,'inverse duplicate')on conflict(candidate_key)do nothing;
 if(select count(*)from public.game_relationship_reviews where semantic_key=public.game_review_fact_key('relationship',b,a,'sequel_of'))<>1 then raise exception 'inverse candidate duplicated';end if;
 update public.canonical_games set title='Changed display title' where id=a;
 if public.game_review_identifiers(a,b)<>fingerprint then raise exception 'display edit changed identifier evidence';end if;
 perform public.apply_game_relationship_enrichment(jsonb_build_object('franchises','[]'::jsonb,'series','[]'::jsonb,'franchise_memberships','[]'::jsonb,'series_memberships','[]'::jsonb,'reviews','[]'::jsonb,'report','{}'::jsonb,'relationships',jsonb_build_array(jsonb_build_object('source_game_id',a,'target_game_id',b,'relation_type','prequel_of'))));
 if exists(select 1 from public.game_relationships where relation_type in('prequel_of','sequel_of')and source_game_id in(a,b))then raise exception 'enrichment ignored rejection';end if;
 update public.canonical_games set steam_appid=999999997 where id=a;
 if public.game_review_identifiers(a,b)=fingerprint then raise exception 'material identifier change ignored';end if;
 insert into public.game_relationship_reviews(candidate_key,kind,source_game_id,target_game_id,proposed_relation,confidence,reason)values('new evidence','relationship',b,a,'sequel_of',0.8,'changed identifiers');
 if(select count(*)from public.game_relationship_reviews where semantic_key=public.game_review_fact_key('relationship',b,a,'sequel_of'))<>2 then raise exception 'new evidence not eligible';end if;
 if(select status from public.game_relationship_reviews where id=r)<>'rejected'then raise exception 'rejection history lost';end if;
end $$;
do $$ declare gid bigint; duplicate_id bigint; base_id uuid; variant_id uuid; marker text; begin
 insert into public.games(title,slug,igdb_id,release,platform)values('Identity guard test',gen_random_uuid()::text,999999996,'2026-01-01','Steam')returning id into gid;
 select canonical_game_id into base_id from public.game_identity_links where game_id=gid;
 foreach marker in array array['Edition','Definitive Edition','Complete Edition','Gold Edition','Royal Edition','Platinum Edition','Deluxe Edition','Premium Edition','Enhanced Edition','Remastered','Remake','Redux','Director''s Cut','GOTY','Celebration Edition','UNRATED','Demo','Playtest','Beta','Prologue']loop
 insert into public.games(title,slug,igdb_id,release,platform)values('Identity guard test '||marker,gen_random_uuid()::text,999999996,'2026-01-01','Steam')returning id into gid;
 select canonical_game_id into variant_id from public.game_identity_links where game_id=gid;
 if variant_id=base_id then raise exception 'Variant merged: %',marker;end if;
 insert into public.games(title,slug,igdb_id,release,platform)values('Identity guard test '||marker,gen_random_uuid()::text,999999996,'2026-01-01','EPIC')returning id into duplicate_id;
 if(select canonical_game_id from public.game_identity_links where game_id=duplicate_id)<>variant_id then raise exception 'Genuine ownership duplicate isolated: %',marker;end if;
 end loop;
 if exists(select 1 from public.game_relationship_reviews where status='pending'and decision_notes like 'Verified cleanup:%')then raise exception 'Cleanup decisions reopened';end if;
 if has_function_privilege('anon','public.audit_game_relationship_integrity()','EXECUTE')then raise exception 'Private integrity audit exposed';end if;
end $$;
do $$ declare gold_id bigint; deluxe_id bigint; c uuid; baseline bigint; result jsonb; begin
 select public.audit_game_relationship_integrity()into result;
 if(result->'counts'->>'broken_foreign_keys')::bigint<>0 or(result->'counts'->>'duplicate_mappings')::bigint<>0 then raise exception 'Integrity regression';end if;
 baseline:=(result->'counts'->>'suspicious_merge_groups')::bigint;
 insert into public.games(title,slug,igdb_id,release)values('Audit marker test Gold Edition',gen_random_uuid()::text,999999995,'2026-01-01')returning id into gold_id;
 insert into public.games(title,slug,igdb_id,release)values('Audit marker test Deluxe Edition',gen_random_uuid()::text,999999995,'2026-01-01')returning id into deluxe_id;
 select canonical_game_id into c from public.game_identity_links where game_id=gold_id;
 update public.game_identity_links set canonical_game_id=c,version_id=null where game_id=deluxe_id;
 if(public.audit_game_relationship_integrity()->'counts'->>'suspicious_merge_groups')::bigint<=baseline then raise exception 'Different edition titles with shared IDs not audited';end if;
end $$;
rollback;

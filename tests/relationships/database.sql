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
 begin perform public.resolve_game_relationship_review(reviewid,false);raise exception 'second decision allowed';exception when raise_exception then if sqlerrm='second decision allowed' then raise;end if;end;
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
end $$;
rollback;

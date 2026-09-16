-- Canonical-only semantic assertions and rollback-only guard probes.
begin;
do $$declare c uuid;g public.games;before_n bigint;failed boolean:=false;begin
select count(*)into before_n from public.games;
if before_n<>2234 then raise exception 'Wrong library count';end if;
if(select md5(string_agg(to_jsonb(x)::text,''order by id))from public.games x)<>'7895409b9f210c42f80dfc80d85f8c26'then raise exception 'Library checksum changed';end if;
if exists(select 1 from public.canonical_games c join public.game_identity_links l on l.canonical_game_id=c.id where c.metadata->>'historical'='true')then raise exception 'Historical originals misrepresented as owned';end if;
if exists(select 1 from public.game_relationship_reviews where status='pending')then raise exception 'Pending reviews';end if;
select id into c from public.canonical_games where igdb_id=673;
if not public.game_identity_compatible(c,'Doom',673,null,'1993-12-10')then raise exception 'Historical original cannot be reused';end if;
if public.game_identity_compatible(c,'Doom',7351,null,'2016-05-12')then raise exception 'Historical original confused with reboot';end if;
foreach c in array array(select id from public.canonical_games where igdb_id in(3512,912,89354))loop
for g in select x.*from public.games x join public.game_identity_links l on l.game_id=x.id where l.canonical_game_id=c loop
if not public.game_identity_compatible(c,g.title,g.igdb_id,g.steam_appid,g.release)then raise exception 'Verified ownership alias cannot be reused';end if;
if public.game_identity_compatible(c,g.title||' Demo',g.igdb_id,g.steam_appid,g.release)then raise exception 'Alias collapsed demo';end if;
if public.game_identity_compatible(c,g.title,g.igdb_id+1,g.steam_appid,g.release)then raise exception 'Alias ignored conflicting ID';end if;
end loop;end loop;
begin
insert into public.canonical_games(title,normalized_title,igdb_id,steam_appid,release_date)
select title,normalized_title,igdb_id,steam_appid,release_date from public.canonical_games where igdb_id=89354;
exception when raise_exception then failed:=true;end;
if not failed then raise exception 'Duplicate verified canonical accepted';end if;
if has_table_privilege('anon','public.game_semantic_cleanup_archive','SELECT')or has_function_privilege('anon','public.game_identity_compatible(uuid,text,bigint,bigint,date)','EXECUTE')then raise exception 'Private evidence exposed';end if;
if(select count(*)from public.game_relationships e join public.canonical_games s on s.id=e.source_game_id join public.canonical_games t on t.id=e.target_game_id where s.igdb_id=121503 and e.relation_type='sequel_of'and t.igdb_id=673)<>1 then raise exception 'Doom II classic predecessor absent';end if;
if exists(select 1 from public.game_relationships e join public.canonical_games s on s.id=e.source_game_id join public.canonical_games t on t.id=e.target_game_id where(s.igdb_id=121503 and t.igdb_id<>673 and e.relation_type='sequel_of')or(s.igdb_id=222486 and t.igdb_id=222341 and e.relation_type='sequel_of')or(s.igdb_id=222341 and t.igdb_id=484 and e.relation_type='sequel_of'))then raise exception 'Known wrong generation edges remain';end if;
if(select count(*)from public.game_relationships e join public.canonical_games s on s.id=e.source_game_id join public.canonical_games t on t.id=e.target_game_id where s.igdb_id=143030 and t.igdb_id=89354 and e.relation_type='expansion_of')<>1 then raise exception 'Supraland Crash duplicate or missing';end if;
end $$;
rollback;

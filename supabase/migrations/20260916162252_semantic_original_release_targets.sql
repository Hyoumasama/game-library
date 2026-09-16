begin;
select pg_advisory_xact_lock(809162026);
create temporary table semantic_games_baseline on commit drop as
select count(*) n, md5(string_agg(to_jsonb(g)::text,'' order by id)) checksum from public.games g;
do $$begin if not exists(select 1 from semantic_games_baseline where n=2234 and checksum='7895409b9f210c42f80dfc80d85f8c26')then raise exception 'Unexpected ownership baseline; regenerate semantic audit';end if;end $$;
insert into public.game_semantic_cleanup_archive(migration,action,payload)
select '20260916162252','graph_before',jsonb_build_object(
 'canonical_games',(select jsonb_agg(to_jsonb(x))from public.canonical_games x),
 'links',(select jsonb_agg(to_jsonb(x))from public.game_identity_links x),
 'versions',(select jsonb_agg(to_jsonb(x))from public.game_versions x),
 'relationships',(select jsonb_agg(to_jsonb(x))from public.game_relationships x),
 'reviews',(select jsonb_agg(to_jsonb(x))from public.game_relationship_reviews x),
 'series',(select jsonb_agg(to_jsonb(x))from public.canonical_game_series x),
 'franchises',(select jsonb_agg(to_jsonb(x))from public.canonical_game_franchises x),
 'games_count',(select n from semantic_games_baseline),'games_checksum',(select checksum from semantic_games_baseline));

create function pg_temp.canonical(igdb bigint)returns uuid language plpgsql as $$
declare cid uuid;n integer;begin
select count(*),min(id::text)::uuid into n,cid from public.canonical_games where igdb_id=$1;
if n<>1 then raise exception 'Expected one canonical for IGDB %, found %',igdb,n;end if;return cid;end $$;
create function pg_temp.historical(igdb bigint,title text,released date,generation text,url text)returns uuid language plpgsql as $$
declare cid uuid;begin
if exists(select 1 from public.canonical_games c where c.igdb_id=$1)then return pg_temp.canonical(igdb);end if;
insert into public.canonical_games(identity_key,title,normalized_title,igdb_id,release_date,metadata)
values('historical:igdb:'||igdb,title,public.game_identity_title(title),igdb,released,
jsonb_build_object('historical',true,'origin','verified_semantic_cleanup','release_role','original','generation_key',generation,'evidence_url',url))returning id into cid;
insert into public.game_semantic_cleanup_archive(migration,action,payload)values('20260916162252','historical_created',jsonb_build_object('id',cid,'igdb_id',igdb,'title',title,'evidence_url',url));return cid;end $$;
create function pg_temp.remove_edge(src uuid,dst uuid,rel text,reason text)returns void language plpgsql as $$begin
delete from public.game_relationships where source_game_id=src and target_game_id=dst and relation_type=rel;
insert into public.game_relationship_reviews(candidate_key,kind,source_game_id,target_game_id,proposed_relation,confidence,reason,status,decision_notes,resolved_at)
values(gen_random_uuid()::text,'relationship',src,dst,rel,1,reason,'rejected',reason,now())on conflict(candidate_key)do nothing;
update public.game_relationship_reviews set status='rejected',decision_notes=remove_edge.reason,resolved_at=now()
where semantic_key=public.game_review_fact_key('relationship',src,dst,rel)and identifier_fingerprint=public.game_review_identifiers(src,dst);
end $$;
create function pg_temp.add_edge(src uuid,dst uuid,rel text,reason text)returns void language plpgsql as $$begin
insert into public.game_relationships(source_game_id,target_game_id,relation_type,confidence,source,notes)
values(src,dst,rel,1,'verified_semantic_cleanup',reason)on conflict do nothing;
if exists(select 1 from public.canonical_games where id=dst and metadata->>'historical'='true')then
insert into public.canonical_game_series(canonical_game_id,series_id,sort_order)select dst,series_id,null from public.canonical_game_series where canonical_game_id=src on conflict do nothing;
insert into public.canonical_game_franchises(canonical_game_id,franchise_id)select dst,franchise_id from public.canonical_game_franchises where canonical_game_id=src on conflict do nothing;
end if;end $$;

do $$declare original uuid;begin
original:=pg_temp.historical(1105,'Metroid Prime (2002)','2002-11-17','metroid-prime-original','https://www.igdb.com/games/metroid-prime');
perform pg_temp.remove_edge(pg_temp.canonical(236663),pg_temp.canonical(134257),'remaster_of','Nintendo identifies the GameCube original as remaster source, not the 2009 Wii release');
perform pg_temp.add_edge(pg_temp.canonical(236663),original,'remaster_of','Nintendo confirms an HD remaster of the first GameCube Metroid Prime. https://www.nintendo.com/us/whatsnew/metroid-prime-remastered-rolled-out-in-latest-nintendo-direct-available-now-for-nintendo-switch/');
original:=pg_temp.historical(6782,'Ninja Gaiden II (2008)','2008-06-03','ninja-gaiden-2008','https://www.igdb.com/games/ninja-gaiden-ii');
perform pg_temp.remove_edge(pg_temp.canonical(329132),pg_temp.canonical(7385),'remaster_of','Publisher identifies 2008 original; Sigma 2 is a 2009 variant. IGDB metadata disagrees and is durably suppressed');
perform pg_temp.add_edge(pg_temp.canonical(329132),original,'remaster_of','KOEI TECMO launch announcement calls Black a graphical remaster of the game originally debuting in 2008. Sigma 2 remains a separate owned variant and Master Collection component. https://www.koeitecmoamerica.com/news/team-ninjas-iconic-hero-ryu-hayabusa-returns-in-the-stunning-action-game-ninja-gaiden-2-black-now-available/');
end $$;
select public.reconcile_game_relationship_reviews();
do $$begin if not exists(select 1 from semantic_games_baseline where n=(select count(*)from public.games)and checksum=(select md5(string_agg(to_jsonb(g)::text,''order by id))from public.games g))then raise exception 'Ownership content changed';end if;end $$;
notify pgrst,'reload schema';
commit;


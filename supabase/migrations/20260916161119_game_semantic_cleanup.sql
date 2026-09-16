begin;
select pg_advisory_xact_lock(809162026);
create temporary table semantic_games_baseline on commit drop as
select count(*) n, md5(string_agg(to_jsonb(g)::text,'' order by id)) checksum from public.games g;
do $$begin if not exists(select 1 from semantic_games_baseline where n=2234 and checksum='7895409b9f210c42f80dfc80d85f8c26')then raise exception 'Unexpected ownership baseline; regenerate semantic audit';end if;end $$;
-- Private, complete before-images make canonical-only removals inspectable and recoverable.
create table public.game_semantic_cleanup_archive(
 id bigint generated always as identity primary key,
 migration text not null, action text not null, payload jsonb not null,
 created_at timestamptz not null default now()
);
alter table public.game_semantic_cleanup_archive enable row level security;
revoke all on public.game_semantic_cleanup_archive from public,anon,authenticated;
grant all on public.game_semantic_cleanup_archive to service_role;
grant usage,select on sequence public.game_semantic_cleanup_archive_id_seq to service_role;
insert into public.game_semantic_cleanup_archive(migration,action,payload)
select '20260916161119','graph_before',jsonb_build_object(
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
insert into public.game_semantic_cleanup_archive(migration,action,payload)values('20260916161119','historical_created',jsonb_build_object('id',cid,'igdb_id',igdb,'title',title,'evidence_url',url));return cid;end $$;
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

-- Strong-ID exact duplicates only. Every review before-image remains in the private archive.
do $$declare p record;src uuid;dst uuid;r public.game_relationship_reviews;newsrc uuid;newdst uuid;begin
for p in select * from(values(89354::bigint,true),(2955,false),(10760,false),(106534,false),(106836,false),(119308,false),(141533,false),(141540,false),(152203,false),(199116,false),(208652,false),(252851,false))v(igdb,allow_edges)loop
select c.id into src from public.canonical_games c where c.igdb_id=p.igdb and not exists(select 1 from public.game_identity_links l where l.canonical_game_id=c.id);
select c.id into dst from public.canonical_games c where c.igdb_id=p.igdb and exists(select 1 from public.game_identity_links l where l.canonical_game_id=c.id);
if src is null or dst is null or(select count(*)from public.canonical_games where igdb_id=p.igdb)<>2 then raise exception 'Ambiguous duplicate IGDB %',p.igdb;end if;
if not exists(select 1 from public.canonical_games a join public.canonical_games b on a.igdb_id=b.igdb_id and a.steam_appid=b.steam_appid and a.normalized_title=b.normalized_title where a.id=src and b.id=dst and a.igdb_id>0 and a.steam_appid>0)then raise exception 'Non-exact duplicate %',p.igdb;end if;
if not p.allow_edges and(exists(select 1 from public.game_relationships where source_game_id=src or target_game_id=src)or exists(select 1 from public.canonical_game_series where canonical_game_id=src)or exists(select 1 from public.canonical_game_franchises where canonical_game_id=src))then raise exception 'Orphan has dependencies %',p.igdb;end if;
insert into public.game_semantic_cleanup_archive(migration,action,payload)select '20260916161119','canonical_consolidated',jsonb_build_object('removed',to_jsonb(c),'survivor_id',dst)from public.canonical_games c where id=src;
insert into public.canonical_game_series(canonical_game_id,series_id,sort_order)select dst,series_id,sort_order from public.canonical_game_series where canonical_game_id=src on conflict do nothing;
insert into public.canonical_game_franchises(canonical_game_id,franchise_id)select dst,franchise_id from public.canonical_game_franchises where canonical_game_id=src on conflict do nothing;
insert into public.game_relationships(source_game_id,target_game_id,relation_type,confidence,source,notes)
select case when source_game_id=src then dst else source_game_id end,case when target_game_id=src then dst else target_game_id end,relation_type,confidence,source,notes
from public.game_relationships where(source_game_id=src or target_game_id=src)and(case when source_game_id=src then dst else source_game_id end)<>(case when target_game_id=src then dst else target_game_id end)on conflict do nothing;
delete from public.game_relationships where source_game_id=src or target_game_id=src;
-- Rehome non-self review facts with fresh identifier fingerprints; preserve rejection precedence.
for r in select * from public.game_relationship_reviews where source_game_id=src or target_game_id=src loop
newsrc:=case when r.source_game_id=src then dst else r.source_game_id end;newdst:=case when r.target_game_id=src then dst else r.target_game_id end;
if newsrc<>newdst then
insert into public.game_relationship_reviews(candidate_key,kind,source_game_id,target_game_id,proposed_relation,confidence,reason,identifiers,status,decision_notes,resolved_at)
values(gen_random_uuid()::text,r.kind,newsrc,newdst,r.proposed_relation,r.confidence,r.reason,r.identifiers,case when r.status='pending'then 'resolved'else r.status end,r.decision_notes,coalesce(r.resolved_at,now()))on conflict(candidate_key)do nothing;
if r.status='rejected' then update public.game_relationship_reviews set status='rejected',decision_notes=r.decision_notes,resolved_at=now()where semantic_key=public.game_review_fact_key(r.kind,newsrc,newdst,r.proposed_relation)and identifier_fingerprint=public.game_review_identifiers(newsrc,newdst);end if;
end if;end loop;
delete from public.game_relationship_reviews where source_game_id=src or target_game_id=src;
delete from public.canonical_games where id=src;
end loop;end $$;

-- Human-verified ownership aliases allow corrected canonical metadata to coexist with untouched library text/dates.
update public.canonical_games c set metadata=c.metadata||jsonb_build_object('verified_ownership_aliases',(
select jsonb_agg(distinct jsonb_build_object('title',g.title,'igdb_id',g.igdb_id,'steam_appid',g.steam_appid,'release_year',coalesce(extract(year from g.release)::text,'')))
from public.game_identity_links l join public.games g on g.id=l.game_id where l.canonical_game_id=c.id))
where c.igdb_id in(3512,912,89354);
update public.canonical_games set title='Hexen: Beyond Heretic',normalized_title='hexen beyond heretic',metadata=metadata||'{"release_role":"original","generation_key":"hexen-classic","evidence_url":"https://www.igdb.com/games/hexen-beyond-heretic"}'where id=pg_temp.canonical(3512);
update public.canonical_games set release_date='1996-10-24',metadata=metadata||'{"release_role":"original","generation_key":"tomb-raider-classic","evidence_url":"https://www.igdb.com/games/tomb-raider"}'where id=pg_temp.canonical(912);
update public.canonical_games set release_date='2019-04-05',metadata=metadata||'{"release_role":"original","evidence_url":"https://www.igdb.com/games/supraland"}'where id=pg_temp.canonical(89354);
-- These edges already point to the correct IGDB originals; revalidate after fixing their misleading labels/dates.
update public.game_relationships set source='verified_semantic_cleanup',notes='Verified parent Hexen IGDB 3512; library typo Heretic retained only in ownership row'where source_game_id=pg_temp.canonical(8851)and target_game_id=pg_temp.canonical(3512)and relation_type='expansion_of';
update public.game_relationships set source='verified_semantic_cleanup',notes='Anniversary remakes original Tomb Raider 1996 IGDB 912; incorrect canonical 2013 date corrected'where source_game_id=pg_temp.canonical(1162)and target_game_id=pg_temp.canonical(912)and relation_type='remake_of';

do $$declare original uuid; p record;begin
original:=pg_temp.historical(825,'Saints Row (2006)','2006-08-29','saints-row-original','https://www.igdb.com/games/saints-row');
perform pg_temp.remove_edge(pg_temp.canonical(826),pg_temp.canonical(165346),'sequel_of','Saints Row 2 continues 2006 original, not the 2022 reboot');
perform pg_temp.add_edge(pg_temp.canonical(826),original,'sequel_of','Verified release-generation sequel to original Saints Row 2006');
original:=pg_temp.historical(673,'DOOM (1993)','1993-12-10','doom-classic','https://www.igdb.com/games/doom');
perform pg_temp.remove_edge(pg_temp.canonical(121503),pg_temp.canonical(7351),'sequel_of','DOOM 2016 is a reboot, not Doom II predecessor');
perform pg_temp.remove_edge(pg_temp.canonical(121503),pg_temp.canonical(170995),'sequel_of','The 1995 DOOM port is not the original 1993 work');
perform pg_temp.add_edge(pg_temp.canonical(121503),original,'sequel_of','Doom II release represents the classic second installment; predecessor is original DOOM 1993, never a later port or reboot');
original:=pg_temp.historical(1164,'Tomb Raider (2013)','2013-03-05','tomb-raider-survivor','https://www.igdb.com/games/tomb-raider--2');
update public.canonical_games set metadata=metadata||'{"release_role":"reboot","generation_key":"tomb-raider-survivor"}'where id=original;
update public.canonical_games set metadata=metadata||'{"release_role":"edition","generation_key":"tomb-raider-survivor"}'where id=pg_temp.canonical(53818);
perform pg_temp.remove_edge(pg_temp.canonical(53818),pg_temp.canonical(912),'edition_of','2013 GOTY package belongs to the Survivor reboot, not original Tomb Raider 1996');
perform pg_temp.add_edge(pg_temp.canonical(53818),original,'edition_of','2013 Game of the Year package of Tomb Raider reboot; Steam product 203160');
perform pg_temp.remove_edge(pg_temp.canonical(222486),pg_temp.canonical(222341),'sequel_of','Silent Hill 3 predates the 2024 remake; remakes are not new numbered installments');
perform pg_temp.remove_edge(pg_temp.canonical(222341),pg_temp.canonical(484),'sequel_of','Silent Hill 2 remake represents the 2001 installment, not a new sequel to Silent Hill');
perform pg_temp.add_edge(pg_temp.canonical(222341),pg_temp.canonical(481),'remake_of','Silent Hill 2 2024 remakes Silent Hill 2 2001');
update public.canonical_games set metadata=metadata||'{"release_role":"remake","generation_key":"silent-hill-2-remake"}'where id=pg_temp.canonical(222341);
perform pg_temp.remove_edge(pg_temp.canonical(5328),pg_temp.canonical(1985),'standalone_expansion_of','Konami identifies Ground Zeroes as prologue to The Phantom Pain');
perform pg_temp.add_edge(pg_temp.canonical(5328),pg_temp.canonical(1985),'prologue_of','Konami: 1975 prologue versus 1984 main story. https://www.konami.com/mg/mgs5/gz/jp/index.php');
perform pg_temp.remove_edge(pg_temp.canonical(107300),pg_temp.canonical(19474),'standalone_expansion_of','Thronebreaker is an independent narrative RPG using GWENT mechanics, not an expansion');
perform pg_temp.add_edge(pg_temp.canonical(107300),pg_temp.canonical(19474),'spinoff_of','Standalone gameplay spin-off using adapted GWENT card mechanics; shared Witcher IP alone is not evidence. https://www.thewitcher.com/en/thronebreaker-witchertales');
perform pg_temp.remove_edge(pg_temp.canonical(134581),pg_temp.canonical(19565),'standalone_expansion_of','Miles Morales is a standalone continuation of the 2018 story, not DLC or expansion');
perform pg_temp.add_edge(pg_temp.canonical(134581),pg_temp.canonical(19565),'sequel_of','Convention: sequel_of includes standalone direct narrative continuations, not only numbered full-length titles. PlayStation describes Miles next adventure after 2018. https://www.playstation.com/en-us/games/marvels-spider-man-miles-morales/');
perform pg_temp.add_edge(pg_temp.canonical(143030),pg_temp.canonical(89354),'expansion_of','Supraland Crash expansion of the single verified Supraland canonical IGDB 89354 / Steam 813630');
-- Additional high-confidence generation mistakes found in the full edge review.
original:=pg_temp.historical(880,'Resident Evil 2 (1998)','1998-01-21','resident-evil-original','https://www.igdb.com/games/resident-evil-2');
perform pg_temp.remove_edge(pg_temp.canonical(19686),pg_temp.canonical(8254),'sequel_of','2019 Resident Evil 2 is a remake of the 1998 installment, not a newly numbered sequel to the 2014 HD remaster');
perform pg_temp.add_edge(pg_temp.canonical(19686),original,'remake_of','2019 remake of Resident Evil 2 1998; original generation retained separately');
perform pg_temp.remove_edge(pg_temp.canonical(158981),pg_temp.canonical(158980),'sequel_of','Pixel Remasters are rereleases of distinct original anthology installments, not newly numbered sequels');
perform pg_temp.remove_edge(pg_temp.canonical(158982),pg_temp.canonical(158981),'sequel_of','Pixel Remasters are rereleases of distinct original anthology installments, not newly numbered sequels');
for p in select * from(values(158980::bigint,385::bigint,'Final Fantasy (1987)','1987-12-18'::date,'https://www.igdb.com/games/final-fantasy'),(158981,16474,'Final Fantasy II (1988)','1988-12-17'::date,'https://www.igdb.com/games/final-fantasy-ii--1'),(158982,77234,'Final Fantasy III (1990)','1990-04-27'::date,'https://www.igdb.com/games/final-fantasy-iii--1'))v(child,parent,title,released,url)loop
original:=pg_temp.historical(p.parent,p.title,p.released,'final-fantasy-original',p.url);
update public.canonical_games set metadata=metadata||'{"release_role":"remaster","generation_key":"final-fantasy-pixel-remaster"}'where id=pg_temp.canonical(p.child);
perform pg_temp.add_edge(pg_temp.canonical(p.child),original,'remaster_of','Square Enix Pixel Remaster of the Japanese original; Western renumbered FFII/FFIII and later 3D remakes are separate. https://finalfantasypixelremaster.square-enix-games.com/en_US/');
end loop;
end $$;

-- Preserve legitimate crossover/hierarchy memberships; record appearance roles without deleting IP links.
alter table public.canonical_game_franchises add column membership_role text not null default 'unspecified'
check(membership_role in('unspecified','primary','appearance','hierarchy','crossover'));
update public.canonical_game_franchises m set membership_role=case when f.name='Nickelodeon'then 'primary'else 'appearance'end
from public.canonical_games c,public.game_franchises f where m.canonical_game_id=c.id and m.franchise_id=f.id and c.normalized_title='nickelodeon all star brawl';
update public.canonical_game_franchises m set membership_role='crossover'from public.canonical_games c where m.canonical_game_id=c.id and c.normalized_title='multiversus';
update public.canonical_game_franchises m set membership_role='appearance'from public.canonical_games c where m.canonical_game_id=c.id and c.normalized_title='capcom arcade stadium';
update public.canonical_games set metadata=metadata||'{"excluded_series_names":["Marvel''s Spider-Man"],"series_correction_reason":"Standalone Wolverine title; shared Insomniac studio does not establish Spider-Man series membership"}'where normalized_title='marvel s wolverine';
delete from public.canonical_game_series m using public.canonical_games c,public.game_series s where m.canonical_game_id=c.id and m.series_id=s.id and c.normalized_title='marvel s wolverine'and s.name='Marvel''s Spider-Man';

create function public.game_identity_compatible(cid uuid,title text,igdb bigint,steam bigint,released date)returns boolean language sql stable security invoker set search_path=''as $$
select exists(select 1 from public.canonical_games c where c.id=cid and(
(c.normalized_title=public.game_identity_title(title)and public.game_identity_markers(c.title)=public.game_identity_markers(title)and extract(year from c.release_date)is not distinct from extract(year from released)
and((igdb>0 and c.igdb_id=igdb)or(coalesce(igdb,0)<=0 and steam>0 and c.steam_appid=steam and coalesce(c.igdb_id,0)<=0)))
or(igdb>0 and c.igdb_id=igdb and exists(select 1 from jsonb_array_elements(coalesce(c.metadata->'verified_ownership_aliases','[]'))a
where public.game_identity_title(a->>'title')=public.game_identity_title(title)and(a->>'igdb_id')::bigint=igdb and(a->>'steam_appid')::bigint is not distinct from steam and coalesce(a->>'release_year','')=coalesce(extract(year from released)::text,'')))));
$$;
revoke all on function public.game_identity_compatible(uuid,text,bigint,bigint,date)from public,anon,authenticated;
grant execute on function public.game_identity_compatible(uuid,text,bigint,bigint,date)to service_role;
create function public.prevent_duplicate_verified_canonical()returns trigger language plpgsql security invoker set search_path=''as $$begin
perform pg_advisory_xact_lock(809162026);
if exists(select 1 from public.canonical_games c where c.id<>new.id and public.game_identity_compatible(c.id,new.title,new.igdb_id,new.steam_appid,new.release_date))then
raise exception 'Compatible canonical already exists; regenerate plan and reuse identity';end if;return new;end $$;
revoke all on function public.prevent_duplicate_verified_canonical()from public,anon,authenticated;
grant execute on function public.prevent_duplicate_verified_canonical()to service_role;
create trigger prevent_duplicate_verified_canonical before insert on public.canonical_games for each row execute function public.prevent_duplicate_verified_canonical();
create or replace function public.link_new_library_game_identity()returns trigger language plpgsql security invoker set search_path=''as $$
declare cid uuid;matches integer;version uuid;match_kind text:='import';begin
perform pg_advisory_xact_lock(809162026);
select count(*),min(c.id::text)::uuid into matches,cid from public.canonical_games c where public.game_identity_compatible(c.id,new.title,new.igdb_id,new.steam_appid,new.release);
if matches<>1 then insert into public.canonical_games(identity_key,title,normalized_title,igdb_id,steam_appid,release_date,metadata)values('new-library:'||new.id,left(coalesce(nullif(trim(new.title),''),'Untitled '||new.id),300),public.game_identity_title(new.title),new.igdb_id,new.steam_appid,new.release,jsonb_build_object('origin','library_insert'))returning id into cid;
else match_kind:=case when new.igdb_id>0 then 'igdb_exact'else 'steam_exact'end;end if;
select id into version from public.game_versions where canonical_game_id=cid;
insert into public.game_identity_links(game_id,canonical_game_id,version_id,match_type,confidence)values(new.id,cid,version,match_kind,1);return new;end $$;
-- Enforce curated series exclusions for every importer, including old clients.
create function public.enforce_game_series_exclusions()returns trigger language plpgsql security invoker set search_path=''as $$begin
if exists(select 1 from public.canonical_games c,public.game_series s where c.id=new.canonical_game_id and s.id=new.series_id and coalesce(c.metadata->'excluded_series_names','[]')?s.name)then return null;end if;return new;end $$;
revoke all on function public.enforce_game_series_exclusions()from public,anon,authenticated;
grant execute on function public.enforce_game_series_exclusions()to service_role;
create trigger enforce_game_series_exclusions before insert or update on public.canonical_game_series for each row execute function public.enforce_game_series_exclusions();
select public.reconcile_game_relationship_reviews();
do $$begin
if not exists(select 1 from semantic_games_baseline where n=(select count(*)from public.games)and checksum=(select md5(string_agg(to_jsonb(g)::text,''order by id))from public.games g))then raise exception 'Ownership content changed; abort';end if;
if exists(select 1 from public.game_relationship_reviews where status='pending')then raise exception 'Pending reviews remain';end if;
if exists(select 1 from public.games g left join public.game_identity_links l on l.game_id=g.id where l.game_id is null)then raise exception 'Missing ownership identities';end if;
end $$;
notify pgrst,'reload schema';
commit;

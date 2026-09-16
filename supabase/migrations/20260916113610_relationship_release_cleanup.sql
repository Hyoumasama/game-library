begin;
select pg_advisory_xact_lock(809162026);
create temporary table cleanup_ownership_baseline on commit drop as select count(*)n,md5(string_agg(to_jsonb(g)::text,''order by id))checksum from public.games g;
-- Title + external identifier + release year is required; IDs alone never prove a release identity.
create function public.game_identity_title(title text)returns text language sql immutable set search_path='' as $$
 select trim(regexp_replace(lower(normalize(coalesce(title,''),NFKC)),'[^[:alnum:]]+',' ','g'));
$$;
create function public.game_identity_markers(title text)returns text language sql immutable set search_path='' as $$
 select coalesce(string_agg(distinct m[1],','order by m[1]),'') from regexp_matches(public.game_identity_title(title),'\m(edition|remastered|remaster|remake|redux|directors|director|goty|unrated|demo|playtest|beta|prologue)\M','g')m;
$$;
revoke all on function public.game_identity_title(text),public.game_identity_markers(text)from public,anon,authenticated;
grant execute on function public.game_identity_title(text),public.game_identity_markers(text)to service_role;
-- Reuse previously retained releases; no canonical or ownership records are removed.
do $$ declare p record; release_title text; c uuid; base_id uuid; variant_id uuid; sample_game public.games; matches integer; begin
 for p in select * from(values
('ENSLAVED: Odyssey to the West','Enslaved: Odyssey to the West Premium Edition','edition_of'),
('Sundered','Sundered: Eldritch Edition','enhanced_edition_of'),
('Star Wars Battlefront II','Star Wars Battlefront II: Celebration Edition','edition_of'),
('Dishonored','Dishonored: Definitive Edition','edition_of'),
('The Talos Principle','The Talos Principle: Gold Edition','edition_of'),
('Agony','Agony UNRATED','enhanced_edition_of'),
('Dark Deity','Dark Deity: Complete Edition','edition_of'),
('Kingdom Come: Deliverance','Kingdom Come: Deliverance Royal Edition','edition_of'),
('Middle-earth: Shadow of War','Middle-earth: Shadow of War - Definitive Edition','edition_of'),
('Ori and the Blind Forest','Ori and the Blind Forest: Definitive Edition','enhanced_edition_of'),
('Sid Meier''s Civilization VI','Sid Meier''s Civilization VI: Platinum Edition','edition_of'),
('Styx: Shards of Darkness','Styx: Shards of Darkness - Deluxe Edition','edition_of')
 )v(base,variant,rel)loop
 if not exists(select 1 from public.games where public.game_identity_title(games.title)=public.game_identity_title(p.base))or not exists(select 1 from public.games where public.game_identity_title(games.title)=public.game_identity_title(p.variant))then continue;end if;
 foreach release_title in array array[p.base,p.variant]loop
 select * into sample_game from public.games where public.game_identity_title(games.title)=public.game_identity_title(release_title)order by id limit 1;
 select count(*),min(id::text)::uuid into matches,c from public.canonical_games where normalized_title=public.game_identity_title(release_title) and (igdb_id is not distinct from sample_game.igdb_id);
 if matches>1 then raise exception 'Ambiguous cleanup canonical: %',release_title;end if;
 if matches=0 then insert into public.canonical_games(identity_key,title,normalized_title,igdb_id,steam_appid,release_date,metadata)values('verified-cleanup:'||public.game_identity_title(release_title),release_title,public.game_identity_title(release_title),sample_game.igdb_id,sample_game.steam_appid,sample_game.release,jsonb_build_object('origin','owner_verified_release_cleanup'))returning id into c;end if;
 -- Inherit taxonomies additively before changing mappings, preserving every previous membership.
 insert into public.canonical_game_series(canonical_game_id,series_id,sort_order)select distinct c,m.series_id,m.sort_order from public.canonical_game_series m join public.game_identity_links l on l.canonical_game_id=m.canonical_game_id join public.games g on g.id=l.game_id where public.game_identity_title(g.title)=public.game_identity_title(release_title) and g.igdb_id is not distinct from sample_game.igdb_id and extract(year from g.release)is not distinct from extract(year from sample_game.release)on conflict do nothing;
 insert into public.canonical_game_franchises(canonical_game_id,franchise_id)select distinct c,m.franchise_id from public.canonical_game_franchises m join public.game_identity_links l on l.canonical_game_id=m.canonical_game_id join public.games g on g.id=l.game_id where public.game_identity_title(g.title)=public.game_identity_title(release_title) and g.igdb_id is not distinct from sample_game.igdb_id and extract(year from g.release)is not distinct from extract(year from sample_game.release)on conflict do nothing;
 if release_title=p.variant then
 insert into public.game_versions(canonical_game_id,name,version_type,metadata)values(c,p.variant,replace(p.rel,'_of',''),jsonb_build_object('origin','owner_verified_release_cleanup'))on conflict(canonical_game_id)do update set version_type=excluded.version_type,name=excluded.name;
 variant_id:=c;else base_id:=c;end if;
 update public.game_identity_links l set canonical_game_id=c,version_id=(select id from public.game_versions where canonical_game_id=c),match_type='manual',confidence=1 from public.games g where g.id=l.game_id and public.game_identity_title(g.title)=public.game_identity_title(release_title) and g.igdb_id is not distinct from sample_game.igdb_id and extract(year from g.release)is not distinct from extract(year from sample_game.release)and l.canonical_game_id<>c;
 end loop;
 -- Retain corrected review history and suppress the discarded generic classification on reruns.
 update public.game_relationship_reviews set status='rejected',decision_notes='Superseded by owner-verified specific release relationship',resolved_at=now()where kind='relationship'and source_game_id=variant_id and target_game_id=base_id and proposed_relation<>p.rel;
 delete from public.game_relationships where source_game_id=variant_id and target_game_id=base_id and relation_type in('edition_of','enhanced_edition_of','remaster_of','remake_of')and relation_type<>p.rel;
 insert into public.game_relationships(source_game_id,target_game_id,relation_type,confidence,source,notes)values(variant_id,base_id,p.rel,1,'owner_verified_cleanup','Distinct historical release/package identity; owner-requested canonical separation')on conflict do nothing;
 -- Seed durable suppression, including facts which had no previous review.
 insert into public.game_relationship_reviews(candidate_key,kind,source_game_id,target_game_id,proposed_relation,confidence,reason,status,decision_notes,resolved_at)
 select gen_random_uuid()::text,'relationship',variant_id,base_id,t,1,'Generic relationship superseded by verified specific release','rejected','Owner-verified cleanup; retain the specific relationship',now()from unnest(array['edition_of','enhanced_edition_of','remaster_of','remake_of'])t where t<>p.rel on conflict(candidate_key)do nothing;
 end loop;
end $$;
-- Correct dated demo mapping using exact title, identifier and year, without changing either demo edge.
update public.game_identity_links l set canonical_game_id=c.id,version_id=null,match_type='manual',confidence=1 from public.games g,public.canonical_games c where l.game_id=g.id and public.game_identity_title(g.title)='stellar blade demo'and c.normalized_title='stellar blade demo'and c.igdb_id=g.igdb_id and extract(year from c.release_date)=extract(year from g.release)and l.canonical_game_id<>c.id and(select count(*)from public.canonical_games x where x.normalized_title=c.normalized_title and x.igdb_id=c.igdb_id and extract(year from x.release_date)=extract(year from c.release_date))=1;
do $$ declare p record; src uuid; dst uuid; begin
 for p in select * from(values
('Half-Life 2: Episode One','Half-Life 2','episode_of'),
('Half-Life 2: Episode Two','Half-Life 2','episode_of'),
('Hard Reset Redux','Hard Reset','remaster_of'),
('Little Nightmares Enhanced Edition','Little Nightmares','enhanced_edition_of'),
('Mafia: Definitive Edition','Mafia','remake_of'),
('Mafia II: Definitive Edition','Mafia II','remaster_of'),
('Metro Last Light Redux','Metro: Last Light','remaster_of'),
('The Outer Worlds: Spacer''s Choice Edition','The Outer Worlds','remaster_of')
 )v(src,dst,keep)loop
 if not exists(select 1 from public.canonical_games where normalized_title=public.game_identity_title(p.src))or not exists(select 1 from public.canonical_games where normalized_title=public.game_identity_title(p.dst))then continue;end if;
 if(select count(*)from public.canonical_games where normalized_title=public.game_identity_title(p.src))<>1 or(select count(*)from public.canonical_games where normalized_title=public.game_identity_title(p.dst))<>1 then raise exception 'Ambiguous correction: % -> %',p.src,p.dst;end if;
 select id into src from public.canonical_games where normalized_title=public.game_identity_title(p.src);select id into dst from public.canonical_games where normalized_title=public.game_identity_title(p.dst);
 -- Convert the removed facts to rejected review evidence before removing only redundant classifications.
 insert into public.game_relationship_reviews(candidate_key,kind,source_game_id,target_game_id,proposed_relation,confidence,reason,status,decision_notes,resolved_at)
 select gen_random_uuid()::text,'relationship',src,dst,relation_type,1,'Redundant classification removed by verified cleanup','rejected','Keep '||p.keep,now()from public.game_relationships where source_game_id=src and target_game_id=dst and relation_type<>p.keep
 on conflict(candidate_key)do update set status='rejected',resolved_at=now(),decision_notes=excluded.decision_notes;
 delete from public.game_relationships where source_game_id=src and target_game_id=dst and relation_type<>p.keep;
 update public.game_relationship_reviews set status='rejected',decision_notes='Verified cleanup: keep '||p.keep,resolved_at=now()where kind='relationship'and source_game_id=src and target_game_id=dst and proposed_relation<>p.keep;
 insert into public.game_relationships(source_game_id,target_game_id,relation_type,confidence,source,notes)values(src,dst,p.keep,1,'owner_verified_cleanup','Owner requested most-specific classification; see cleanup evidence report')on conflict do nothing;
 end loop;
end $$;
create or replace function public.link_new_library_game_identity()returns trigger language plpgsql security invoker set search_path=''as $$
 declare cid uuid; matches integer; normalized text:=public.game_identity_title(new.title); match_kind text:='import'; version uuid; begin
 perform pg_advisory_xact_lock(809162026);
 select count(*),min(c.id::text)::uuid into matches,cid from public.canonical_games c where c.normalized_title=normalized and public.game_identity_markers(c.title)=public.game_identity_markers(new.title)and extract(year from c.release_date)is not distinct from extract(year from new.release)
 and((new.igdb_id>0 and c.igdb_id=new.igdb_id)or(coalesce(new.igdb_id,0)<=0 and new.steam_appid>0 and c.steam_appid=new.steam_appid and coalesce(c.igdb_id,0)<=0));
 if matches<>1 then insert into public.canonical_games(identity_key,title,normalized_title,igdb_id,steam_appid,release_date,metadata)values('new-library:'||new.id,left(coalesce(nullif(trim(new.title),''),'Untitled '||new.id),300),normalized,new.igdb_id,new.steam_appid,new.release,jsonb_build_object('origin','library_insert'))returning id into cid;
 else match_kind:=case when new.igdb_id>0 then 'igdb_exact'else 'steam_exact'end;end if;
 select id into version from public.game_versions where canonical_game_id=cid;
 insert into public.game_identity_links(game_id,canonical_game_id,version_id,match_type,confidence)values(new.id,cid,version,match_kind,1);return new;
end $$;
select public.reconcile_game_relationship_reviews();
do $$begin if not exists(select 1 from cleanup_ownership_baseline where n=(select count(*)from public.games)and checksum=(select md5(string_agg(to_jsonb(g)::text,''order by id))from public.games g))then raise exception 'Ownership data changed; abort cleanup';end if;end $$;
NOTIFY pgrst,'reload schema';
commit;

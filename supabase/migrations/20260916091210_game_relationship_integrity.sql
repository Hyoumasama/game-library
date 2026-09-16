begin;
alter table public.game_versions add constraint game_versions_identity_unique unique(id,canonical_game_id);
alter table public.game_identity_links add constraint game_identity_links_version_identity_fk foreign key(version_id,canonical_game_id) references public.game_versions(id,canonical_game_id) on delete restrict;
alter table public.game_relationship_reviews add constraint game_review_relation_check check (
 (kind='identity' and proposed_relation is null) or
 (kind='relationship' and proposed_relation in ('sequel_of','prequel_of','spinoff_of','dlc_of','expansion_of','standalone_expansion_of','remake_of','remaster_of','edition_of','enhanced_edition_of','collection_contains','episode_of','reboot_of','successor_to','related_to'))
);
-- Future ownership inserts receive a safe identity atomically; ambiguous identifiers stay separate.
create function public.link_new_library_game_identity() returns trigger language plpgsql security invoker set search_path='' as $$
declare cid uuid; matches integer; normalized text; match_kind text:='import'; version uuid; begin
 perform pg_advisory_xact_lock(809162026);
 normalized:=trim(regexp_replace(lower(normalize(coalesce(new.title,''),NFKC)),'[^[:alnum:]]+',' ','g'));
 if new.igdb_id>0 then
 select count(*),min(id::text)::uuid into matches,cid from public.canonical_games where igdb_id=new.igdb_id;
 match_kind:='igdb_exact';
 elsif new.steam_appid>0 then
 select count(*),min(id::text)::uuid into matches,cid from public.canonical_games where steam_appid=new.steam_appid;
 match_kind:='steam_exact';
 end if;
 if coalesce(matches,0)<>1 or not exists(select 1 from public.canonical_games where id=cid and normalized_title=normalized and extract(year from release_date) is not distinct from extract(year from new.release)) then
 insert into public.canonical_games(identity_key,title,normalized_title,igdb_id,steam_appid,release_date,metadata)
 values('new-library:'||new.id,left(coalesce(nullif(trim(new.title),''),'Untitled '||new.id),300),normalized,new.igdb_id,new.steam_appid,new.release,jsonb_build_object('origin','library_insert')) returning id into cid;
 end if;
 select id into version from public.game_versions where canonical_game_id=cid;
 insert into public.game_identity_links(game_id,canonical_game_id,version_id,match_type,confidence) values(new.id,cid,version,match_kind,1);
 return new;
end $$;
revoke all on function public.link_new_library_game_identity(),public.relationship_updated_at() from public,anon,authenticated;
create trigger link_new_library_game_identity after insert on public.games for each row execute function public.link_new_library_game_identity();
commit;

begin;
-- Positional arguments prevent SQL column names from shadowing the title parameter.
create or replace function public.game_identity_compatible(cid uuid,title text,igdb bigint,steam bigint,released date)returns boolean language sql stable security invoker set search_path=''as $$
select exists(select 1 from public.canonical_games c where c.id=cid and(
(c.normalized_title=public.game_identity_title($2)and public.game_identity_markers(c.title)=public.game_identity_markers($2)and extract(year from c.release_date)is not distinct from extract(year from released)
and((igdb>0 and c.igdb_id=igdb)or(coalesce(igdb,0)<=0 and steam>0 and c.steam_appid=steam and coalesce(c.igdb_id,0)<=0)))
or(igdb>0 and c.igdb_id=igdb and exists(select 1 from jsonb_array_elements(coalesce(c.metadata->'verified_ownership_aliases','[]'))a
where public.game_identity_title(a->>'title')=public.game_identity_title($2)and(a->>'igdb_id')::bigint=igdb and(a->>'steam_appid')::bigint is not distinct from steam and coalesce(a->>'release_year','')=coalesce(extract(year from released)::text,'')))));
$$;
commit;

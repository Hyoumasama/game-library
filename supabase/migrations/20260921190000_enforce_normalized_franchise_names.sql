-- Franchise names are unique after trimming, collapsing whitespace and folding case.
-- Existing production data was checked for conflicts before this migration was added.
CREATE UNIQUE INDEX IF NOT EXISTS game_franchises_normalized_name_uidx
ON public.game_franchises (
  lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))
);

CREATE OR REPLACE FUNCTION public.sync_admin_game_metadata(
  p_game_id bigint,
  p_franchise jsonb DEFAULT NULL,
  p_relationships jsonb DEFAULT '[]'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_game public.games%ROWTYPE;
  v_canonical_id uuid;
  v_franchise_id uuid;
  v_name text;
  v_item jsonb;
  v_edge_id uuid;
  v_related_id uuid;
  v_type text;
  v_slug text;
BEGIN
  SELECT * INTO STRICT v_game FROM public.games WHERE id = p_game_id FOR UPDATE;
  SELECT canonical_game_id INTO v_canonical_id FROM public.game_identity_links WHERE game_id = p_game_id;

  IF v_canonical_id IS NULL THEN
    SELECT l.canonical_game_id INTO v_canonical_id
    FROM public.games g JOIN public.game_identity_links l ON l.game_id = g.id
    WHERE g.id <> p_game_id AND (
      (v_game.igdb_id IS NOT NULL AND g.igdb_id = v_game.igdb_id) OR
      (v_game.steam_appid IS NOT NULL AND g.steam_appid = v_game.steam_appid) OR
      (lower(regexp_replace(btrim(g.title), '\s+', ' ', 'g')) = lower(regexp_replace(btrim(v_game.title), '\s+', ' ', 'g'))
       AND g.release IS NOT DISTINCT FROM v_game.release)
    )
    ORDER BY (v_game.igdb_id IS NOT NULL AND g.igdb_id = v_game.igdb_id) DESC,
             (v_game.steam_appid IS NOT NULL AND g.steam_appid = v_game.steam_appid) DESC, g.id
    LIMIT 1;

    IF v_canonical_id IS NULL THEN
      INSERT INTO public.canonical_games (identity_key,title,normalized_title,release_date,igdb_id,steam_appid,metadata)
      VALUES ('library:' || p_game_id || ':' || gen_random_uuid(), v_game.title,
        lower(regexp_replace(btrim(v_game.title), '\s+', ' ', 'g')), v_game.release,
        v_game.igdb_id, v_game.steam_appid, '{"created_by":"admin_game_form"}'::jsonb)
      RETURNING id INTO v_canonical_id;
    END IF;

    INSERT INTO public.game_identity_links (game_id,canonical_game_id,match_type,confidence)
    VALUES (p_game_id,v_canonical_id,CASE WHEN v_game.igdb_id IS NOT NULL THEN 'exact_title_igdb' ELSE 'manual' END,1);
  END IF;

  IF p_franchise IS NOT NULL THEN
    v_name := regexp_replace(btrim(p_franchise->>'name'), '\s+', ' ', 'g');
    IF v_name = '' THEN RAISE EXCEPTION 'Franchise name is required'; END IF;
    IF nullif(p_franchise->>'id','') IS NOT NULL THEN
      SELECT id INTO STRICT v_franchise_id FROM public.game_franchises WHERE id=(p_franchise->>'id')::uuid;
    ELSE
      SELECT id INTO v_franchise_id FROM public.game_franchises
      WHERE lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))=lower(v_name) LIMIT 1;
      IF v_franchise_id IS NULL THEN
        v_slug := trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'));
        INSERT INTO public.game_franchises(name,slug)
        VALUES(v_name,coalesce(nullif(v_slug,''),'franchise') || '-' || substr(gen_random_uuid()::text,1,8))
        RETURNING id INTO v_franchise_id;
      END IF;
    END IF;
  END IF;

  DELETE FROM public.canonical_game_franchises
  WHERE canonical_game_id=v_canonical_id AND (v_franchise_id IS NULL OR franchise_id<>v_franchise_id);
  IF v_franchise_id IS NOT NULL THEN
    INSERT INTO public.canonical_game_franchises(canonical_game_id,franchise_id,membership_role)
    VALUES(v_canonical_id,v_franchise_id,'unspecified')
    ON CONFLICT(canonical_game_id,franchise_id) DO UPDATE SET membership_role=excluded.membership_role;
  END IF;

  IF jsonb_typeof(coalesce(p_relationships,'[]')) <> 'array' THEN RAISE EXCEPTION 'Relationships must be an array'; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(coalesce(p_relationships,'[]')) item
    WHERE nullif(item->>'id','') IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.game_relationships_bidirectional v
      WHERE v.game_id=v_canonical_id AND v.relationship_id=(item->>'id')::uuid
    )
  ) THEN RAISE EXCEPTION 'A relationship does not belong to this game'; END IF;

  DELETE FROM public.game_relationships r
  WHERE r.id IN (SELECT relationship_id FROM public.game_relationships_bidirectional WHERE game_id=v_canonical_id)
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(coalesce(p_relationships,'[]')) item
      WHERE nullif(item->>'id','')::uuid=r.id
    );

  FOR v_item IN SELECT value FROM jsonb_array_elements(coalesce(p_relationships,'[]')) LOOP
    v_edge_id := nullif(v_item->>'id','')::uuid;
    IF v_edge_id IS NOT NULL THEN CONTINUE; END IF;
    v_related_id := nullif(v_item->>'relatedGameId','')::uuid;
    v_type := nullif(v_item->>'relationType','');
    IF v_related_id IS NULL OR v_type IS NULL THEN RAISE EXCEPTION 'Every relationship needs a type and a related game'; END IF;
    IF v_related_id=v_canonical_id THEN RAISE EXCEPTION 'A game cannot relate to itself'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.game_relationship_types WHERE code=v_type AND is_selectable) THEN
      RAISE EXCEPTION 'Unsupported relationship type: %',v_type;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM public.game_identity_links WHERE canonical_game_id=v_related_id) THEN
      RAISE EXCEPTION 'Relationship target must be an owned canonical game';
    END IF;
    INSERT INTO public.game_relationships(source_game_id,target_game_id,relation_type,confidence,source,origin_type,is_locked)
    VALUES(v_canonical_id,v_related_id,v_type,1,'admin_game_form','manual',true);
  END LOOP;
  RETURN v_canonical_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_admin_game_metadata(bigint,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_admin_game_metadata(bigint,jsonb,jsonb) TO service_role;

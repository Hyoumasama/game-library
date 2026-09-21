-- Correct the already-deployed metadata RPC so omitted arguments preserve existing links.
-- This migration only replaces function code; it does not modify existing rows.
CREATE OR REPLACE FUNCTION public.sync_admin_game_metadata(
  p_game_id bigint,
  p_franchise jsonb DEFAULT NULL,
  p_relationships jsonb DEFAULT NULL
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
  v_normalized_title text;
  v_release_variant_kind text;
  v_existing record;
BEGIN
  SELECT * INTO STRICT v_game FROM public.games WHERE id = p_game_id FOR UPDATE;
  v_normalized_title := lower(regexp_replace(btrim(v_game.title), '\s+', ' ', 'g'));
  -- Use the release-variant vocabulary already stored in canonical_games.metadata.
  -- The order is significant: more specific variants must win over generic ones.
  v_release_variant_kind := CASE
    WHEN v_normalized_title ~ '(^|[^a-z])(playtest)([^a-z]|$)' THEN 'playtest'
    WHEN v_normalized_title ~ '(^|[^a-z])(beta)([^a-z]|$)' THEN 'playtest'
    WHEN v_normalized_title ~ '(^|[^a-z])(demo)([^a-z]|$)' THEN 'demo'
    WHEN v_normalized_title ~ 'standalone expansion' THEN 'standalone_expansion'
    WHEN v_normalized_title ~ '(^|[^a-z])(dlc)([^a-z]|$)' THEN 'dlc'
    WHEN v_normalized_title ~ '(^|[^a-z])(expansion)([^a-z]|$)' THEN 'expansion'
    WHEN v_normalized_title ~ '(^|[^a-z])(mod)([^a-z]|$)' THEN 'mod'
    WHEN v_normalized_title ~ '(^|[^a-z])(remake|remade)([^a-z]|$)' THEN 'remake'
    WHEN v_normalized_title ~ 'remaster(ed)?' THEN 'remaster'
    WHEN v_normalized_title ~ '(^|[^a-z])(hd)([^a-z]|$)' THEN 'hd_release'
    WHEN v_normalized_title ~ '(enhanced|definitive) edition|director''?s cut|(^|[^a-z])unrated([^a-z]|$)' THEN 'enhanced_edition'
    WHEN v_normalized_title ~ '(ultimate|complete|special|gold|deluxe|collector''?s|game of the year) edition|\mgoty\M' THEN 'edition'
    WHEN v_normalized_title ~ '(^|[^a-z])(collection|anthology)([^a-z]|$)' THEN 'collection'
    WHEN v_normalized_title ~ '(^|[^a-z])(episode|chapter)[[:space:]]*([0-9]+|[ivxlcdm]+)([^a-z]|$)' THEN 'episode'
    ELSE 'standard'
  END;
  SELECT canonical_game_id INTO v_canonical_id
  FROM public.game_identity_links WHERE game_id = p_game_id;

  IF v_canonical_id IS NULL THEN
    SELECT l.canonical_game_id INTO v_canonical_id
    FROM public.games g
    JOIN public.game_identity_links l ON l.game_id = g.id
    JOIN public.canonical_games c ON c.id = l.canonical_game_id
    WHERE g.id <> p_game_id
      AND c.normalized_title = v_normalized_title
      AND c.release_date IS NOT DISTINCT FROM v_game.release
      AND (v_game.igdb_id IS NULL OR c.igdb_id IS NULL OR c.igdb_id = v_game.igdb_id)
      AND (v_game.steam_appid IS NULL OR c.steam_appid IS NULL OR c.steam_appid = v_game.steam_appid)
      AND NOT EXISTS (
        SELECT 1
        FROM public.game_identity_links conflict_link
        JOIN public.games conflict_game ON conflict_game.id = conflict_link.game_id
        WHERE conflict_link.canonical_game_id = c.id
          AND v_game.igdb_id IS NOT NULL
          AND conflict_game.igdb_id IS NOT NULL
          AND conflict_game.igdb_id <> v_game.igdb_id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.game_identity_links conflict_link
        JOIN public.games conflict_game ON conflict_game.id = conflict_link.game_id
        WHERE conflict_link.canonical_game_id = c.id
          AND v_game.steam_appid IS NOT NULL
          AND conflict_game.steam_appid IS NOT NULL
          AND conflict_game.steam_appid <> v_game.steam_appid
      )
    ORDER BY
      (v_game.igdb_id IS NOT NULL AND g.igdb_id = v_game.igdb_id) DESC,
      (v_game.steam_appid IS NOT NULL AND g.steam_appid = v_game.steam_appid) DESC,
      g.id
    LIMIT 1;

    IF v_canonical_id IS NULL THEN
      INSERT INTO public.canonical_games (
        identity_key, title, normalized_title, release_date,
        igdb_id, steam_appid, metadata
      ) VALUES (
        'library:' || p_game_id || ':' || gen_random_uuid(),
        v_game.title,
        v_normalized_title,
        v_game.release,
        v_game.igdb_id,
        v_game.steam_appid,
        jsonb_build_object(
          'created_by', 'admin_game_form',
          'release_variant_kind', v_release_variant_kind,
          'identity_merge_prohibited', v_release_variant_kind <> 'standard'
        )
      ) RETURNING id INTO v_canonical_id;
    END IF;

    INSERT INTO public.game_identity_links (
      game_id, canonical_game_id, match_type, confidence
    ) VALUES (
      p_game_id,
      v_canonical_id,
      CASE WHEN v_game.igdb_id IS NOT NULL THEN 'exact_title_igdb' ELSE 'manual' END,
      1
    );
  END IF;

  -- NULL means no franchise update. Only an explicit object enters this block.
  IF p_franchise IS NOT NULL THEN
    IF jsonb_typeof(p_franchise) <> 'object' THEN
      RAISE EXCEPTION 'Franchise update must be an object';
    END IF;

    IF coalesce((p_franchise->>'clear')::boolean, false) THEN
      DELETE FROM public.canonical_game_franchises
      WHERE canonical_game_id = v_canonical_id;
    ELSE
      v_name := regexp_replace(btrim(p_franchise->>'name'), '\s+', ' ', 'g');
      IF coalesce(v_name, '') = '' THEN
        RAISE EXCEPTION 'Franchise name is required';
      END IF;

      IF nullif(p_franchise->>'id', '') IS NOT NULL THEN
        SELECT id INTO STRICT v_franchise_id
        FROM public.game_franchises
        WHERE id = (p_franchise->>'id')::uuid;
      ELSE
        SELECT id INTO v_franchise_id
        FROM public.game_franchises
        WHERE lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) = lower(v_name)
        LIMIT 1;

        IF v_franchise_id IS NULL THEN
          v_slug := trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'));
          INSERT INTO public.game_franchises (name, slug)
          VALUES (
            v_name,
            coalesce(nullif(v_slug, ''), 'franchise') || '-' || substr(gen_random_uuid()::text, 1, 8)
          )
          RETURNING id INTO v_franchise_id;
        END IF;
      END IF;

      DELETE FROM public.canonical_game_franchises
      WHERE canonical_game_id = v_canonical_id
        AND franchise_id <> v_franchise_id;

      INSERT INTO public.canonical_game_franchises (
        canonical_game_id, franchise_id, membership_role
      ) VALUES (
        v_canonical_id, v_franchise_id, 'unspecified'
      )
      ON CONFLICT (canonical_game_id, franchise_id)
      DO UPDATE SET membership_role = excluded.membership_role;
    END IF;
  END IF;

  -- NULL means no relationship update. [] is the explicit clear-all operation.
  IF p_relationships IS NOT NULL THEN
    IF jsonb_typeof(p_relationships) <> 'array' THEN
      RAISE EXCEPTION 'Relationships must be an array';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_relationships) item
      WHERE nullif(item->>'id', '') IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM public.game_relationships_bidirectional v
          WHERE v.game_id = v_canonical_id
            AND v.relationship_id = (item->>'id')::uuid
        )
    ) THEN
      RAISE EXCEPTION 'A relationship does not belong to this game';
    END IF;

    DELETE FROM public.game_relationships r
    WHERE r.id IN (
      SELECT relationship_id
      FROM public.game_relationships_bidirectional
      WHERE game_id = v_canonical_id
    )
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_relationships) item
        WHERE nullif(item->>'id', '')::uuid = r.id
      );

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_relationships)
    LOOP
      v_edge_id := nullif(v_item->>'id', '')::uuid;
      v_related_id := nullif(v_item->>'relatedGameId', '')::uuid;
      v_type := nullif(v_item->>'relationType', '');
      IF v_related_id IS NULL OR v_type IS NULL THEN
        RAISE EXCEPTION 'Every relationship needs a type and a related game';
      END IF;
      IF v_related_id = v_canonical_id THEN
        RAISE EXCEPTION 'A game cannot relate to itself';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.game_relationship_types
        WHERE code = v_type AND is_selectable
      ) THEN
        RAISE EXCEPTION 'Unsupported relationship type: %', v_type;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.game_identity_links
        WHERE canonical_game_id = v_related_id
      ) THEN
        RAISE EXCEPTION 'Relationship target must be an owned canonical game';
      END IF;

      IF v_edge_id IS NOT NULL THEN
        SELECT v.related_game_id, v.display_relation_type
        INTO STRICT v_existing
        FROM public.game_relationships_bidirectional v
        WHERE v.game_id = v_canonical_id
          AND v.relationship_id = v_edge_id;

        IF v_existing.related_game_id = v_related_id
           AND v_existing.display_relation_type = v_type THEN
          CONTINUE;
        END IF;

        -- Re-orient the replacement from the edited game's perspective. This keeps
        -- one stored edge and also works when the user edited an inverse view row.
        DELETE FROM public.game_relationships WHERE id = v_edge_id;
      END IF;

      INSERT INTO public.game_relationships (
        source_game_id, target_game_id, relation_type, confidence,
        source, origin_type, is_locked
      ) VALUES (
        v_canonical_id, v_related_id, v_type, 1,
        'admin_game_form', 'manual', true
      );
    END LOOP;
  END IF;

  RETURN v_canonical_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_admin_game_metadata(bigint, jsonb, jsonb)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_admin_game_metadata(bigint, jsonb, jsonb)
TO service_role;

-- Run against a local/test database after applying all migrations.
-- The fixture and every mutation are rolled back.
SELECT 'before' AS checkpoint,
  (SELECT count(*) FROM public.canonical_game_franchises) AS franchise_links,
  (SELECT count(*) FROM public.game_relationships) AS relationships,
  (SELECT count(*) FROM public.game_identity_links) AS identity_links;

BEGIN;

DO $test$
DECLARE
  g1 bigint;
  g2 bigint;
  g3 bigint;
  c1 uuid;
  c2 uuid;
  c3 uuid;
  f1 uuid;
  f2 uuid;
  saved_edges jsonb;
  before_franchises bigint;
  before_relationships bigint;
  before_identities bigint;
  edge_id uuid;
  replacement_edge_id uuid;
  same_release_game_1 bigint;
  same_release_game_2 bigint;
  variant_game_1 bigint;
  variant_game_2 bigint;
  same_release_canonical_1 uuid;
  same_release_canonical_2 uuid;
  variant_canonical_1 uuid;
  variant_canonical_2 uuid;
  enhanced_game_1 bigint;
  enhanced_game_2 bigint;
  enhanced_canonical_1 uuid;
  enhanced_canonical_2 uuid;
  conflicting_id_game_1 bigint;
  conflicting_id_game_2 bigint;
  conflicting_id_canonical_1 uuid;
  conflicting_id_canonical_2 uuid;
BEGIN
  INSERT INTO public.games(title,slug,status) VALUES
    ('RPC Safety Test A','rpc-safety-test-a','Unplayed') RETURNING id INTO g1;
  INSERT INTO public.games(title,slug,status) VALUES
    ('RPC Safety Test B','rpc-safety-test-b','Unplayed') RETURNING id INTO g2;
  INSERT INTO public.games(title,slug,status) VALUES
    ('RPC Safety Test C','rpc-safety-test-c','Unplayed') RETURNING id INTO g3;

  INSERT INTO public.canonical_games(identity_key,title,normalized_title)
  VALUES('test:rpc-safety-a','RPC Safety Test A','rpc safety test a') RETURNING id INTO c1;
  INSERT INTO public.canonical_games(identity_key,title,normalized_title)
  VALUES('test:rpc-safety-b','RPC Safety Test B','rpc safety test b') RETURNING id INTO c2;
  INSERT INTO public.canonical_games(identity_key,title,normalized_title)
  VALUES('test:rpc-safety-c','RPC Safety Test C','rpc safety test c') RETURNING id INTO c3;

  INSERT INTO public.game_identity_links(game_id,canonical_game_id,match_type,confidence)
  VALUES(g1,c1,'manual',1),(g2,c2,'manual',1),(g3,c3,'manual',1);
  INSERT INTO public.game_franchises(name,slug) VALUES
    ('RPC Safety Franchise One','rpc-safety-franchise-one') RETURNING id INTO f1;
  INSERT INTO public.game_franchises(name,slug) VALUES
    ('RPC Safety Franchise Two','rpc-safety-franchise-two') RETURNING id INTO f2;
  INSERT INTO public.canonical_game_franchises(canonical_game_id,franchise_id,membership_role)
  VALUES(c1,f1,'unspecified');
  INSERT INTO public.game_relationships(
    source_game_id,target_game_id,relation_type,confidence,source,origin_type,is_locked
  ) VALUES
    (c1,c2,'sequel_of',1,'rpc_test','manual',true),
    (c1,c3,'related_to',1,'rpc_test','manual',true);

  -- Ordinary game changes plus an omitted-metadata RPC preserve both collections.
  UPDATE public.games SET status='Playing' WHERE id=g1;
  PERFORM public.sync_admin_game_metadata(g1);
  ASSERT (SELECT count(*) FROM public.canonical_game_franchises WHERE canonical_game_id=c1)=1,
    'omitted franchise unexpectedly changed membership';
  ASSERT (SELECT count(*) FROM public.game_relationships_bidirectional WHERE game_id=c1)=2,
    'omitted relationships unexpectedly changed edges';

  -- Explicit franchise clear does not change relationships.
  PERFORM public.sync_admin_game_metadata(g1,'{"clear":true}'::jsonb,NULL);
  ASSERT (SELECT count(*) FROM public.canonical_game_franchises WHERE canonical_game_id=c1)=0,
    'explicit franchise clear failed';
  ASSERT (SELECT count(*) FROM public.game_relationships_bidirectional WHERE game_id=c1)=2,
    'franchise clear changed relationships';
  PERFORM public.sync_admin_game_metadata(
    g1,jsonb_build_object('id',f1,'name','RPC Safety Franchise One'),NULL
  );

  -- Explicit [] clears all relationships and leaves the franchise untouched.
  PERFORM public.sync_admin_game_metadata(g1,NULL,'[]'::jsonb);
  ASSERT (SELECT count(*) FROM public.game_relationships_bidirectional WHERE game_id=c1)=0,
    'explicit relationship clear failed';
  ASSERT (SELECT franchise_id FROM public.canonical_game_franchises WHERE canonical_game_id=c1)=f1,
    'relationship clear changed franchise';

  -- Restore two relationships, then change only the franchise.
  PERFORM public.sync_admin_game_metadata(g1,NULL,jsonb_build_array(
    jsonb_build_object('relationType','sequel_of','relatedGameId',c2),
    jsonb_build_object('relationType','related_to','relatedGameId',c3)
  ));
  PERFORM public.sync_admin_game_metadata(
    g1,jsonb_build_object('id',f2,'name','RPC Safety Franchise Two'),NULL
  );
  ASSERT (SELECT franchise_id FROM public.canonical_game_franchises WHERE canonical_game_id=c1)=f2,
    'franchise update failed';
  ASSERT (SELECT count(*) FROM public.game_relationships_bidirectional WHERE game_id=c1)=2,
    'franchise-only update changed relationships';

  -- Change only relationships and preserve the new franchise.
  SELECT jsonb_agg(jsonb_build_object(
    'id',relationship_id,
    'relationType',display_relation_type,
    'relatedGameId',related_game_id
  ) ORDER BY relationship_id)
  INTO saved_edges
  FROM public.game_relationships_bidirectional
  WHERE game_id=c1 AND display_relation_type='sequel_of';
  PERFORM public.sync_admin_game_metadata(g1,NULL,saved_edges);
  ASSERT (SELECT count(*) FROM public.game_relationships_bidirectional WHERE game_id=c1)=1,
    'relationship-only update did not apply the diff';
  ASSERT (SELECT franchise_id FROM public.canonical_game_franchises WHERE canonical_game_id=c1)=f2,
    'relationship-only update changed franchise';

  -- Restore and save the complete list without losing an edge.
  PERFORM public.sync_admin_game_metadata(g1,NULL,jsonb_build_array(
    (saved_edges->0),
    jsonb_build_object('relationType','related_to','relatedGameId',c3)
  ));
  SELECT jsonb_agg(jsonb_build_object(
    'id',relationship_id,
    'relationType',display_relation_type,
    'relatedGameId',related_game_id
  ) ORDER BY relationship_id)
  INTO saved_edges
  FROM public.game_relationships_bidirectional WHERE game_id=c1;
  PERFORM public.sync_admin_game_metadata(g1,NULL,saved_edges);
  ASSERT (SELECT count(*) FROM public.game_relationships_bidirectional WHERE game_id=c1)=2,
    'full-list save lost a relationship';

  -- Unchanged existing rows retain the same stored edge.
  PERFORM public.sync_admin_game_metadata(g1,NULL,'[]'::jsonb);
  INSERT INTO public.game_relationships(
    source_game_id,target_game_id,relation_type,confidence,source,origin_type,is_locked
  ) VALUES(c1,c2,'sequel_of',1,'rpc_test','manual',true) RETURNING id INTO edge_id;
  PERFORM public.sync_admin_game_metadata(g1,NULL,jsonb_build_array(
    jsonb_build_object('id',edge_id,'relationType','sequel_of','relatedGameId',c2)
  ));
  ASSERT EXISTS(SELECT 1 FROM public.game_relationships WHERE id=edge_id),
    'unchanged relationship was replaced';

  -- Changing the type replaces the original edge instead of ignoring the edit.
  PERFORM public.sync_admin_game_metadata(g1,NULL,jsonb_build_array(
    jsonb_build_object('id',edge_id,'relationType','remake_of','relatedGameId',c2)
  ));
  ASSERT NOT EXISTS(SELECT 1 FROM public.game_relationships WHERE id=edge_id),
    'relationship type change retained stale edge';
  SELECT relationship_id INTO STRICT replacement_edge_id
  FROM public.game_relationships_bidirectional
  WHERE game_id=c1 AND related_game_id=c2 AND display_relation_type='remake_of';

  -- Changing the target also replaces the edge and leaves exactly one stored row.
  PERFORM public.sync_admin_game_metadata(g1,NULL,jsonb_build_array(
    jsonb_build_object('id',replacement_edge_id,'relationType','remake_of','relatedGameId',c3)
  ));
  ASSERT (SELECT count(*) FROM public.game_relationships_bidirectional WHERE game_id=c1)=1,
    'target change created a duplicate edge';
  ASSERT EXISTS(
    SELECT 1 FROM public.game_relationships_bidirectional
    WHERE game_id=c1 AND related_game_id=c3 AND display_relation_type='remake_of'
  ), 'relationship target change was ignored';

  -- Editing that same row from its inverse side stores one re-oriented edge.
  SELECT relationship_id INTO STRICT replacement_edge_id
  FROM public.game_relationships_bidirectional
  WHERE game_id=c3 AND related_game_id=c1;
  PERFORM public.sync_admin_game_metadata(g3,NULL,jsonb_build_array(
    jsonb_build_object('id',replacement_edge_id,'relationType','sequel_of','relatedGameId',c2)
  ));
  ASSERT (SELECT count(*) FROM public.game_relationships WHERE id=replacement_edge_id)=0,
    'inverse edit retained stale stored edge';
  ASSERT EXISTS(
    SELECT 1 FROM public.game_relationships
    WHERE source_game_id=c3 AND target_game_id=c2 AND relation_type='sequel_of'
  ), 'inverse-side edit was not applied from the edited perspective';
  ASSERT NOT EXISTS(
    SELECT 1 FROM public.game_relationships
    WHERE source_game_id=c2 AND target_game_id=c3 AND relation_type='prequel_of'
  ), 'inverse-side edit created a reverse duplicate';

  -- Two platform copies of the exact same release share one canonical identity.
  INSERT INTO public.games(title,slug,status,release,igdb_id,steam_appid,platform,store)
  VALUES('Cross Platform Release','cross-platform-release-a','Unplayed','2026-01-01',991001,992001,'Steam','Steam')
  RETURNING id INTO same_release_game_1;
  INSERT INTO public.games(title,slug,status,release,igdb_id,steam_appid,platform,store)
  VALUES('Cross Platform Release','cross-platform-release-b','Unplayed','2026-01-01',991001,NULL,'EPIC','EPIC')
  RETURNING id INTO same_release_game_2;
  same_release_canonical_1 := public.sync_admin_game_metadata(same_release_game_1);
  same_release_canonical_2 := public.sync_admin_game_metadata(same_release_game_2);
  ASSERT same_release_canonical_1=same_release_canonical_2,
    'same release on two platforms was not grouped';

  -- Different release variants sharing external IDs remain separate canonicals.
  INSERT INTO public.games(title,slug,status,release,igdb_id,steam_appid)
  VALUES('Shared Identifier Game','shared-identifier-game','Unplayed','2026-02-01',991002,992002)
  RETURNING id INTO variant_game_1;
  INSERT INTO public.games(title,slug,status,release,igdb_id,steam_appid)
  VALUES('Shared Identifier Game Deluxe Edition','shared-identifier-game-deluxe','Unplayed','2026-02-01',991002,992002)
  RETURNING id INTO variant_game_2;
  variant_canonical_1 := public.sync_admin_game_metadata(variant_game_1);
  variant_canonical_2 := public.sync_admin_game_metadata(variant_game_2);
  ASSERT variant_canonical_1<>variant_canonical_2,
    'different release variants were merged by shared identifiers';
  ASSERT (
    SELECT metadata->>'release_variant_kind' FROM public.canonical_games
    WHERE id=variant_canonical_2
  )='edition', 'edition release kind was not recorded';
  ASSERT (
    SELECT (metadata->>'identity_merge_prohibited')::boolean FROM public.canonical_games
    WHERE id=variant_canonical_2
  ), 'edition identity was not protected from identifier-only merging';

  -- A second platform copy of an existing enhanced edition reuses that edition.
  INSERT INTO public.games(title,slug,status,release,igdb_id,steam_appid,platform,store)
  VALUES('Existing Enhanced Edition','existing-enhanced-edition-steam','Unplayed','2026-03-01',991003,992003,'Steam','Steam')
  RETURNING id INTO enhanced_game_1;
  INSERT INTO public.games(title,slug,status,release,igdb_id,steam_appid,platform,store)
  VALUES('Existing Enhanced Edition','existing-enhanced-edition-epic','Unplayed','2026-03-01',991003,NULL,'EPIC','EPIC')
  RETURNING id INTO enhanced_game_2;
  enhanced_canonical_1 := public.sync_admin_game_metadata(enhanced_game_1);
  enhanced_canonical_2 := public.sync_admin_game_metadata(enhanced_game_2);
  ASSERT enhanced_canonical_1=enhanced_canonical_2,
    'enhanced edition platform copies were split';
  ASSERT (
    SELECT metadata->>'release_variant_kind' FROM public.canonical_games
    WHERE id=enhanced_canonical_1
  )='enhanced_edition', 'enhanced edition used a non-approved release kind';

  -- Conflicting non-null external IDs prohibit an otherwise exact title/date merge.
  INSERT INTO public.games(title,slug,status,release,igdb_id,platform,store)
  VALUES('Conflicting Identifier Game','conflicting-identifier-game-a','Unplayed','2026-04-01',991004,'Steam','Steam')
  RETURNING id INTO conflicting_id_game_1;
  INSERT INTO public.games(title,slug,status,release,igdb_id,platform,store)
  VALUES('Conflicting Identifier Game','conflicting-identifier-game-b','Unplayed','2026-04-01',991005,'EPIC','EPIC')
  RETURNING id INTO conflicting_id_game_2;
  conflicting_id_canonical_1 := public.sync_admin_game_metadata(conflicting_id_game_1);
  conflicting_id_canonical_2 := public.sync_admin_game_metadata(conflicting_id_game_2);
  ASSERT conflicting_id_canonical_1<>conflicting_id_canonical_2,
    'same title/date with conflicting IGDB IDs was merged';

  -- A bad new target must roll back deletes performed earlier in the function call.
  INSERT INTO public.game_relationships(
    source_game_id,target_game_id,relation_type,confidence,source,origin_type,is_locked
  ) VALUES
    (c1,c2,'related_to',1,'rpc_test','manual',true),
    (c1,c3,'related_to',1,'rpc_test','manual',true);
  SELECT jsonb_agg(jsonb_build_object(
    'id',relationship_id,
    'relationType',display_relation_type,
    'relatedGameId',related_game_id
  ) ORDER BY relationship_id)
  INTO saved_edges
  FROM public.game_relationships_bidirectional WHERE game_id=c1;
  SELECT count(*) INTO before_franchises FROM public.canonical_game_franchises;
  SELECT count(*) INTO before_relationships FROM public.game_relationships;
  SELECT count(*) INTO before_identities FROM public.game_identity_links;
  BEGIN
    PERFORM public.sync_admin_game_metadata(g1,'{"clear":true}'::jsonb,jsonb_build_array(
      saved_edges->0,
      jsonb_build_object(
        'relationType','related_to',
        'relatedGameId','00000000-0000-0000-0000-000000000001'
      )
    ));
    RAISE EXCEPTION 'invalid relationship unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='invalid relationship unexpectedly succeeded' THEN RAISE; END IF;
  END;
  ASSERT (SELECT count(*) FROM public.canonical_game_franchises)=before_franchises,
    'failed call partially deleted franchise membership';
  ASSERT (SELECT count(*) FROM public.game_relationships)=before_relationships,
    'failed call partially deleted relationships';
  ASSERT (SELECT count(*) FROM public.game_identity_links)=before_identities,
    'failed call changed identity links';
END;
$test$;

ROLLBACK;

SELECT 'after' AS checkpoint,
  (SELECT count(*) FROM public.canonical_game_franchises) AS franchise_links,
  (SELECT count(*) FROM public.game_relationships) AS relationships,
  (SELECT count(*) FROM public.game_identity_links) AS identity_links;

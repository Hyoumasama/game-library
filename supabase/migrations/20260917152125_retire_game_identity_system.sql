-- Retire the game identity subsystem after a verified relationship-only backup.
-- No games rows are inserted, updated or deleted. RESTRICT protects outside dependencies.
BEGIN;
SET LOCAL lock_timeout = '10s';

DO $retire_game_identity$
DECLARE
  before_count bigint;
  after_count bigint;
  before_checksum text;
  after_checksum text;
BEGIN
  -- Block concurrent game writes until the preservation check and teardown finish.
  LOCK TABLE public.games IN SHARE MODE;
  SELECT count(*), encode(sha256(convert_to(coalesce(string_agg(to_jsonb(g)::text, E'\n' ORDER BY g.id), ''), 'UTF8')), 'hex')
    INTO before_count, before_checksum FROM public.games g;

  DROP TRIGGER IF EXISTS link_new_library_game_identity ON public.games;

  DROP TABLE IF EXISTS
    public."canonical_game_franchises",
    public."canonical_game_series",
    public."canonical_games",
    public."game_franchises",
    public."game_identity_links",
    public."game_relationship_backfill_runs",
    public."game_relationship_reviews",
    public."game_relationships",
    public."game_semantic_cleanup_archive",
    public."game_series",
    public."game_versions"
    RESTRICT;

  DROP FUNCTION IF EXISTS
    public."apply_game_identity_backfill"(jsonb),
    public."apply_game_relationship_enrichment"(jsonb),
    public."audit_game_relationship_integrity"(),
    public."audit_game_relationship_integrity_core"(),
    public."enforce_game_series_exclusions"(),
    public."game_identity_compatible"(uuid, text, bigint, bigint, date),
    public."game_identity_markers"(text),
    public."game_identity_title"(text),
    public."game_release_class"(text),
    public."game_review_fact_key"(text, uuid, uuid, text),
    public."game_review_identifiers"(uuid, uuid),
    public."game_review_resolution"(text, uuid, uuid, text),
    public."link_new_library_game_identity"(),
    public."prepare_game_relationship_review"(),
    public."prevent_duplicate_verified_canonical"(),
    public."reconcile_game_relationship_reviews"(),
    public."relationship_updated_at"(),
    public."resolve_game_relationship_review"(uuid, boolean, text)
    RESTRICT;

  SELECT count(*), encode(sha256(convert_to(coalesce(string_agg(to_jsonb(g)::text, E'\n' ORDER BY g.id), ''), 'UTF8')), 'hex')
    INTO after_count, after_checksum FROM public.games g;
  IF before_count IS DISTINCT FROM after_count OR before_checksum IS DISTINCT FROM after_checksum THEN
    RAISE EXCEPTION 'Game preservation check failed; the teardown is rolled back';
  END IF;
END;
$retire_game_identity$;

COMMIT;

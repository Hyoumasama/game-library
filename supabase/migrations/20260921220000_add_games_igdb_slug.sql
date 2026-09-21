-- Store the canonical IGDB slug so game detail pages do not need an IGDB API
-- request merely to construct the public game URL. Existing rows are untouched;
-- the admin IGDB sync route backfills them after this migration is reviewed/applied.
ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS igdb_slug text;

COMMENT ON COLUMN public.games.igdb_slug IS
  'Canonical IGDB game slug used to build https://www.igdb.com/games/{slug}';

-- HowLongToBeat completion times, stored locally so pages never call HLTB.
-- Filled by scripts/backfill-hltb.ts once, then kept fresh by the admin
-- "refresh HLTB" button, which only revisits recent releases and recent
-- games that had no HLTB data yet (older times rarely change).
ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS hltb_id integer,
ADD COLUMN IF NOT EXISTS hltb_main numeric(6, 1),
ADD COLUMN IF NOT EXISTS hltb_main_extra numeric(6, 1),
ADD COLUMN IF NOT EXISTS hltb_completionist numeric(6, 1),
ADD COLUMN IF NOT EXISTS hltb_main_count integer,
ADD COLUMN IF NOT EXISTS hltb_checked_at timestamptz,
ADD COLUMN IF NOT EXISTS hltb_locked boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.games.hltb_id IS
  'HowLongToBeat game id, used to build https://howlongtobeat.com/game/{id}';
COMMENT ON COLUMN public.games.hltb_main IS 'HLTB Main Story time in hours';
COMMENT ON COLUMN public.games.hltb_main_extra IS 'HLTB Main + Extra time in hours';
COMMENT ON COLUMN public.games.hltb_completionist IS 'HLTB Completionist time in hours';
COMMENT ON COLUMN public.games.hltb_main_count IS
  'Number of HLTB Main Story submissions - low counts mean a rough estimate';
COMMENT ON COLUMN public.games.hltb_checked_at IS
  'Last automatic HLTB lookup, successful or not';
COMMENT ON COLUMN public.games.hltb_locked IS
  'Times were set by hand - automatic HLTB refreshes skip this game';

CREATE INDEX IF NOT EXISTS games_hltb_refresh_idx
ON public.games (release, hltb_checked_at)
WHERE NOT hltb_locked;

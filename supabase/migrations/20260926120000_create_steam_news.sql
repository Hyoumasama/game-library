-- Recent official Steam announcements for games in the library, shown in the
-- home page "What's New" row. Rows are short-lived: the sync route
-- (app/api/cron/steam-news/route.ts) upserts announcements from the last
-- 7 days and deletes anything older, so the table stays small.
CREATE TABLE IF NOT EXISTS public.steam_news (
  gid text PRIMARY KEY,
  appid integer NOT NULL,
  game_id bigint NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  -- Announcement capsule art from the app's store events; NULL falls back to
  -- the game's wide cover in the UI.
  image_url text,
  kind text NOT NULL CHECK (kind IN ('update', 'news')),
  published_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- For databases that ran an earlier version of this migration.
ALTER TABLE public.steam_news
ADD COLUMN IF NOT EXISTS image_url text;

CREATE INDEX IF NOT EXISTS steam_news_published_at_idx
  ON public.steam_news (published_at DESC);

ALTER TABLE public.steam_news ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.steam_news IS
  'Last 7 days of steam_community_announcements per library game; kind = update when tagged patchnotes or the title looks like a patch/update.';

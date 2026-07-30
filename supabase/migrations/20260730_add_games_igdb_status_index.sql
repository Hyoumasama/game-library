-- Add index to speed up queries filtering by igdb_id and status
-- Run this manually in Supabase SQL editor if needed.

create index if not exists games_igdb_status_idx
on public.games (igdb_id, status)
include (id, store, platform, hardware)
where igdb_id is not null;

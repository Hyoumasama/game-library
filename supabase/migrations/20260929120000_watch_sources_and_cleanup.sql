begin;

-- Where each work is watched from: "Hard Disk" and/or streaming services
-- (Netflix, OSN+, ...). For series the app keeps "Hard Disk" in sync with
-- owned episodes; for movies it is set by hand.
alter table public.watch_library_entries
  add column if not exists watch_sources text[] not null default '{}';

-- Every work added so far came from the hard-disk scan.
update public.watch_library_entries
set watch_sources = '{Hard Disk}'
where cardinality(watch_sources) = 0;

create index if not exists watch_library_entries_watch_sources_idx
on public.watch_library_entries using gin (watch_sources);

-- watch_files was never written to: owned episodes live in
-- watch_owned_episodes. Drop it along with its indexes and trigger.
drop table if exists public.watch_files;

-- Works are now saved by lib/server/watch/works.ts (the Add Work modal and
-- npm run watch:match), so the import confirmation RPC is unused.
drop function if exists public.confirm_watch_import_match(bigint, jsonb, jsonb, jsonb, jsonb);

commit;

create extension if not exists pg_trgm with schema extensions;

create index if not exists games_title_trgm_idx
on public.games using gin (title gin_trgm_ops);

create index if not exists games_genres_gin_idx
on public.games using gin (genres);

create index if not exists games_release_id_idx
on public.games (release, id desc)
where release is not null;

create index if not exists games_release_score_idx
on public.games (release, score desc)
where release is not null and score is not null and score > 0;

create index if not exists games_completed_year_hours_idx
on public.games (completion_last_played, hours_played desc)
where status = 'Completed'
  and completion_last_played is not null
  and hours_played is not null
  and hours_played > 0;

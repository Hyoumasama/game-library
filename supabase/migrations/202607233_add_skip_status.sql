alter table public.games
add column if not exists skipped_at date;

create or replace function public.maintain_game_skipped_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'Skipped' then
    new.skipped_at = coalesce(new.skipped_at, current_date);
  elsif tg_op = 'UPDATE' then
    if old.status = 'Skipped' and new.status is distinct from 'Skipped' then
      new.skipped_at = null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists maintain_game_skipped_at_trigger on public.games;

create trigger maintain_game_skipped_at_trigger
before insert or update of status on public.games
for each row
execute function public.maintain_game_skipped_at();

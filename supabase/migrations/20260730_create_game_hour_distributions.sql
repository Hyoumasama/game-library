begin;

create table public.game_hour_distributions (
  game_id bigint primary key,
  start_month date not null,
  end_month date,
  method text not null default 'even_monthly',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint game_hour_distributions_game_id_fkey
    foreign key (game_id)
    references public.games(id)
    on delete cascade,

  constraint game_hour_distributions_method_check
    check (method in ('even_monthly')),

  constraint game_hour_distributions_start_month_first_day_check
    check (
      start_month = date_trunc('month', start_month)::date
    ),

  constraint game_hour_distributions_end_month_first_day_check
    check (
      end_month is null
      or end_month = date_trunc('month', end_month)::date
    ),

  constraint game_hour_distributions_end_after_start_check
    check (
      end_month is null
      or end_month >= start_month
    )
);

drop trigger if exists game_hour_distributions_set_updated_at
on public.game_hour_distributions;

create trigger game_hour_distributions_set_updated_at
before update on public.game_hour_distributions
for each row
execute function public.set_updated_at();

alter table public.game_hour_distributions
enable row level security;

commit;
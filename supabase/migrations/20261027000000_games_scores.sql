-- Catálogo de juegos y puntuaciones (SPEC 06).

create table public.games (
  id         text primary key check (id ~ '^[a-z0-9-]{1,32}$'),
  title      text not null,
  short      text not null,
  long       text not null,
  cat        text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover      text not null check (cover like 'cover-%'),
  color      text not null check (color in ('cyan','magenta','yellow','green')),
  sort_order int  not null,
  created_at timestamptz not null default now()
);

create table public.scores (
  id         bigint generated always as identity primary key,
  game_id    text not null references public.games(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 10 and name = upper(name) and name = btrim(name)),
  score      integer not null check (score between 0 and 9999999),
  created_at timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc, created_at);

-- RLS: lectura pública e inserción abierta; sin update ni delete.
alter table public.games enable row level security;
alter table public.scores enable row level security;

create policy "games: lectura pública" on public.games
  for select to anon, authenticated using (true);

create policy "scores: lectura pública" on public.scores
  for select to anon, authenticated using (true);

-- Los rangos los imponen los check de la tabla.
create policy "scores: inserción pública" on public.scores
  for insert to anon, authenticated with check (true);

-- best y plays de cada juego
create view public.game_stats with (security_invoker = true) as
  select g.id as game_id, coalesce(max(s.score), 0) as best, count(s.id) as plays
  from public.games g left join public.scores s on s.game_id = g.id
  group by g.id;

-- Mejor puntuación por jugador; desempate por la marca más antigua.
create or replace function public.leaderboard(p_game text, p_limit int)
returns table (rank int, name text, score int, created_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (row_number() over (order by b.score desc, b.created_at asc))::int,
    b.name,
    b.score,
    b.created_at
  from (
    select distinct on (s.name) s.name, s.score, s.created_at
    from public.scores s
    where s.game_id = p_game
    order by s.name, s.score desc, s.created_at asc
  ) b
  order by b.score desc, b.created_at asc
  limit p_limit
$$;

-- Posición y mejor marca de un nombre en un juego (0 filas si no tiene).
create or replace function public.player_best(p_game text, p_name text)
returns table (rank int, score int, created_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select l.rank, l.score, l.created_at
  from public.leaderboard(p_game, null) l
  where l.name = p_name
$$;

grant execute on function public.leaderboard(text, int) to anon, authenticated;
grant execute on function public.player_best(text, text) to anon, authenticated;

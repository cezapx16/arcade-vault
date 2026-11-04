-- Perfiles de jugador con alias arcade único (SPEC 15).

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null unique check (name ~ '^[A-Z0-9_]{1,10}$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Lectura pública (el alias ya es público en los rankings). Sin insert/update/delete desde clientes.
create policy "profiles: lectura pública" on public.profiles
  for select to anon, authenticated using (true);

-- Crea el perfil al registrarse con el alias de los metadatos (options.data.name).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- true si ningún perfil usa ese alias (se comprueba antes de signUp).
-- security invoker: la lectura pública de profiles ya deja ver todos los alias.
create or replace function public.alias_available(p_name text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select not exists (select 1 from public.profiles p where p.name = p_name)
$$;

revoke execute on function public.alias_available(text) from public;
grant execute on function public.alias_available(text) to anon, authenticated;

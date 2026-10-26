create or replace function public.health_check()
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$ select now() $$;

grant execute on function public.health_check() to anon, authenticated;

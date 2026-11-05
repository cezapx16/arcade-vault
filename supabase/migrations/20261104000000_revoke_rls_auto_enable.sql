-- rls_auto_enable() es la función del event trigger ensure_rls (creada por Supabase).
-- Un event trigger se dispara sin necesitar EXECUTE, así que ensure_rls sigue activando RLS en las tablas nuevas de public.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

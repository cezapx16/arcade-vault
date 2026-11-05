# Seguridad — Estado

> Mantenido por el agente security-auditor. Referencias: specs/15-autenticacion-email.md, specs/16-medidas-seguridad-basicas.md y references/security/security-checklist.md.

| Área | Control | Estado | Evidencia | Última revisión |
| ---- | ------- | ------ | --------- | --------------- |
| BD | Avisos de seguridad del panel (`get_advisors`) | aceptado | Solo `auth_leaked_password_protection` (WARN); los de `rls_auto_enable` ya no aparecen | 2026-11-04 |
| BD | Avisos de rendimiento del panel | ✅ | `get_advisors` performance: 0 lints | 2026-11-04 |
| BD | RLS en todas las tablas de `public` | ✅ | `pg_class.relrowsecurity` = true en `games`, `profiles`, `scores` | 2026-11-04 |
| BD | Políticas iguales a las migraciones | ✅ | `pg_policies`: SELECT público en las 3 tablas; INSERT público en `scores` (aceptado); sin UPDATE/DELETE/ALL | 2026-11-04 |
| BD | Inserción pública en `scores` | aceptado | Política `scores: inserción pública` `with check (true)` — SPEC 15/16 | 2026-11-04 |
| BD | Permisos de tabla de `anon`/`authenticated` | ✅ | `role_table_grants`: privilegios por defecto de Supabase, todas las tablas con RLS | 2026-11-04 |
| BD | Default privileges de funciones nuevas en `public` | ⚠️ | `pg_default_acl`: EXECUTE para anon/authenticated en funciones nuevas (una futura `security definer` quedaría expuesta) | 2026-11-04 |
| BD | Funciones `security definer` con `search_path` y sin EXECUTE de clientes | ✅ | `handle_new_user` y `rls_auto_enable`: `proconfig` con search_path, `has_function_privilege` false | 2026-11-04 |
| BD | Funciones ejecutables por clientes previstas | ✅ | Solo `alias_available`, `health_check`, `leaderboard`, `player_best` (invoker, search_path '') | 2026-11-04 |
| BD | Vista `game_stats` con `security_invoker` | ✅ | `reloptions` = `security_invoker=true` | 2026-11-04 |
| BD | Trigger `on_auth_user_created` → `handle_new_user` | ✅ | `pg_trigger` en `auth.users`, activo | 2026-11-04 |
| BD | Event trigger `ensure_rls` → `rls_auto_enable` | ✅ | `pg_event_trigger`, `evtenabled` = O | 2026-11-04 |
| BD | Deriva de migraciones | ✅ | `list_migrations`: 9 = 9 archivos de `supabase/migrations/`, mismos nombres (las versiones difieren por `apply_migration`) | 2026-11-04 |
| BD | Extensiones fuera de `public` | ✅ | `list_extensions`: ninguna instalada en `public` | 2026-11-04 |
| BD | Buckets de Storage públicos | ✅ | `storage.buckets`: ninguno | 2026-11-04 |
| BD | Logs de Auth y API (24 h) | ✅ | edge: 0 respuestas 429, 0 5xx; auth: 4 `invalid_credentials`, 1 `otp_expired` | 2026-11-04 |
| Auth | Mínimo de contraseña 8, sin requisitos de caracteres | manual | No consultable por MCP; `MIN_PASSWORD` = 8 en `app/actions/auth.ts:13` | 2026-11-04 |
| Auth | Rate limit de sign-ups/sign-ins por IP (30 / 5 min) | manual | No consultable por MCP; global en la práctica (aceptado, SPEC 16) | 2026-11-04 |
| Auth | Leaked password protection | manual | Aviso `auth_leaked_password_protection` activo; plan del proyecto sin confirmar (aceptado si es Free) | 2026-11-04 |
| Auth | Confirmación de email activada | manual | No consultable por MCP | 2026-11-04 |
| Auth | Plantilla "Confirm signup" con `{{ .RedirectTo }}?token_hash=…&type=email` | manual | Logs: 2 peticiones a `/auth/v1/verify` (ruta de la plantilla por defecto) | 2026-11-04 |
| Auth | Redirect URLs limitadas a local y producción | manual | No consultable por MCP; es la única barrera del hallazgo de `emailRedirectTo` | 2026-11-04 |
| App | Sin secretos versionados | ✅ | `git grep` de patrones: solo menciones en docs (`CLAUDE.md:85`, `README.md:35`, `specs/04…:147`, `specs/06…:250`) | 2026-11-04 |
| App | `.env*` fuera del repo | ✅ | `.gitignore:40-42`; `git ls-files` solo `.env.example` (y `lib/supabase/env.ts`, código) | 2026-11-04 |
| App | Ninguna `NEXT_PUBLIC_*` secreta | ✅ | Solo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`lib/supabase/env.ts:5-8`) | 2026-11-04 |
| App | `RESEND_API_KEY` solo en servidor | ✅ | Solo en `app/api/contact/route.ts:48` (sin `"use client"`) | 2026-11-04 |
| App | Cabeceras de la SPEC 16 y sin `X-Powered-By` | ✅ | `curl -sI` contra `next start` en `/`, `/games`, `/api/health`, `/auth/confirm` | 2026-11-04 |
| App | Redirección `/juegos/:id` → `/games/:id` | ⚠️ | 308 correcto, pero la respuesta sale sin las cabeceras de seguridad (impacto mínimo) | 2026-11-04 |
| App | CSP y HSTS | aceptado | Fuera de alcance — SPEC 16 | 2026-11-04 |
| App | `submitScore` valida en servidor | ✅ | `app/actions/scores.ts:15-28` (id regex, nombre 1–10 mayúsculas, entero 0–9 999 999) | 2026-11-04 |
| App | `signUp`/`signIn` validan y traducen errores | ⚠️ | Validación y `MSG` correctos (`app/actions/auth.ts:65-72,33-50`), pero `signUp` revela "ESE EMAIL YA TIENE CUENTA" (`:41-43,98-100`) | 2026-11-04 |
| App | `emailRedirectTo` desde un origen fijo | ⚠️ | `requestOrigin()` usa `Origin`/`X-Forwarded-Host` de la petición (`app/actions/auth.ts:53-60,84`) | 2026-11-04 |
| App | Acciones sin datos sensibles en la respuesta | ✅ | `AuthState` solo devuelve alias propio o email propio; `SubmitScoreResult` sin datos | 2026-11-04 |
| App | `/api/contact` | ⚠️ | Validación, honeypot, envío como `text` y errores genéricos OK (`app/api/contact/route.ts`); sin límite de frecuencia | 2026-11-04 |
| App | `/api/health` sin filtrar detalles | ✅ | Solo `ok/db/auth/time` o mensajes fijos (`app/api/health/route.ts`) | 2026-11-04 |
| App | `/auth/confirm` sin redirección abierta | ⚠️ | Redirige solo a `/` o `/login?error=enlace` (`app/auth/confirm/route.ts:27`); `type` sin lista blanca (`:11`) | 2026-11-04 |
| App | Clientes de Supabase solo con clave publicable | ✅ | `lib/supabase/client.ts`, `server.ts`, `public.ts`, `proxy.ts` usan `getSupabaseEnv()` | 2026-11-04 |
| App | `proxy.ts` solo refresca la sesión | ✅ | `lib/supabase/proxy.ts:27` `getClaims()`, sin protección de rutas | 2026-11-04 |
| App | XSS / inyección | ✅ | Sin `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`; consultas con el cliente | 2026-11-04 |
| Dependencias | `npm audit --omit=dev` | ✅ | 0 vulnerabilidades | 2026-11-04 |
| Dependencias | Versiones | ✅ | next 16.4.2, react 19.3.0, @supabase/supabase-js 2.118.0, @supabase/ssr 0.12.7, resend 6.34.1 | 2026-11-04 |

Leyenda: `✅` cumple · `⚠️` hallazgo medio o bajo · `❌` hallazgo crítico o alto · `aceptado` riesgo aceptado con su spec de origen · `manual` pendiente de confirmación del usuario en el dashboard · `—` no revisado.

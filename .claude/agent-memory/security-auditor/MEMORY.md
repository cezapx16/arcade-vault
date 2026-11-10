# Memoria de security-auditor

## Registro de auditorías

| Fecha      | Modo     | Críticos | Altos | Medios | Bajos | Avisos de advisors (seguridad / rendimiento)   | Notas                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------- | -------- | -------- | ----- | ------ | ----- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-04 | completa | 0        | 0     | 2      | 5     | 1 WARN (`auth_leaked_password_protection`) / 0 | Primera auditoría, rama spec-16 (pasos 1, 2, 4). Medios: `emailRedirectTo` desde cabeceras (`requestOrigin`) y `/api/contact` sin límite. `npm run build` falló con "Another next build process is already running" (había un `next dev` del usuario en :3000); se usó el build existente con `next start -p 3100`.                                                                                                                         |
| 2026-11-10 | app      | 0        | 0     | 1      | 2     | — (modo app)                                   | Rama spec-17. Cerrados: `emailRedirectTo` (ahora `SITE_URL`), enumeración de emails en `signUp`, `type` sin lista blanca en `/auth/confirm`. Siguen: `/api/contact` sin límite (medio), 308 de `/juegos` sin cabeceras (bajo), `getSiteUrl()` devuelve el valor crudo y no `url.origin` (bajo). Nueva fila manual: `SITE_URL` en el hosting. Ruta nueva `/animal-counter` (cliente estático, sin impacto). Build y `next start -p 3100` OK. |

## Línea base de la base de datos

- Tablas de `public` (todas con RLS, sin `force`): `games`, `scores`, `profiles`. Vista `game_stats` con `security_invoker=true`.
- Políticas: `games` SELECT anon+auth; `profiles` SELECT anon+auth; `scores` SELECT anon+auth e INSERT anon+auth `with check (true)` (aceptado). Nada más.
- Grants de tabla: anon y authenticated con todos los privilegios por defecto en las 3 tablas y la vista (normal en Supabase con RLS).
- Funciones ejecutables por anon/authenticated (todas invoker, `search_path=''`): `health_check`, `leaderboard(text,int)`, `player_best(text,text)`, `alias_available(text)`.
- `security definer` sin EXECUTE para clientes: `handle_new_user` (`search_path=''`), `rls_auto_enable` (`search_path=pg_catalog`).
- Triggers: `on_auth_user_created` (auth.users → handle_new_user); event trigger `ensure_rls` (ddl_command_end → rls_auto_enable, `O`).
- Migraciones: 9 en repo = 9 aplicadas por nombre; última `revoke_rls_auto_enable` (versión aplicada 20261104223036; las versiones aplicadas no coinciden con el timestamp del archivo, es normal).
- Extensiones: ninguna en `public`. Storage: 0 buckets. Auth: 2 usuarios (1 sin confirmar), 2 perfiles.

## Riesgos aceptados

| Riesgo                                                                                                   | Origen     | Condición para revisarlo                                    |
| -------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------- |
| `scores` admite inserción pública (`anon`) por REST con la clave publicable; solo la limitan los `check` | SPEC 15/16 | Cuando se ligue `scores` a la cuenta                        |
| Un invitado puede guardar puntuaciones con el alias de otra cuenta                                       | SPEC 15    | Cuando se ligue `scores` a la cuenta                        |
| Límite de sign-ups/sign-ins por IP global en la práctica (Server Actions → IP del servidor)              | SPEC 16    | Spec de captcha o límite propio                             |
| Sin captcha en registro ni inicio de sesión                                                              | SPEC 16    | Spec de captcha                                             |
| Sin CSP ni HSTS en Next (HSTS lo pone el hosting)                                                        | SPEC 16    | Spec de CSP / despliegue                                    |
| `auth_leaked_password_protection` desactivada si el plan es Free                                         | SPEC 16    | Si el plan pasa a Pro (plan aún sin confirmar a 2026-11-04) |
| Cuentas sin confirmar retienen su alias indefinidamente                                                  | SPEC 15    | Si crecen las cuentas sin confirmar                         |

## Confirmaciones manuales del dashboard

- (ninguna todavía; a 2026-11-10 siguen pendientes: mínimo 8, rate limits, plan/leaked password, confirmación de email, plantilla Confirm signup, Redirect URLs y `SITE_URL` en el hosting — SPEC 17 paso 4 aplazado por el usuario)

## Preferencias del usuario

- Distinguir siempre los riesgos aceptados de las specs 15 y 16 en el informe.
- Para cada hallazgo: archivo/objeto, impacto, arreglo propuesto y si merece spec nueva.

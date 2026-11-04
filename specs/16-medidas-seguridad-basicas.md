# SPEC 16 — Medidas de seguridad básicas

> **Estado:** aprobado
> **Depende de:** SPEC 04, SPEC 06, SPEC 15
> **Fecha:** 2026-11-04
> **Objetivo:** Cerrar el checklist de `references/security/security-checklist.md` con cabeceras de seguridad en Next, la configuración de contraseñas y límites de Supabase Auth, y los avisos de seguridad del panel de Supabase.

## Por qué existe esta spec

El checklist pide cinco cosas y revisar el panel de avisos de Supabase. Al revisarlo el 2026-11-04, el estado era este:

- **RLS:** ya está activado en `games`, `scores` y `profiles`. Solo hace falta comprobarlo y dejarlo documentado.
- **Contraseña mínima:** `app/actions/auth.ts` ya exige 8 caracteres (`MIN_PASSWORD`). El dashboard de Auth todavía no impone ese mínimo.
- **Leaked password protection:** está desactivada. Es el aviso `auth_leaked_password_protection`.
- **Límite de signups:** el registro pasa por la Server Action `signUp`. Supabase ve la IP del servidor de Next, no la del jugador.
- **Cabeceras:** `next.config.ts` no define ninguna, y `X-Powered-By: Next.js` sale por defecto.
- **Panel de Supabase:** hay 3 avisos de seguridad y ninguno de rendimiento. Uno es la leaked password protection. Los otros dos son de `public.rls_auto_enable()`, la función `security definer` del event trigger `ensure_rls`. La creó Supabase, no está en nuestras migraciones, y `anon` y `authenticated` pueden ejecutarla por `/rest/v1/rpc/rls_auto_enable`.

## Alcance

**Entra:**

- **Cabeceras de seguridad** en todas las rutas, desde `headers()` de `next.config.ts`: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy`.
- **Sin `X-Powered-By`:** `poweredByHeader: false` en `next.config.ts`.
- **Migración** que quita `EXECUTE` sobre `public.rls_auto_enable()` a `public`, `anon` y `authenticated`.
- **Comprobación de RLS** en `games`, `scores` y `profiles`, sin cambiar las políticas.
- **Configuración manual del dashboard de Auth**, hecha por el usuario:
  - Mínimo de 8 caracteres y sin requisitos de tipos de carácter.
  - Límite de sign-ups y sign-ins por IP con el valor por defecto (30 cada 5 minutos).
  - Leaked password protection, solo si el plan lo permite.
- **Documentación:**
  - Sección "Seguridad" en `README.md`.
  - Cabeceras y checklist en `CLAUDE.md`.
  - Casillas marcadas en `references/security/security-checklist.md`.

**Fuera de alcance (para otras specs):**

- Content Security Policy (CSP).
- `Strict-Transport-Security`, que lo pone el hosting.
- Captcha anti-bot (Turnstile o hCaptcha) en el registro y el inicio de sesión.
- Límite por IP propio de la app (en la Server Action o en Postgres).
- Cerrar la inserción pública de `scores`: insertar solo a través de una función, ligar las puntuaciones a la cuenta o limitar cuántas se envían.
- Requisitos de complejidad de la contraseña (mayúsculas, dígitos o símbolos).
- Avisos de rendimiento del panel, porque ahora no hay ninguno.
- Tests automatizados.

## Modelo de datos

No hay tablas ni columnas nuevas. Solo hay una migración de permisos.

### Migración `supabase/migrations/20261104000000_revoke_rls_auto_enable.sql`

```sql
-- rls_auto_enable() es la función del event trigger ensure_rls (creada por Supabase).
-- Un event trigger se dispara sin necesitar EXECUTE, así que ensure_rls sigue activando RLS en las tablas nuevas de public.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
```

- La firma de la función no cambia. No hace falta regenerar `lib/supabase/database.types.ts`.

### Cabeceras (`next.config.ts`)

| Cabecera                 | Valor                                      |
| ------------------------ | ------------------------------------------ |
| `X-Content-Type-Options` | `nosniff`                                  |
| `X-Frame-Options`        | `DENY`                                     |
| `Referrer-Policy`        | `strict-origin-when-cross-origin`          |
| `Permissions-Policy`     | `camera=(), microphone=(), geolocation=()` |

- Se aplican con `source: "/(.*)"`, junto a los `redirects()` que ya existen.
- `poweredByHeader: false` hace que no se envíe `X-Powered-By`.

## Plan de implementación

1. **Cabeceras.**
   - En `next.config.ts`, añadir la constante `securityHeaders` con las cuatro cabeceras, `headers()` con `source: "/(.*)"` y `poweredByHeader: false`. Antes, leer `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/headers.md` y `poweredByHeader.md`.
   - Verificar con `npm run build && npm start` y `curl -I` en `/`, `/games` y `/api/health`.
2. **Migración y avisos de Supabase.**
   - Escribir `supabase/migrations/20261104000000_revoke_rls_auto_enable.sql` y aplicarla con `apply_migration`, con el mismo nombre. Comprobarla con `list_migrations`.
   - Revisar `get_advisors` (seguridad y rendimiento).
   - Comprobar con SQL que `games`, `scores` y `profiles` tienen `relrowsecurity = true`, y que sus políticas son las mismas que antes.
3. **Dashboard de Auth (manual, lo hace el usuario).**
   - Authentication → Providers → Email → "Minimum password length": `8`. "Password requirements": sin requisitos.
   - Authentication → Rate Limits: comprobar que el límite de sign-ups y sign-ins por IP está en el valor por defecto (30 cada 5 minutos).
   - Authentication → Providers → Email → "Leaked password protection":
     - Plan Pro o superior: activarla.
     - Plan Free: no está disponible. El aviso queda aceptado y se documenta.
   - Volver a revisar `get_advisors`.
4. **Documentación.**
   - Sección "Seguridad" en `README.md` con:
     - Las cabeceras.
     - Los pasos manuales del paso 3.
     - El plan del proyecto y si la leaked password protection está activa.
     - Que el límite por IP es global en la práctica, porque `signUp` y `signIn` llaman a Supabase desde el servidor.
   - En `CLAUDE.md`:
     - Añadir las cabeceras y `poweredByHeader` a "Stack and non-default configuration".
     - Añadir `references/security/security-checklist.md` a la lista de documentos vivos editables.
   - Marcar las casillas de `references/security/security-checklist.md`. Si la leaked password protection no se puede activar, la casilla se queda sin marcar con la nota "no disponible en plan Free".

## Criterios de aceptación

- [ ] `curl -I` contra `npm start` en `/`, `/games` y `/api/health` devuelve `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` y `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- [ ] Ninguna de esas respuestas incluye `X-Powered-By`.
- [ ] Las redirecciones `/juegos/:id` → `/games/:id` siguen funcionando.
- [ ] La migración `20261104000000_revoke_rls_auto_enable` aparece en `list_migrations`.
- [ ] `get_advisors` (seguridad) ya no muestra `anon_security_definer_function_executable` ni `authenticated_security_definer_function_executable` para `rls_auto_enable`.
- [ ] El event trigger `ensure_rls` sigue existiendo y apunta a `rls_auto_enable` (`pg_event_trigger`).
- [ ] `games`, `scores` y `profiles` tienen RLS activado. Sus políticas son las mismas que antes de la spec.
- [ ] Registrarse con una contraseña de 7 caracteres sigue mostrando "LA CONTRASEÑA NECESITA 8 CARACTERES".
- [ ] El dashboard de Auth muestra un mínimo de 8 caracteres, sin requisitos de tipos de carácter.
- [ ] El aviso `auth_leaked_password_protection` desaparece (plan Pro), o queda documentado como aceptado en `README.md` (plan Free).
- [ ] En el navegador, con `npm start`, funcionan los cinco juegos reales, `/login` (entrar y registrarse), el formulario de `/about` y el Salón de la Fama, sin errores nuevos en la consola.
- [ ] `README.md` tiene la sección "Seguridad". `CLAUDE.md` menciona las cabeceras y el checklist.
- [ ] Las casillas de `references/security/security-checklist.md` reflejan el estado final.
- [ ] `npm run build` y `npm run lint` terminan sin errores.

## Decisiones

- **Sí:** las 3 cabeceras del checklist, más `Permissions-Policy` y `poweredByHeader: false`. Son baratas y la app no usa la cámara, el micrófono ni la geolocalización.
- **No:** CSP en esta spec. Con nonces obliga a renderizar todo dinámicamente y choca con Cache Components y el prerender. Irá en su propia spec.
- **No:** HSTS en `next.config.ts`. Lo pone el hosting con HTTPS, y en local con `http://localhost` no aplica.
- **Sí:** `X-Frame-Options: DENY`. Arcade Vault no se incrusta en iframes de ningún sitio.
- **Sí:** el límite de sign-ups y sign-ins de Supabase con el valor por defecto, documentando que es global. `signUp` y `signIn` son Server Actions y Supabase solo ve la IP del servidor.
- **No:** captcha ni límite por IP propio de la app en esta spec. El captcha es la protección anti-bot real y necesita su propia spec (claves, widget en `AuthCard` y `captchaToken`).
- **Sí:** leaked password protection solo si el plan lo permite. En Free el aviso se acepta y se documenta.
- **Sí:** solo la longitud mínima de 8 caracteres en el dashboard, igual que `MIN_PASSWORD` en `signUp`. Así los dos sitios coinciden y los mensajes no cambian.
- **Sí:** quitar `EXECUTE` a `rls_auto_enable()` en vez de borrar la función o el event trigger. `ensure_rls` es una red útil para las tablas nuevas, y nadie necesita llamarla por RPC.
- **No:** tocar la inserción pública de `scores`. El checklist no la pide, y su arreglo natural es la spec que ligue las puntuaciones a la cuenta.
- **Sí:** `references/security/security-checklist.md` pasa a ser un documento vivo editable, como los demás estados de `references/`.

## Riesgos

| Riesgo                                                                                                                | Mitigación                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Todos los registros salen de la IP del servidor, así que 30 registros en 5 minutos bloquean a cualquier jugador nuevo | El tráfico actual es bajo. El 429 ya se muestra como "DEMASIADOS INTENTOS, ESPERA UN POCO". El límite queda documentado y el captcha va en otra spec. |
| Cualquiera con la clave publicable puede insertar puntuaciones directamente por REST                                  | Los `check` de `scores` limitan el formato. Se acepta hasta la spec que ligue `scores` a la cuenta.                                                   |
| Quitar `EXECUTE` rompe el event trigger `ensure_rls`                                                                  | Un event trigger no comprueba `EXECUTE` al dispararse. Se comprueba que `ensure_rls` sigue existiendo y, si hiciera falta, se revierte con `grant`.   |
| La leaked password protection no está disponible en el plan Free                                                      | Se deja el aviso aceptado y documentado en `README.md`. La casilla queda sin marcar con una nota.                                                     |
| `X-Frame-Options: DENY` o `Permissions-Policy` rompen algo (vista previa embebida, API del navegador)                 | Paso de verificación en el navegador con los cinco juegos, login, contacto y Salón de la Fama.                                                        |
| Los pasos del dashboard no se hacen                                                                                   | Son un paso explícito del plan (paso 3), documentado en `README.md`, y `get_advisors` lo delata.                                                      |

## Qué **no** entra en esta spec

- Content Security Policy.
- HSTS en Next.
- Captcha en el registro o el inicio de sesión.
- Límite por IP propio de la app.
- Cerrar la inserción pública de `scores`.
- Requisitos de complejidad de la contraseña.

Cada uno de estos puntos, si llega, irá en su propia spec.

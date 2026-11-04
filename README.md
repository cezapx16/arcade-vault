## Arcade Vault

Es una plataforma para jugar online y competir por la mayor cantidad de puntos.

## Usa Spec Driven Design

Basado en /spec y /spec-impl

Siguiendo las buenas practicas recomendadas aquí:
https://github.com/Klerith/fernando-skills

## Skills usadas

```bash
npx skills@latest add Klerith/fernando-skills
```

## Commands

- `npm run dev` — dev server (Turbopack)
- `npm run build` — production build (also the type-check, since `tsconfig` has `noEmit`)
- `npm run lint` — ESLint 9 flat config (`eslint-config-next` core-web-vitals + typescript)

## Supabase

Supabase es el backend de base de datos y autenticación (proyecto `kzkpuodqsexbszdlehap`): catálogo, rankings y cuentas de jugador. Sin variables de entorno la app usa los datos de `app/data/` y no permite iniciar sesión.

### Variables de entorno

Copia `.env.example` a `.env.local` y rellena:

- `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto (`https://<ref>.supabase.co`).
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — publishable key (`sb_publishable_...`), en _Project Settings → API Keys_.

Nunca pongas la `service_role` ni una `sb_secret_...` en estas variables: las `NEXT_PUBLIC_*` llegan al navegador.

Si faltan, la app funciona igual y solo `GET /api/health` responde `500 SERVICIO NO CONFIGURADO`. Con ellas, `GET /api/health` comprueba la base de datos y Auth.

### Clientes

- `lib/supabase/client.ts` — para componentes `"use client"`.
- `lib/supabase/server.ts` — para Server Components, Route Handlers y Server Actions (`await createClient()`).
- `proxy.ts` — refresca la sesión de Auth en cada petición; no protege rutas.

### Migraciones

Las migraciones son archivos SQL en `supabase/migrations/` (`AAAAMMDDHHMMSS_nombre.sql`), versionados en git. Se aplican al proyecto remoto con el MCP de Supabase (`apply_migration`, con el mismo nombre que el archivo) y se comprueban con `list_migrations`. Después, revisa `get_advisors` (seguridad).

### Tipos

`lib/supabase/database.types.ts` se genera desde el esquema con `generate_typescript_types` del MCP. Regenéralo y sobrescribe el archivo cada vez que una migración cambie el esquema.

## Autenticación

Cuentas reales con Supabase Auth (SPEC 15): email + contraseña, con confirmación por correo, y un alias arcade único.

- **Registro** (`/login?tab=registro`): alias, email, contraseña (8 caracteres como mínimo) y confirmación. El alias se pasa a mayúsculas y tiene que cumplir `^[A-Z0-9_]{1,10}$`. Supabase envía un correo con el enlace de confirmación.
- **Alias:** tabla `public.profiles` (`id` = `auth.users.id`, `name` único), creada por el trigger `on_auth_user_created` con los metadatos del registro. Lectura pública; nadie escribe desde el cliente. `alias_available(p_name)` comprueba el alias antes del registro.
- **Inicio de sesión** con email + contraseña (no con el alias). **Cierre de sesión** desde el botón con el alias del nav o "Cerrar sesión" en el menú móvil.
- **Server Actions** en `app/actions/auth.ts` (`signUp`, `signIn`, `signOut`), con el cliente SSR. Validan en el servidor y traducen los errores de Supabase a mensajes en español.
- **Confirmación:** `app/auth/confirm/route.ts` canjea el `token_hash` del correo (`verifyOtp`), inicia sesión y redirige a `/`. Si el enlace no vale, a `/login?error=enlace`.
- **En el cliente**, `lib/session.ts` expone `useUser()` (`{ name } | null`, leído de la sesión y de `profiles`) y `refreshUser()`, que hay que llamar tras `signIn`/`signOut` porque las cookies las cambia el servidor.
- `/login` con sesión redirige a `/`. Ninguna ruta está protegida: se puede jugar y guardar puntuaciones como invitado, y las puntuaciones aún no se ligan a la cuenta.

### Configuración del dashboard (manual)

Hay que hacerla una vez por proyecto de Supabase; sin ella, el enlace del correo no funciona y se ve "EL ENLACE NO ES VÁLIDO O HA CADUCADO".

1. **Authentication → Sign In / Providers → Email:** "Confirm email" activado (opción por defecto).
2. **Authentication → Email Templates → "Confirm signup":** el enlace del cuerpo pasa a

   ```html
   <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email"
     >Confirmar mi email</a
   >
   ```

   `{{ .RedirectTo }}` es el `emailRedirectTo` que manda `signUp` (`<origin>/auth/confirm`, calculado desde la petición), así que sirve igual en local y en producción sin tocar el Site URL.

3. **Authentication → URL Configuration → Redirect URLs:** añade `http://localhost:3000/**` y la URL de producción (`https://<dominio>/**`).

### Límites del SMTP de Supabase

Los correos de Auth salen del SMTP integrado de Supabase, pensado solo para pruebas: tiene un límite muy bajo de correos por hora y puede restringir los destinatarios. Prueba con pocas cuentas; si se supera, la tarjeta muestra "DEMASIADOS INTENTOS, ESPERA UN POCO". Un SMTP propio (por ejemplo, Resend) queda para otra spec.

## Seguridad

Medidas básicas de la SPEC 16. El estado de cada punto está en `references/security/security-checklist.md`.

### Cabeceras

`next.config.ts` añade estas cabeceras a todas las rutas (`headers()` con `source: "/(.*)"`) y desactiva `X-Powered-By` con `poweredByHeader: false`:

| Cabecera                 | Valor                                      |
| ------------------------ | ------------------------------------------ |
| `X-Content-Type-Options` | `nosniff`                                  |
| `X-Frame-Options`        | `DENY`                                     |
| `Referrer-Policy`        | `strict-origin-when-cross-origin`          |
| `Permissions-Policy`     | `camera=(), microphone=(), geolocation=()` |

No hay Content Security Policy (irá en su propia spec) ni `Strict-Transport-Security`, que lo pone el hosting con HTTPS.

### Base de datos

- RLS activado en `games`, `scores` y `profiles`. El event trigger `ensure_rls` de Supabase lo activa en las tablas nuevas de `public`.
- `anon` y `authenticated` no pueden ejecutar `public.rls_auto_enable()`, la función de ese event trigger (migración `revoke_rls_auto_enable`). El trigger sigue funcionando porque no necesita `EXECUTE`.
- `scores` sigue aceptando inserciones públicas (con los `check` de formato). Se cerrará en la spec que ligue las puntuaciones a la cuenta.

### Configuración del dashboard de Auth (manual)

1. **Authentication → Providers → Email:** "Minimum password length" en `8` y "Password requirements" sin requisitos, igual que `MIN_PASSWORD` en `signUp`.
2. **Authentication → Rate Limits:** límite de sign-ups y sign-ins por IP en el valor por defecto (30 cada 5 minutos).
3. **Authentication → Providers → Email → "Leaked password protection":** solo existe en el plan Pro o superior. En el plan Free no se puede activar y el aviso `auth_leaked_password_protection` del panel queda aceptado.

Estado a 2026-11-04: la leaked password protection está desactivada (`get_advisors` sigue mostrando el aviso) y el plan del proyecto está sin confirmar.

### Límite por IP

`signUp` y `signIn` son Server Actions, así que Supabase ve la IP del servidor de Next y no la del jugador. En la práctica el límite de 30 cada 5 minutos es global para toda la app. Al superarlo, la tarjeta muestra "DEMASIADOS INTENTOS, ESPERA UN POCO". La protección anti-bot real (captcha) irá en su propia spec.

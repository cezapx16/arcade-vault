# SPEC 17 — Endurecer la autenticación

> **Estado:** aprobado
> **Depende de:** SPEC 15, SPEC 16
> **Fecha:** 2026-11-10
> **Objetivo:** Cerrar los hallazgos de la revisión de seguridad de la autenticación del 2026-11-10: el enlace del correo sale de un origen fijo, el registro deja de revelar si un email tiene cuenta y `/auth/confirm` solo acepta el tipo `email`.

## Por qué existe esta spec

La revisión de la autenticación del 2026-11-10 encontró estos puntos. Coinciden con las filas ⚠️ de `references/security/security-status.md`:

1. **`emailRedirectTo` sale de cabeceras que manda el cliente.**
   - `requestOrigin()` (`app/actions/auth.ts:53-60`) arma el enlace con `Origin`, `X-Forwarded-Host` o `Host`.
   - Un atacante puede registrar una cuenta, incluso con el email de otra persona, mandando un `Origin` propio.
   - El correo llevaría entonces el `token_hash` a su dominio.
   - Lo único que lo frena son las Redirect URLs del dashboard, y no está confirmado que estén limitadas.
2. **El registro revela si un email tiene cuenta.**
   - Con la confirmación activada, Supabase no da error para un email ya registrado: devuelve `identities: []`. Esa es su protección anti-enumeración.
   - `signUp` detecta ese caso (`auth.ts:98-100`), y también los códigos `user_already_exists` / `email_exists` (`auth.ts:41-43`), y responde "ESE EMAIL YA TIENE CUENTA".
   - Así cualquiera puede comprobar qué emails tienen cuenta.
3. **La contraseña mínima de 8 solo la exige la Server Action.**
   - Con la clave publicable se puede llamar directamente a `/auth/v1/signup`.
   - El mínimo real es el que esté configurado en el dashboard (SPEC 16, paso 3), y eso no está confirmado.
4. **`type` sin lista blanca en `/auth/confirm`.**
   - `app/auth/confirm/route.ts:11` hace un cast directo a `EmailOtpType`.
   - `verifyOtp` acepta también `recovery`, `magiclink` o `email_change`, y en ese caso deja la sesión iniciada.

El hallazgo 5 queda fuera: el rate limit es global porque Supabase solo ve la IP del servidor. Ya está aceptado en la SPEC 16.

## Alcance

**Entra:**

- **Origen fijo del enlace del correo:**
  - Variable de servidor nueva `SITE_URL`, sin `NEXT_PUBLIC_`.
  - Se lee en `lib/site-url.ts`.
  - `requestOrigin()` y el uso de `headers()` en `app/actions/auth.ts` desaparecen.
- **Sin `SITE_URL`:**
  - En `development` se usa `http://localhost:3000`.
  - En producción, `signUp` responde "SERVICIO NO DISPONIBLE" y escribe un `console.error`.
- **Anti-enumeración en `signUp`:**
  - Se devuelve siempre `check-email` cuando el email ya existe (`identities: []`, `user_already_exists`, `email_exists`).
  - `MSG.emailTaken` se elimina.
- **Texto nuevo de la pantalla "REVISA TU CORREO"** en `components/auth-card.tsx`.
- **Lista blanca de `type` en `/auth/confirm`:**
  - Solo se acepta `email`.
  - Cualquier otro valor redirige a `/login?error=enlace` sin llamar a `verifyOtp`.
- **Comprobación manual en el dashboard (la hace el usuario):**
  - Contraseña mínima de 8.
  - Redirect URLs limitadas a local y producción.
  - `SITE_URL` definida en el hosting.
- **Documentación:**
  - `.env.example`.
  - Sección Autenticación de `README.md`.
  - Línea de `signUp` en `CLAUDE.md`.
- **Estado de seguridad:** al terminar, pasar `security-auditor` en modo `app` para actualizar `references/security/security-status.md`.

**Fuera de alcance (para otras specs):**

- Captcha en el registro y el inicio de sesión.
- Límite por IP propio de la app (hallazgo 5, aceptado en la SPEC 16).
- Ocultar si un alias está en uso. Los alias ya son públicos en los rankings y en `profiles`.
- Recuperación de contraseña (`recovery`) y cambio de email (`email_change`). Si llegan, ampliarán la lista blanca de `/auth/confirm` en su propia spec.
- SMTP propio para los correos de Auth.
- Content Security Policy y HSTS.
- Tests automatizados.

## Modelo de datos

No hay tablas, columnas ni migraciones nuevas. `lib/supabase/database.types.ts` no cambia.

### Variable de entorno

```bash
# .env.example — origen público de la app para el enlace del correo de confirmación.
# Sin barra final. En local: http://localhost:3000. En producción: https://<dominio>.
SITE_URL=
```

- Es de servidor: nunca lleva `NEXT_PUBLIC_` y no llega al bundle del cliente.

### `lib/site-url.ts`

```ts
// Origen fijo de la app (sin barra final), o null si no está configurado en producción.
export function getSiteUrl(): string | null;
```

- Lee `process.env.SITE_URL`, hace `trim()` y le quita la barra final.
- Comprueba que es una URL `http:` o `https:` con `new URL()`. Si no lo es, la trata como si faltara.
- Sin valor válido:
  - Con `NODE_ENV === "development"` devuelve `http://localhost:3000`.
  - En otro caso devuelve `null`.

### `AuthState`

El tipo no cambia. Cambia cuándo se devuelve cada estado:

| Caso en `signUp`                             | Antes                               | Después                          |
| -------------------------------------------- | ----------------------------------- | -------------------------------- |
| `data.user.identities` vacío                 | `error` "ESE EMAIL YA TIENE CUENTA" | `check-email`                    |
| Error `user_already_exists` / `email_exists` | `error` "ESE EMAIL YA TIENE CUENTA" | `check-email`                    |
| `getSiteUrl()` es `null`                     | (no existía)                        | `error` "SERVICIO NO DISPONIBLE" |

### Texto de "REVISA TU CORREO"

> Si ese email no tenía cuenta, te hemos enviado un enlace de confirmación a **{email}**. Ábrelo para activar tu cuenta y vuelve para entrar.

## Plan de implementación

1. **Origen fijo.**
   - Crear `lib/site-url.ts` con `getSiteUrl()`.
   - En `signUp`, llamar a `getSiteUrl()` justo después de comprobar `getSupabaseEnv()`. Si es `null`, escribir `console.error("[auth] signUp: falta SITE_URL")` y devolver `MSG.unavailable`.
   - Usar `` `${siteUrl}/auth/confirm` `` en `emailRedirectTo`.
   - Borrar `requestOrigin()` y el import de `headers`.
   - Añadir `SITE_URL` a `.env.example` y a `.env.local` (`http://localhost:3000`).
   - Prueba manual: registrarse en local y comprobar que el enlace del correo apunta a `http://localhost:3000/auth/confirm`.
2. **Anti-enumeración.**
   - En `signUp`, si `data.user?.identities?.length === 0`, devolver `{ status: "check-email", email }`.
   - En la rama de error, si `error.code` es `user_already_exists` o `email_exists`, devolver también `check-email`, antes de `authMessage()`.
   - Quitar esos dos códigos de `authMessage()` y borrar `MSG.emailTaken`.
   - Cambiar el texto de `RegisterForm` en `components/auth-card.tsx` por el del modelo de datos.
   - Prueba manual: registrarse con un email que ya tiene cuenta muestra "REVISA TU CORREO".
3. **Lista blanca en `/auth/confirm`.**
   - En `app/auth/confirm/route.ts`, sustituir el cast por la constante `ALLOWED_TYPES` con `["email"]`.
   - Solo se llama a `verifyOtp` si `type` está en esa lista. Si no, `ok` se queda en `false`.
   - Prueba manual: `/auth/confirm?token_hash=x&type=recovery` redirige a `/login?error=enlace`.
4. **Dashboard y hosting (manual, lo hace el usuario).**
   - Authentication → Providers → Email → "Minimum password length": confirmar `8`.
   - Authentication → URL Configuration → Redirect URLs: dejar solo `http://localhost:3000/**` y `https://<dominio>/**`.
   - Definir `SITE_URL=https://<dominio>` en las variables de entorno del hosting de producción.
   - Comprobar el mínimo con una petición directa a `/auth/v1/signup` (con la clave publicable y una contraseña de 7 caracteres): debe responder `422 weak_password`.
5. **Documentación y estado.**
   - `README.md`, sección Autenticación:
     - `{{ .RedirectTo }}` es `SITE_URL` + `/auth/confirm`, ya no el origen de la petición.
     - Añadir `SITE_URL` a la lista de variables.
     - Documentar el nuevo comportamiento ante un email ya registrado.
   - `CLAUDE.md`:
     - En `app/actions/auth.ts`, `emailRedirectTo` = `` `${SITE_URL}/auth/confirm` ``.
     - Añadir `SITE_URL` a "Env vars".
     - Indicar que `/auth/confirm` solo acepta `type=email`.
   - Lanzar `security-auditor` en modo `app` para que actualice `references/security/security-status.md`.

## Criterios de aceptación

- [ ] `app/actions/auth.ts` no importa `headers` ni lee `Origin`, `Host` ni `X-Forwarded-*`.
- [ ] `SITE_URL` aparece en `.env.example` y en ningún sitio con prefijo `NEXT_PUBLIC_`.
- [ ] En local, con `SITE_URL=http://localhost:3000`, el correo de confirmación enlaza a `http://localhost:3000/auth/confirm?token_hash=…&type=email`.
- [ ] Al repetir la petición de la Server Action de registro (copiada como cURL desde DevTools) con `-H "Origin: https://evil.com" -H "X-Forwarded-Host: evil.com"`, el enlace del correo sigue apuntando a `SITE_URL`, o la petición la rechaza Next.
- [ ] Con `npm start` y sin `SITE_URL`, registrarse muestra "SERVICIO NO DISPONIBLE" y el servidor escribe `[auth] signUp: falta SITE_URL`.
- [ ] Registrarse con un email que ya tiene cuenta muestra la pantalla "REVISA TU CORREO", con el texto nuevo.
- [ ] El texto "ESE EMAIL YA TIENE CUENTA" no aparece en el código.
- [ ] Registrarse con un alias en uso sigue mostrando "ESE ALIAS YA ESTÁ EN USO".
- [ ] El registro normal (alias, email y contraseña nuevos) sigue enviando el correo, y el enlace inicia sesión y lleva a `/`.
- [ ] `/auth/confirm?token_hash=x&type=recovery` y `/auth/confirm?token_hash=x&type=magiclink` redirigen a `/login?error=enlace`.
- [ ] Una petición directa a `/auth/v1/signup` con una contraseña de 7 caracteres responde `422` con `weak_password`.
- [ ] Las Redirect URLs del dashboard solo contienen las de local y producción.
- [ ] `README.md` y `CLAUDE.md` describen `SITE_URL` y la lista blanca de `/auth/confirm`.
- [ ] `references/security/security-status.md` muestra ✅ en "`emailRedirectTo` desde un origen fijo", "`signUp`/`signIn` validan y traducen errores" y "`/auth/confirm` sin redirección abierta".
- [ ] `npm run build` y `npm run lint` terminan sin errores.

## Decisiones

- **Sí:** `SITE_URL` como variable de servidor. Es un solo valor por entorno, no depende de nada que mande el cliente y no hace falta en el bundle.
- **No:** una lista blanca de orígenes (`AUTH_ALLOWED_ORIGINS`) comprobada contra `Origin`. Sigue dependiendo de cabeceras del cliente y añade lógica que no hace falta con un único dominio.
- **Sí:** `http://localhost:3000` por defecto solo en `development`. Así el desarrollo local no exige configurar nada.
- **Sí:** en producción, sin `SITE_URL`, el registro falla con "SERVICIO NO DISPONIBLE". Nunca vuelve a calcular el enlace desde las cabeceras.
- **Sí:** devolver siempre `check-email` ante un email ya registrado. Recupera la protección anti-enumeración de Supabase.
- **Sí:** el texto "Si ese email no tenía cuenta…". Quien ya tiene cuenta no espera un correo que no llega.
- **No:** ocultar si un alias está en uso. Los alias ya son públicos en los rankings y en `profiles`, así que no se filtra nada nuevo.
- **Sí:** aceptar solo `type=email` en `/auth/confirm`. Es el único que usa la plantilla documentada en `README.md`.
- **No:** aceptar `signup` por compatibilidad con la plantilla por defecto de Supabase. La plantilla del proyecto ya usa `email`.
- **Sí:** comprobar el mínimo de contraseña con una petición directa a la API de Auth. Es la única forma de verificar que no depende solo de la Server Action.
- **No:** captcha ni rate limit propio en esta spec (hallazgo 5, aceptado en la SPEC 16).
- **Sí:** verificar con cURL y en el navegador. Playwright no conectaba en la sesión en que se escribió esta spec.

## Riesgos

| Riesgo                                                                                  | Mitigación                                                                                                                                                                   |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Se despliega a producción sin `SITE_URL` y nadie puede registrarse                      | `signUp` escribe `[auth] signUp: falta SITE_URL` en los logs. El paso 4 incluye definirla en el hosting.                                                                     |
| `SITE_URL` con barra final o con un valor mal escrito                                   | `getSiteUrl()` quita la barra final, y si el valor no es una URL `http(s)` válida lo trata como si faltara.                                                                  |
| Un usuario con cuenta piensa que se ha registrado de nuevo y espera un correo           | El texto nuevo dice "Si ese email no tenía cuenta…".                                                                                                                         |
| La lista blanca rompe enlaces de correos enviados antes con otra plantilla              | La plantilla del proyecto usa `type=email` desde la SPEC 15. Un enlace antiguo con otro tipo cae en "EL ENLACE NO ES VÁLIDO O HA CADUCADO" y basta con volver a registrarse. |
| La prueba directa de `/auth/v1/signup` crea un usuario si el mínimo no está configurado | Usar un email desechable. Si se crea, borrarlo desde Authentication → Users y configurar el mínimo.                                                                          |

## Qué **no** entra en esta spec

- Captcha en el registro o el inicio de sesión.
- Límite por IP propio de la app.
- Ocultar si un alias está en uso.
- Recuperación de contraseña y cambio de email.
- SMTP propio.
- CSP y HSTS.

Cada uno de estos puntos, si llega, irá en su propia spec.

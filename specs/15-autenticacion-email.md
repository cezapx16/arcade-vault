# SPEC 15 — Registro, inicio de sesión y autenticación con email

> **Estado:** implementado
> **Depende de:** SPEC 01, SPEC 04, SPEC 06
> **Fecha:** 2026-11-03
> **Objetivo:** Sustituir la sesión simulada de `/login` por cuentas reales de Supabase Auth (email + contraseña con confirmación por correo) con un alias arcade único guardado en `profiles`.

## Por qué existe esta spec

Hoy `/login` es un simulacro. `AuthCard` acepta cualquier envío y guarda `{ name }` en `localStorage` (`av_user`) a través de `lib/session.ts`. No hay contraseña, ni cuenta, ni nada en el servidor.

La SPEC 04 dejó preparada la infraestructura de Supabase Auth (clientes SSR y browser, y `proxy.ts` refrescando la sesión), pero dejó fuera hacer funcional `/login`. Esta spec lo hace.

Tres sitios leen el usuario con `useUser()`: el nav, `GameShell` (nombre por defecto al guardar una puntuación) y el Salón de la Fama (tu mejor marca). La API `useUser(): { name } | null` se mantiene, así que esos componentes casi no cambian. Solo cambia de dónde sale el usuario.

## Alcance

**Entra:**

- **Registro** con alias, email, contraseña y confirmación de contraseña. Supabase envía el correo de confirmación (activada, opción por defecto).
- **Alias arcade** en una tabla nueva `public.profiles`, creada por un trigger al registrarse. Regla: `^[A-Z0-9_]{1,10}$` tras pasarlo a mayúsculas. Es único.
- **Inicio de sesión** con email + contraseña. No se puede entrar con el alias.
- **Cierre de sesión** desde el nav (botón con el alias en escritorio, "Cerrar sesión" en el menú móvil).
- **Server Actions** `signUp`, `signIn` y `signOut` en `app/actions/auth.ts`, con el cliente SSR y validación en el servidor.
- **Ruta de confirmación** `app/auth/confirm/route.ts`: canjea el enlace del correo (`verifyOtp`), inicia sesión y redirige a `/`. Si el enlace es inválido o ha caducado, redirige a `/login?error=enlace`.
- **`AuthCard`** con `useActionState`: estado "PROCESANDO…", errores en español dentro de la tarjeta y pantalla "REVISA TU CORREO" tras registrarse.
- **Botones GOOGLE y GITHUB** desactivados con el texto "PRÓXIMAMENTE".
- **`lib/session.ts`** pasa a leer la sesión de Supabase y el alias de `profiles`. Mantiene `useUser()` y elimina la clave antigua `av_user` de `localStorage`.
- **`/login` con sesión** redirige a `/`.
- **Configuración del dashboard** de Supabase (plantilla del correo de confirmación y URLs de redirección), como paso manual documentado.
- **Documentación:** sección "Autenticación" en `README.md` y actualización de `CLAUDE.md`.

**Fuera de alcance (para otras specs):**

- OAuth (Google, GitHub).
- Recuperar contraseña ("¿OLVIDASTE TU CONTRASEÑA?" y pantalla de nueva contraseña).
- Entrar con el alias en lugar del email.
- Ligar las puntuaciones a la cuenta (`scores.user_id`), impedir usar un alias ajeno al guardar y cambiar la política de inserción anónima de `scores`.
- Página de cuenta o perfil, y cambiar el alias, el email o la contraseña.
- Proteger rutas en `proxy.ts`. Se sigue pudiendo jugar como invitado.
- SMTP propio (por ejemplo, Resend) para los correos de Auth.
- Volver a la página de origen tras entrar (`?next=`).
- Sincronizar la sesión entre pestañas abiertas.
- Borrar cuentas sin confirmar que retienen un alias.
- Tests automatizados.

## Modelo de datos

### Migración `supabase/migrations/20261103000000_profiles.sql`

```sql
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null unique check (name ~ '^[A-Z0-9_]{1,10}$'),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
-- Lectura pública (el alias ya es público en los rankings). Sin insert/update/delete desde clientes.
create policy "profiles: lectura pública" on public.profiles
  for select to anon, authenticated using (true);
```

- **Trigger** `on_auth_user_created` (`after insert on auth.users`) → función `public.handle_new_user()`, `security definer`, `set search_path = ''`. Inserta `(new.id, new.raw_user_meta_data->>'name')` en `profiles`.
- **Función** `public.alias_available(p_name text) returns boolean`, `security invoker` (la lectura pública de `profiles` basta y así no genera avisos en `get_advisors`), `set search_path = ''`, ejecutable por `anon` y `authenticated`. Devuelve `true` si ningún perfil tiene ese alias.
- Tras aplicarla se revisa `get_advisors` y se regenera `lib/supabase/database.types.ts`.

### Metadatos del registro

```ts
supabase.auth.signUp({
  email,
  password,
  options: {
    data: { name }, // alias ya en mayúsculas; lo lee el trigger
    emailRedirectTo: `${origin}/auth/confirm`, // origin desde headers() de la petición
  },
});
```

### Estado de las Server Actions (`app/actions/auth.ts`)

```ts
export type AuthState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "ok"; name: string } // signIn correcto, con el alias de profiles (JUGADOR si no hay perfil)
  | { status: "check-email"; email: string }; // signUp correcto
```

Validación en servidor:

- Alias: `trim().toUpperCase()`, `^[A-Z0-9_]{1,10}$`. Si `alias_available` devuelve `false`, no se llama a `signUp`.
- Email: no vacío y con formato de email.
- Contraseña: 8 caracteres como mínimo. "Confirmar contraseña" tiene que ser igual.

Mensajes (nunca se muestra el texto en inglés de Supabase):

| Caso                                                                        | Mensaje                                |
| --------------------------------------------------------------------------- | -------------------------------------- |
| Alias inválido                                                              | `ALIAS: 1–10 LETRAS, NÚMEROS O _`      |
| Alias ocupado (o violación de `unique` en el trigger)                       | `ESE ALIAS YA ESTÁ EN USO`             |
| Email vacío o sin formato de email                                          | `INTRODUCE UN EMAIL VÁLIDO`            |
| Contraseña corta / `weak_password`                                          | `LA CONTRASEÑA NECESITA 8 CARACTERES`  |
| Las contraseñas no coinciden                                                | `LAS CONTRASEÑAS NO COINCIDEN`         |
| `user_already_exists`, o `signUp` devuelve `user.identities` vacío          | `ESE EMAIL YA TIENE CUENTA`            |
| `invalid_credentials`                                                       | `EMAIL O CONTRASEÑA INCORRECTOS`       |
| `email_not_confirmed`                                                       | `CONFIRMA TU EMAIL ANTES DE ENTRAR`    |
| HTTP 429 / `over_request_rate_limit` / `over_email_send_rate_limit`         | `DEMASIADOS INTENTOS, ESPERA UN POCO`  |
| Sin variables de Supabase (`getSupabaseEnv()` es `null`) o error inesperado | `SERVICIO NO DISPONIBLE`               |
| `/login?error=enlace`                                                       | `EL ENLACE NO ES VÁLIDO O HA CADUCADO` |

### Sesión en cliente (`lib/session.ts`)

```ts
export type User = { name: string }; // sin cambios
export function useUser(): User | null; // misma API, ahora respaldada por Supabase
export function refreshUser(): Promise<void>; // vuelve a leer sesión + perfil y avisa a los suscriptores
```

- Store propio con `useSyncExternalStore`, como ahora. El snapshot de servidor sigue siendo `null`.
- Al primer `subscribe`: `auth.getSession()` con el cliente browser y, si hay sesión, `profiles.name` del usuario. También escucha `onAuthStateChange`.
- Si hay sesión pero no hay perfil, el nombre es `JUGADOR`.
- Se borra `localStorage` `av_user` una vez, al cargar.
- `signIn` y `signOut` locales desaparecen. Tras una acción correcta, el cliente llama a `refreshUser()`, porque las cookies las pone el servidor y `onAuthStateChange` no se entera.

## Plan de implementación

1. **Migración `profiles`.** Escribir `supabase/migrations/20261103000000_profiles.sql` (tabla, RLS, trigger y `alias_available`). Aplicarla con `apply_migration`, comprobar con `list_migrations`, revisar `get_advisors` y regenerar `lib/supabase/database.types.ts`. La app no cambia.
2. **Configuración del dashboard (manual, la hace el usuario) + ruta de confirmación.** En Authentication → Email Templates → "Confirm signup", el enlace pasa a `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`. En URL Configuration → Redirect URLs se añaden `http://localhost:3000/**` y la URL de producción. Crear `app/auth/confirm/route.ts` (GET con `token_hash` y `type` → `verifyOtp` → `redirect("/")`; si falla → `/login?error=enlace`).
3. **Server Actions.** Crear `app/actions/auth.ts` con `signUp`, `signIn` y `signOut`, la validación y el mapa de mensajes. Todavía no las usa nadie.
4. **`AuthCard` con las acciones.** `components/auth-card.tsx` usa `useActionState` con `signIn` o `signUp` según la pestaña. Campos con `name`, botón "PROCESANDO…" deshabilitado mientras se envía, error con `role="alert"`, pantalla "REVISA TU CORREO", GOOGLE y GITHUB desactivados con "PRÓXIMAMENTE". `components/auth-card-from-url.tsx` pasa `?error=enlace` a la tarjeta. En este paso, tras `signIn` correcto se sigue llamando al `signIn` local con el alias que devuelve la acción, para que el nav siga funcionando.
5. **`lib/session.ts` con Supabase.** Reescribir el store (sesión + `profiles`, `refreshUser`, limpieza de `av_user`). Quitar `signIn` y `signOut` locales. `AuthCard` llama a `refreshUser()` y a `router.replace("/")` tras entrar. El nav llama a la acción `signOut` y luego a `refreshUser()`. En el menú móvil, "Cuenta" pasa a ser el botón "Cerrar sesión".
6. **`/login` con sesión.** `app/login/page.tsx` comprueba la sesión en servidor (`getClaims()` dentro del `<Suspense>`, porque lee cookies con Cache Components) y redirige a `/` si la hay. Estilos de los estados nuevos de la tarjeta en `app/globals.css`, diseñados con `/frontend-design`.
7. **Documentación.** Sección "Autenticación" en `README.md` (pasos del dashboard y límites del SMTP de Supabase) y actualización de `CLAUDE.md` (sesión, `profiles` y `app/actions/auth.ts`).

## Criterios de aceptación

- [ ] La migración aparece en `list_migrations` y `get_advisors` no muestra avisos nuevos de seguridad sobre `profiles`, `handle_new_user` o `alias_available`.
- [ ] `lib/supabase/database.types.ts` incluye `profiles` y `alias_available`.
- [ ] Registrarse con un alias, un email y una contraseña válidos muestra "REVISA TU CORREO" con ese email, y crea una fila en `profiles` con el alias en mayúsculas.
- [ ] Escribir el alias en minúsculas (`ana_1`) lo guarda como `ANA_1`.
- [ ] Registrarse con un alias que ya existe muestra "ESE ALIAS YA ESTÁ EN USO" y no crea usuario en `auth.users`.
- [ ] Registrarse con un email que ya tiene cuenta muestra "ESE EMAIL YA TIENE CUENTA".
- [ ] Una contraseña de 7 caracteres muestra "LA CONTRASEÑA NECESITA 8 CARACTERES".
- [ ] Dos contraseñas distintas muestran "LAS CONTRASEÑAS NO COINCIDEN".
- [ ] Entrar antes de confirmar el email muestra "CONFIRMA TU EMAIL ANTES DE ENTRAR".
- [ ] Pinchar el enlace del correo inicia sesión y lleva a `/`, con el alias en el nav.
- [ ] Abrir `/auth/confirm` con un `token_hash` inventado lleva a `/login` y muestra "EL ENLACE NO ES VÁLIDO O HA CADUCADO".
- [ ] Entrar con una contraseña incorrecta muestra "EMAIL O CONTRASEÑA INCORRECTOS".
- [ ] Entrar con credenciales correctas lleva a `/` y el nav muestra el alias sin recargar la página.
- [ ] Recargar la página mantiene la sesión.
- [ ] Mientras se envía el formulario, el botón muestra "PROCESANDO…" y está deshabilitado.
- [ ] Ningún mensaje de error de la tarjeta está en inglés.
- [ ] Pulsar el alias en el nav cierra la sesión y el nav vuelve a "Iniciar Sesión" sin recargar.
- [ ] En el menú móvil, con sesión, aparece "Cerrar sesión" y funciona.
- [ ] Abrir `/login` con sesión redirige a `/`.
- [ ] `/login?tab=registro` sigue abriendo la pestaña REGISTRO.
- [ ] GOOGLE y GITHUB aparecen desactivados con "PRÓXIMAMENTE".
- [ ] Con sesión, el modal de fin de partida propone el alias como nombre por defecto.
- [ ] Con sesión, el Salón de la Fama muestra tu mejor marca con el alias.
- [ ] Sin sesión se puede jugar y guardar una puntuación como antes.
- [ ] Tras cargar la app, `localStorage` no contiene `av_user`.
- [ ] Sin variables de Supabase, enviar el formulario muestra "SERVICIO NO DISPONIBLE" y el resto de la app funciona.
- [ ] `npm run build` y `npm run lint` terminan sin errores.

## Decisiones

- **Sí:** solo email + contraseña. OAuth necesita apps en Google y GitHub y su propio flujo de callback, así que va en otra spec.
- **Sí:** confirmación por correo activada (opción por defecto de Supabase). Evita cuentas con emails ajenos.
- **No:** desactivar la confirmación para entrar directamente tras el registro. Más simple, pero menos seguro.
- **Sí:** alias en `public.profiles` creado por un trigger con los metadatos del registro. El alias existe desde el primer momento y no depende de que el cliente haga un segundo insert.
- **Sí:** el alias sigue la regla de `scores.name` (1–10, mayúsculas) restringida a `A-Z0-9_`, para que siempre sea un nombre válido en los rankings.
- **Sí:** `alias_available` antes de `signUp`, con el `unique` de la tabla como red. Así un alias ocupado no deja una cuenta a medias en `auth.users`.
- **No:** entrar con el alias. Requiere resolver alias → email en el servidor y expone qué alias tienen cuenta.
- **Sí:** Server Actions con el cliente SSR. Las cookies de sesión las pone el servidor y los errores se traducen en un solo sitio.
- **No:** llamar a Supabase Auth desde el cliente browser en `AuthCard`.
- **Sí:** mantener `useUser(): { name } | null`. `GameShell`, el Salón de la Fama y el nav no necesitan cambios de tipos.
- **Sí:** `refreshUser()` explícito tras cada acción. Cuando el servidor cambia las cookies, `onAuthStateChange` del cliente no se dispara.
- **Sí:** plantilla del correo con `{{ .RedirectTo }}` y `token_hash`, con `emailRedirectTo` calculado desde el `origin` de la petición. Sirve igual en local y en producción sin tocar el Site URL.
- **Sí:** tras entrar o confirmar, siempre a `/`. Volver a la página de origen (`?next=`) queda para otra spec.
- **Sí:** las puntuaciones no se ligan a la cuenta en esta spec. Cambiar `scores` y su política RLS es un cambio aparte.
- **Sí:** no se protege ninguna ruta. El invitado sigue pudiendo jugar.
- **Sí:** el botón del nav con el alias sigue cerrando sesión directamente, como ahora. Un menú desplegable de cuenta llegará con la página de cuenta.

## Riesgos

| Riesgo                                                                                                       | Mitigación                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| El SMTP integrado de Supabase tiene un límite muy bajo de correos por hora y puede limitar los destinatarios | Se prueba con pocas cuentas y el error 429 se muestra como "DEMASIADOS INTENTOS". El SMTP propio va en otra spec y queda anotado en el README. |
| La plantilla del correo o las Redirect URLs no se configuran en el dashboard                                 | Es un paso explícito del plan (paso 2), documentado en el README. Sin él, el enlace falla y se ve "EL ENLACE NO ES VÁLIDO O HA CADUCADO".      |
| Con confirmación activada, Supabase no da error con un email ya registrado (protección contra enumeración)   | Se detecta con `user.identities` vacío en la respuesta de `signUp`.                                                                            |
| Dos registros simultáneos con el mismo alias pasan los dos `alias_available`                                 | El `unique` de `profiles` hace fallar el trigger. El error de `signUp` se traduce a "ESE ALIAS YA ESTÁ EN USO".                                |
| Una cuenta sin confirmar retiene el alias indefinidamente                                                    | Se acepta en esta spec. La limpieza de cuentas sin confirmar queda fuera de alcance.                                                           |
| `getClaims()` en `/login` lee cookies y, con Cache Components, rompe el prerender                            | La comprobación va dentro del `<Suspense>` existente. El fallback sigue siendo la tarjeta en la pestaña ENTRAR.                                |
| Otra persona usa tu alias al guardar una puntuación como invitado                                            | Se acepta hasta la spec que liga `scores` a la cuenta.                                                                                         |

## Qué **no** entra en esta spec

- OAuth con Google o GitHub.
- Recuperar o cambiar la contraseña.
- Entrar con el alias.
- Puntuaciones ligadas a la cuenta y alias reservados en los rankings.
- Página de cuenta o perfil.
- Protección de rutas.
- SMTP propio para los correos de Auth.
- Volver a la página de origen tras entrar.
- Sincronizar la sesión entre pestañas.

Cada uno de estos puntos, si llega, irá en su propia spec.

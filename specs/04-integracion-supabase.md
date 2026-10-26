# SPEC 04 — Integración de Supabase

> **Estado:** Implementado· **Depende de:** 03-about-contacto-resend · **Fecha:** 2026-10-26
> **Objetivo:** Instalar y configurar el cliente de Supabase (browser + SSR) como
> infraestructura base para specs futuras de autenticación, base de datos y realtime.

## Por qué existe esta spec

Supabase va a ser el backend de Arcade Vault para **base de datos y autenticación**, y más adelante también para **Realtime** y **Edge Functions**. Antes de escribir las specs de esas funcionalidades hace falta una base común: paquetes, clientes, variables de entorno, flujo de migraciones y una forma de comprobar que la conexión funciona.

Esta spec solo deja preparada esa base. No migra datos ni activa el login: la app sigue usando `lib/session.ts` y los mocks de `app/data/` exactamente igual que ahora.

## Alcance

**Entra:**

- Dependencias `@supabase/supabase-js` y `@supabase/ssr`.
- `lib/supabase/env.ts`: lee y valida las variables públicas. Devuelve `null` si faltan, en lugar de lanzar.
- `lib/supabase/client.ts`: cliente browser (`createBrowserClient`) para componentes `"use client"`. Lo usarán después Auth en cliente y Realtime.
- `lib/supabase/server.ts`: cliente SSR (`createServerClient` + `cookies()`) para Server Components, Route Handlers y Server Actions.
- `lib/supabase/proxy.ts` + `proxy.ts` en la raíz: refresca la sesión de Auth en cada petición. **No protege rutas ni redirige.**
- Variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local` (no versionado) y `.env.example` (versionado).
- Carpeta `supabase/migrations/` con una migración mínima: la función `public.health_check()`. No crea tablas.
- `lib/supabase/database.types.ts`, generado desde el proyecto y usado para tipar los clientes.
- Route Handler `GET /api/health` que comprueba que responden la base de datos (vía RPC) y Auth.
- Sección "Supabase" en `README.md`: variables necesarias, cómo aplicar migraciones y cómo regenerar los tipos.

**Fuera de alcance (specs futuras):**

- Tablas de dominio (`games`, `scores`, `profiles`…), sus políticas RLS y el seed con los datos de `app/data/`.
- Hacer funcional `/login`: registro, inicio y cierre de sesión, OAuth y correos de Auth.
- Sustituir `lib/session.ts` o modificar `nav`, `auth-card`, `game-player` o `hall-of-fame`.
- Protección de rutas o redirecciones en `proxy.ts`.
- Suscripciones Realtime.
- Edge Functions, la carpeta `supabase/functions/` y `SUPABASE_SERVICE_ROLE_KEY`.
- Supabase CLI y stack local con Docker.
- Tests automatizados.

## Modelo de datos

No se crean tablas. La única pieza de base de datos es una función de comprobación:

```sql
-- supabase/migrations/20261026000000_health_check.sql
create or replace function public.health_check()
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$ select now() $$;

grant execute on function public.health_check() to anon, authenticated;
```

Variables de entorno:

```bash
# .env.local (no versionado) — valores del proyecto kzkpuodqsexbszdlehap
NEXT_PUBLIC_SUPABASE_URL=https://kzkpuodqsexbszdlehap.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

`.env.example` añade estas dos claves vacías, con un comentario, debajo de las de Resend.

`lib/supabase/env.ts`:

```ts
export type SupabaseEnv = { url: string; publishableKey: string };
export function getSupabaseEnv(): SupabaseEnv | null;
```

Respuesta de `GET /api/health` (siempre JSON):

```ts
type HealthResponse =
  | { ok: true; db: "ok"; auth: "ok"; time: string } // time = resultado de health_check()
  | { ok: false; error: string };
```

| Caso                        | Código | Cuerpo                                            |
| --------------------------- | ------ | ------------------------------------------------- |
| BD y Auth responden         | 200    | `{ ok: true, db: "ok", auth: "ok", time }`        |
| Faltan variables de entorno | 500    | `{ ok: false, error: "SERVICIO NO CONFIGURADO" }` |
| Falla la RPC o Auth         | 502    | `{ ok: false, error: "SUPABASE NO DISPONIBLE" }`  |

Igual que en `/api/contact`, el detalle del error solo va a `console.error` en el servidor.

Estructura final:

```
proxy.ts
lib/supabase/
  env.ts
  client.ts
  server.ts
  proxy.ts
  database.types.ts
supabase/migrations/
  20261026000000_health_check.sql
app/api/health/route.ts
```

## Plan de implementación

1. **Dependencias y entorno.**
   - `npm install @supabase/supabase-js @supabase/ssr`.
   - Obtener la URL y la publishable key con el MCP de Supabase (`get_project_url`, `get_publishable_keys`) y escribirlas en `.env.local`.
   - Añadir las dos claves, vacías, a `.env.example`.
   - Crear `lib/supabase/env.ts`.
2. **Migración y tipos.**
   - Crear `supabase/migrations/20261026000000_health_check.sql` con el SQL del modelo de datos.
   - Aplicarla con `apply_migration` del MCP (nombre `health_check`) y comprobarla con `list_migrations`.
   - Revisar `get_advisors` (seguridad) y no dejar avisos nuevos.
   - Generar `lib/supabase/database.types.ts` con `generate_typescript_types`.
3. **Clientes browser y SSR.**
   - Leer antes `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md`.
   - `lib/supabase/client.ts` y `lib/supabase/server.ts`, tipados con `Database`.
   - `server.ts` exporta una función `async` que hace `await cookies()`. El `setAll` va en `try/catch`, porque un Server Component no puede escribir cookies (de eso se encarga el proxy).
   - Si `getSupabaseEnv()` devuelve `null`, ambos lanzan un error que nombra `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Se crean bajo demanda, nunca a nivel de módulo.
4. **Proxy de sesión.**
   - Leer antes `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` y `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
   - `lib/supabase/proxy.ts` exporta `updateSession(request)`: crea el cliente con las cookies de la petición, llama a `supabase.auth.getClaims()` y devuelve la respuesta con las cookies actualizadas.
   - Si faltan las variables de entorno, devuelve `NextResponse.next()` sin hacer nada.
   - `proxy.ts` en la raíz llama a `updateSession`, con un `matcher` que excluye `_next/static`, `_next/image`, `favicon.ico`, imágenes y `api/`.
5. **Route Handler `app/api/health/route.ts`.**
   - Exportar solo `GET`, dinámico.
   - Orden: comprobar el entorno → `supabase.rpc("health_check")` → ``fetch(`${url}/auth/v1/health`, { headers: { apikey } })`` → responder según la tabla del modelo de datos.
6. **Documentación.**
   - Sección "Supabase" en `README.md`, en español: variables necesarias, que las migraciones viven en `supabase/migrations/` y se aplican con el MCP, y cómo regenerar los tipos.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores, con y sin las variables de Supabase definidas.
- [ ] `npm run lint` termina sin errores.
- [ ] `package.json` incluye `@supabase/supabase-js` y `@supabase/ssr`.
- [ ] Con las variables, `GET /api/health` devuelve 200 y `{ ok: true, db: "ok", auth: "ok", time }`, donde `time` es una fecha ISO válida.
- [ ] Sin las variables, `GET /api/health` devuelve 500 y `{ ok: false, error: "SERVICIO NO CONFIGURADO" }`.
- [ ] Con una publishable key incorrecta, `GET /api/health` devuelve 502 y `{ ok: false, error: "SUPABASE NO DISPONIBLE" }`.
- [ ] `list_migrations` del MCP muestra `health_check`, y el archivo `.sql` correspondiente está en `supabase/migrations/`.
- [ ] `list_tables` del esquema `public` sigue vacío.
- [ ] `get_advisors` (seguridad) no muestra avisos relacionados con `health_check`.
- [ ] `lib/supabase/database.types.ts` incluye `health_check` en `Functions`, y `supabase.rpc("health_check")` está tipado sin `any`.
- [ ] `/`, `/games`, `/games/[id]`, `/games/[id]/play`, `/salon`, `/login` y `/about` funcionan igual que antes, sin errores en consola y con y sin variables.
- [ ] Login, puntuaciones y Nav siguen usando `lib/session.ts`. `git diff` no toca `lib/session.ts` ni `components/`.
- [ ] `.env.local` no aparece en `git status`. `.env.example` contiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- [ ] `grep -rn "service_role\|sb_secret" app lib proxy.ts .env.example` no da resultados.

## Decisiones

- **Sí:** Supabase como backend de BD y Auth, y en el futuro de Realtime y Edge Functions. Lo indicó el usuario.
- **Sí:** esta spec es solo la integración base. Tablas, Auth funcional, Realtime y Edge Functions irán en specs propias. Lo indicó el usuario.
- **No:** hacer funcional la pantalla `/login` en esta spec. Lo indicó el usuario.
- **Sí:** conectar el proyecto de Supabase que ya existe (`kzkpuodqsexbszdlehap`, el de `.mcp.json`). No se crea uno nuevo. Confirmado por el usuario.
- **Sí:** dos clientes, browser (`lib/supabase/client.ts`) y SSR (`lib/supabase/server.ts`), uno por contexto del App Router. Confirmado por el usuario.
- **Sí:** instalar `@supabase/supabase-js` y `@supabase/ssr`. Así la spec de Auth no tendrá que refactorizar el manejo de cookies y sesión. Confirmado por el usuario.
- **Sí:** refresco de sesión en `proxy.ts`, la convención de Next 16 que sustituye a `middleware.ts`. Se monta ya para que la spec de Auth solo tenga que añadir la lógica de rutas.
- **Sí:** solo las dos variables públicas, `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Confirmado por el usuario.
- **Sí:** publishable key (`sb_publishable_…`) en lugar de la `anon` key antigua. Es el formato actual de Supabase.
- **No:** `SUPABASE_SERVICE_ROLE_KEY`, ni siquiera como placeholder. El usuario eligió solo las dos públicas. Llegará con las Edge Functions o con operaciones de administración.
- **Sí:** migraciones como archivos SQL en `supabase/migrations/`, aplicadas con el MCP. Quedan versionadas en git sin instalar el CLI ni Docker.
- **Sí:** función `health_check()` como única migración. Prueba toda la cadena (migración → tipos → RPC tipada) sin adelantar el diseño de tablas.
- **Sí:** tipos generados en `lib/supabase/database.types.ts` y regenerados en cada spec que cambie el esquema.
- **Sí:** si faltan las variables, la app sigue funcionando con los mocks y solo `/api/health` informa del error. Es el mismo criterio que con Resend en la SPEC 03.
- **Sí:** cabecera, alcance, modelo de datos, plan y criterios se revisaron sección por sección con el usuario.

## Riesgos

| Riesgo                                                               | Mitigación                                                                                                                |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `cookies()` o el proxy chocan con `cacheComponents`                  | El cliente de servidor solo se usa en código dinámico (`/api/health`). Se leen los docs de Next antes de los pasos 3 y 4. |
| El proxy añade latencia a todas las páginas                          | `matcher` restringido. `getClaims()` valida el JWT en local cuando hay sesión y no hace nada cuando no la hay.            |
| Instanciar clientes a nivel de módulo rompe el build sin variables   | Clientes creados bajo demanda y `getSupabaseEnv()` sin lanzar. Hay un criterio de build sin variables.                    |
| La migración se aplica en remoto pero el archivo local no coincide   | Mismo nombre y mismo SQL. Se comprueba con `list_migrations`.                                                             |
| Los tipos se quedan desfasados respecto al esquema                   | Regenerarlos forma parte de cada spec que toque el esquema (documentado en el README).                                    |
| Las migraciones van directas al proyecto remoto (no hay stack local) | La migración de esta spec es idempotente (`create or replace`) y no toca datos.                                           |

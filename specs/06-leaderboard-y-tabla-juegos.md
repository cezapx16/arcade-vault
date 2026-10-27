# SPEC 06 — Leaderboard real y tabla de juegos en Supabase

> **Estado:** Implementado
> **Depende de:** SPEC 04, SPEC 05
> **Fecha:** 2026-10-27
> **Objetivo:** Crear las tablas `games` y `scores` en Supabase y que el catálogo, el TOP 10 de cada juego y el Salón de la Fama lean de ellas, guardando cada puntuación al terminar una partida.

## Por qué existe esta spec

Hoy todo lo relacionado con puntuaciones es falso. El catálogo sale de `app/data/games.ts`, que tiene `best` y `plays` escritos a mano. El `Leaderboard` de `/games/[id]` y el `SALÓN DE LA FAMA` de `/salon` se generan con `seededScores()`, y "TU MEJOR MARCA" es un número inventado. `saveScore()` escribe en `localStorage.av_scores`, pero nadie vuelve a leer esos datos.

La SPEC 04 dejó Supabase conectado y sin tablas. Esta spec crea las dos primeras tablas de dominio y conecta con ellas las pantallas que ya existen. No crea pantallas nuevas.

## Alcance

**Entra:**

- Tabla `games` con el catálogo (sin `best` ni `plays`) y tabla `scores` con las puntuaciones. Las dos tienen RLS.
- Vista `game_stats` y funciones `leaderboard()` y `player_best()`, que calculan `best`, `plays`, el ranking y la marca de un jugador a partir de `scores`.
- Seed de los 8 juegos de `app/data/games.ts` y de las 12 filas por juego que hoy genera `seededScores(seedFor(id), 12)`, para que nada se vea vacío.
- Cliente público sin cookies, `lib/supabase/public.ts`, que se puede usar dentro de `"use cache"`.
- Módulo de lecturas cacheadas `lib/data/games.ts` y `lib/data/scores.ts`, con `cacheTag` y respaldo cuando Supabase no está disponible.
- Catálogo leído de Supabase en `/` (carrusel de juegos), `/games`, `/games/[id]`, `/games/[id]/play` y `/games/rocas/play`.
- `best` y `plays` reales en `GameCard` y en la ficha del juego.
- TOP 10 real en el `Leaderboard` de `/games/[id]`, con una fila por jugador (su mejor puntuación).
- TOP 12 real en `/salon` para cada pestaña de juego, con el podio incluido.
- "TU MEJOR MARCA" real en `/salon`, buscando en `scores` por el `user.name` de la sesión falsa (`lib/session.ts`).
- Server Action `submitScore` que valida e inserta como `anon` y llama a `updateTag` para que la puntuación aparezca al momento.
- El modal "FIN DEL JUEGO" de `GameShell` guarda en Supabase para los 8 juegos (ROCAS y los simulados), con estados de guardando y de error.
- Estados de UI "SIN PUNTUACIONES TODAVÍA" (ranking vacío) y "RANKING NO DISPONIBLE" (Supabase caído o sin configurar), diseñados con `/frontend-design`.
- Si Supabase no está disponible, el catálogo sale de `app/data/games.ts` con `best` y `plays` a 0, y el build sigue funcionando sin variables.
- Se elimina `saveScore()` de `lib/session.ts` y se borra `app/data/scores.ts`.

**Fuera de alcance (specs futuras):**

- Autenticación real y la columna `user_id` en `scores`. `/login` y `lib/session.ts` siguen siendo falsos.
- Antitrampas: validar la partida en el servidor o firmar puntuaciones. La RLS solo limita rangos.
- La sección "ACTIVIDAD EN VIVO" de la home (`RECENT_SCORES`, `TOP_PLAYERS` y `HOME_STATS` de `app/data/home.ts`). Encaja mejor con Realtime.
- Un ranking global entre juegos o una página nueva de estadísticas.
- Realtime y suscripciones.
- Panel de administración de juegos (activar o desactivar, editar fichas).
- Migrar las puntuaciones que ya haya en `localStorage.av_scores`.
- Moderar nombres o borrar puntuaciones desde la app.
- Instalar un test runner.

## Modelo de datos

### Migración de esquema (`supabase/migrations/20261027000000_games_scores.sql`)

```sql
create table public.games (
  id         text primary key check (id ~ '^[a-z0-9-]{1,32}$'),
  title      text not null,
  short      text not null,
  long       text not null,
  cat        text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover      text not null check (cover like 'cover-%'),
  color      text not null check (color in ('cyan','magenta','yellow','green')),
  sort_order int  not null,
  created_at timestamptz not null default now()
);

create table public.scores (
  id         bigint generated always as identity primary key,
  game_id    text not null references public.games(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 10 and name = upper(name) and name = btrim(name)),
  score      integer not null check (score between 0 and 9999999),
  created_at timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc, created_at);
```

RLS:

| Tabla    | Política                                                                          | Roles                   |
| -------- | --------------------------------------------------------------------------------- | ----------------------- |
| `games`  | `select` con `using (true)`                                                       | `anon`, `authenticated` |
| `scores` | `select` con `using (true)`                                                       | `anon`, `authenticated` |
| `scores` | `insert` con `with check (true)` (los rangos los imponen los `check` de la tabla) | `anon`, `authenticated` |

No hay políticas de `update` ni de `delete`.

Lecturas derivadas, todas `security invoker` y con `search_path = ''`:

```sql
-- best y plays de cada juego
create view public.game_stats with (security_invoker = true) as
  select g.id as game_id, coalesce(max(s.score), 0) as best, count(s.id) as plays
  from public.games g left join public.scores s on s.game_id = g.id
  group by g.id;

-- Mejor puntuación por jugador; desempate por la marca más antigua.
public.leaderboard(p_game text, p_limit int)
  returns table (rank int, name text, score int, created_at timestamptz)

-- Posición y mejor marca de un nombre en un juego (0 filas si no tiene).
public.player_best(p_game text, p_name text)
  returns table (rank int, score int, created_at timestamptz)
```

`rank` se calcula con `row_number()` sobre la mejor puntuación de cada `name`, ordenando por `score desc, created_at asc`.

### Migración de seed (`supabase/migrations/20261027000100_seed_games_scores.sql`)

- Inserta los 8 juegos de `app/data/games.ts`, en el mismo orden (`sort_order` 1–8), sin `best` ni `plays`.
- Inserta 12 filas por juego con los `name`, `score` y fecha que devuelve hoy `seededScores(seedFor(id), 12)`. La fecha `dd/mm/2026` se guarda como `created_at` a las 12:00 UTC.
- El SQL se genera una sola vez con un script temporal que no se versiona, y queda fijo en el archivo.
- Usa `on conflict do nothing` en `games` para que aplicarla dos veces no duplique el catálogo.

### Tipos de la app

```ts
// app/data/games.ts — se queda como respaldo y fuente del seed
export type Game = { id; title; short; long; cat; cover; color }; // sin best ni plays
export type GameWithStats = Game & { best: number; plays: number };

// lib/data/scores.ts
export type LeaderboardRow = {
  rank: number;
  name: string;
  score: number;
  date: string;
}; // date = dd/mm/aaaa
export type Leaderboard = LeaderboardRow[] | null; // null = RANKING NO DISPONIBLE
```

- `plays` se muestra con un formateador `formatPlays(n)` (`15600` → `"15.6K"`), que vive en `lib/data/games.ts`.
- `GameShell`, `GamePlayer` y `AsteroidsGame` siguen recibiendo `Game` (no necesitan las estadísticas).

### Lecturas cacheadas

| Función (archivo)                                  | Devuelve                     | Tags                  | Respaldo sin Supabase                     |
| -------------------------------------------------- | ---------------------------- | --------------------- | ----------------------------------------- |
| `getGames()` (`lib/data/games.ts`)                 | `GameWithStats[]`            | `games`, `game-stats` | `GAMES` de `app/data/games.ts`, stats a 0 |
| `getGame(id)` (`lib/data/games.ts`)                | `GameWithStats \| undefined` | `games`, `game-stats` | ídem                                      |
| `getLeaderboard(id, limit)` (`lib/data/scores.ts`) | `Leaderboard`                | `scores-<id>`         | `null`                                    |

- Todas usan `"use cache"` y el cliente de `lib/supabase/public.ts`, nunca `lib/supabase/server.ts` (que lee `cookies()` y está prohibido dentro de `"use cache"`).
- `lib/supabase/public.ts` exporta `createPublicClient(): SupabaseClient<Database> | null`, con `persistSession: false`. Devuelve `null` si faltan las variables.

### Escritura (`app/actions/scores.ts`, `"use server"`)

```ts
export type SubmitScoreResult =
  | { ok: true }
  | { ok: false; error: "DATOS NO VÁLIDOS" | "NO SE PUDO GUARDAR" };

export async function submitScore(input: {
  gameId: string;
  name: string;
  score: number;
}): Promise<SubmitScoreResult>;
```

- Normaliza `name` (`trim`, `toUpperCase`) y valida: 1–10 caracteres, `score` entero entre 0 y 9.999.999, y `gameId` con el formato del `check`.
- Inserta con `createPublicClient()`. Si el juego no existe, la clave foránea falla y devuelve `NO SE PUDO GUARDAR`.
- Si va bien, llama a `updateTag("scores-<gameId>")` y `updateTag("game-stats")`.
- El detalle del error solo va a `console.error`, igual que en `/api/contact` y `/api/health`.

### Marca del jugador en `/salon`

- `HallOfFame` (cliente) llama a `rpc("player_best", { p_game, p_name: user.name })` con el cliente browser de `lib/supabase/client.ts`, cada vez que cambia la pestaña o el usuario.
- Sin usuario, o con 0 filas, no se muestra el bloque "TU MEJOR MARCA". Si el RPC falla, tampoco.

### Estructura final

```
supabase/migrations/20261027000000_games_scores.sql        (nuevo)
supabase/migrations/20261027000100_seed_games_scores.sql   (nuevo)
lib/supabase/public.ts                                     (nuevo)
lib/supabase/database.types.ts                             (regenerado)
lib/data/games.ts                                          (nuevo)
lib/data/scores.ts                                         (nuevo)
app/actions/scores.ts                                      (nuevo)
app/data/games.ts                                          (modificado: sin best/plays, tipo GameWithStats)
app/data/scores.ts                                         (eliminado)
lib/session.ts                                             (modificado: sin saveScore)
app/page.tsx, app/games/page.tsx, app/games/[id]/page.tsx,
app/games/[id]/play/page.tsx, app/games/rocas/play/page.tsx,
app/salon/page.tsx                                         (modificados: leen de lib/data)
components/library-browser.tsx                             (modificado: recibe games por props)
components/game-card.tsx, components/home/mini-card.tsx    (modificados si usan GameWithStats)
components/leaderboard.tsx                                 (modificado: async, datos reales y estados)
components/hall-of-fame.tsx                                (modificado: recibe rankings por props, marca real)
components/games/game-shell.tsx                            (modificado: guarda con submitScore)
app/globals.css                                            (estilos de los estados nuevos)
```

## Plan de implementación

1. **Esquema en Supabase.**
   - Comprobar con `list_tables` que `public` sigue vacío.
   - Crear `supabase/migrations/20261027000000_games_scores.sql` con tablas, índice, RLS, `game_stats`, `leaderboard()` y `player_best()`.
   - Aplicarla con `apply_migration` (nombre `games_scores`), revisar `get_advisors` (seguridad y rendimiento) y no dejar avisos nuevos.
   - Regenerar `lib/supabase/database.types.ts`.
   - Resultado: la app no cambia y `npm run build` pasa.
2. **Seed.**
   - Generar con un script temporal (fuera del repo) el SQL a partir de `GAMES` y `seededScores(seedFor(id), 12)`.
   - Guardarlo en `supabase/migrations/20261027000100_seed_games_scores.sql` y aplicarlo (nombre `seed_games_scores`).
   - Comprobar con `execute_sql` que hay 8 juegos y 96 puntuaciones, y que `leaderboard('rocas', 10)` devuelve 10 filas.
3. **Cliente público y lecturas cacheadas.**
   - Leer antes `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md`, `.../04-functions/cacheTag.md` y `.../04-functions/updateTag.md`.
   - Crear `lib/supabase/public.ts`, `lib/data/games.ts` (`getGames`, `getGame`, `formatPlays`) y `lib/data/scores.ts` (`getLeaderboard`), con el respaldo de la tabla de lecturas.
   - Todavía no los usa nadie. Resultado: build y lint pasan.
4. **Catálogo desde Supabase.**
   - Quitar `best` y `plays` de `app/data/games.ts` y añadir `GameWithStats`.
   - `/`, `/games`, `/games/[id]`, `/games/[id]/play` y `/games/rocas/play` usan `getGames()`/`getGame()`. `generateStaticParams` usa `getGames()`.
   - `LibraryBrowser` recibe `games` por props desde `app/games/page.tsx`.
   - `GameCard` y la ficha muestran `best` y `formatPlays(plays)` reales.
   - Resultado: el catálogo se ve igual, con las estadísticas del seed.
5. **TOP 10 real en la ficha.**
   - `Leaderboard` pasa a ser un Server Component `async` que llama a `getLeaderboard(id, 10)`, envuelto en `<Suspense>` en `/games/[id]`.
   - Estados "SIN PUNTUACIONES TODAVÍA" y "RANKING NO DISPONIBLE", diseñados con `/frontend-design` y con estilos en `app/globals.css`.
6. **Salón de la Fama real.**
   - `app/salon/page.tsx` carga `getGames()` y `getLeaderboard(id, 12)` de los 8 juegos, y se los pasa a `HallOfFame`.
   - `HallOfFame` usa esos datos para podio y tabla, con los mismos estados que el paso 5. El podio solo pinta las posiciones que existan.
   - "TU MEJOR MARCA" con `player_best` desde el cliente browser.
   - Borrar `app/data/scores.ts`.
7. **Guardar puntuaciones.**
   - Crear `app/actions/scores.ts` con `submitScore`.
   - En `GameShell`, GUARDAR PUNTUACIÓN llama a `submitScore`. Mientras guarda, el botón muestra "GUARDANDO…" y está deshabilitado. Si va bien, aparece "▸ PUNTUACIÓN GUARDADA_". Si falla, aparece el mensaje de error y el botón vuelve a estar disponible para reintentar.
   - Quitar `saveScore` y `SCORES_KEY` de `lib/session.ts`.
8. **Verificación final.**
   - `npm run build` y `npm run lint`, con y sin las variables de Supabase.
   - Recorrer los criterios de aceptación con el MCP de Playwright y el MCP de Supabase.

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores, con y sin las variables de Supabase.
- [ ] `list_migrations` muestra `games_scores` y `seed_games_scores`, y los dos `.sql` están en `supabase/migrations/`.
- [ ] `select count(*) from games` devuelve 8 y `select count(*) from scores` devuelve 96 justo después del seed.
- [ ] `get_advisors` (seguridad) no muestra avisos sobre `games`, `scores`, `game_stats`, `leaderboard` ni `player_best`.
- [ ] Con la publishable key, un `update` o `delete` sobre `scores` no afecta a ninguna fila.
- [ ] Con la publishable key, insertar `name = 'abc'`, `name = ''`, `score = -1` o `game_id = 'no-existe'` falla.
- [ ] `/games` muestra los 8 juegos en el orden de `sort_order`, y la búsqueda y los filtros de categoría funcionan igual que antes.
- [ ] La MEJOR PUNTUACIÓN de cada `GameCard` y de la ficha coincide con `select best from game_stats where game_id = …`.
- [ ] La ficha de `/games/rocas` muestra en "Partidas" el valor de `game_stats.plays` formateado con `formatPlays`.
- [ ] El TOP 10 de `/games/[id]` coincide con `leaderboard(id, 10)` y ningún nombre aparece dos veces.
- [ ] Cada pestaña de `/salon` muestra el podio y 12 filas que coinciden con `leaderboard(id, 12)`.
- [ ] Al terminar una partida en `/games/rocas/play`, GUARDAR PUNTUACIÓN muestra "GUARDANDO…" y luego "▸ PUNTUACIÓN GUARDADA_", y aparece una fila nueva en `scores` con `game_id = 'rocas'`.
- [ ] Lo mismo funciona en `/games/bloque-buster/play` (juego simulado).
- [ ] Después de guardar una puntuación que entra en el TOP 10, al navegar a `/games/rocas` y a `/salon` (pestaña ROCAS) aparece sin recargar la caché a mano, y la MEJOR PUNTUACIÓN se actualiza si la supera.
- [ ] Una segunda puntuación más baja del mismo nombre no añade una fila nueva en el TOP 10.
- [ ] Con sesión iniciada como un nombre que tiene puntuaciones en ROCAS, `/salon` (pestaña ROCAS) muestra "TU MEJOR MARCA" con la posición y la puntuación de `player_best('rocas', nombre)`. Con un nombre sin puntuaciones, el bloque no aparece.
- [ ] Si se vacía `scores` de un juego, su TOP 10 y su pestaña de `/salon` muestran "SIN PUNTUACIONES TODAVÍA".
- [ ] Sin las variables de Supabase: `/games` muestra los 8 juegos de `app/data/games.ts` con MEJOR PUNTUACIÓN 0, los rankings muestran "RANKING NO DISPONIBLE" y GUARDAR PUNTUACIÓN muestra "NO SE PUDO GUARDAR", todo sin errores en consola del navegador.
- [ ] `localStorage.av_scores` ya no se escribe al guardar. `grep -rn "saveScore\|seededScores\|av_scores" app components lib` no da resultados.
- [ ] La sección "ACTIVIDAD EN VIVO" de `/` se ve igual que antes y `app/data/home.ts` no aparece en `git diff`.
- [ ] `grep -rn "service_role\|sb_secret" app lib` no da resultados.

## Decisiones

- **Sí:** una sola spec para `games` y `scores`. `scores` depende de `games` por la clave foránea. Elegido por el usuario.
- **Sí:** la "tabla de juegos" es la tabla `games` de Supabase, que sustituye a `app/data/games.ts` como fuente del catálogo. **No:** una vista nueva de estadísticas en la UI. Elegido por el usuario.
- **Sí:** hacer reales los rankings que ya existen (TOP 10 de la ficha y `/salon`). **No:** ranking global en esta spec. Elegido por el usuario.
- **Sí:** `best` y `plays` se calculan a partir de `scores` con la vista `game_stats`. **No:** columnas guardadas en `games`, que se desincronizarían. Elegido por el usuario.
- **Sí:** inserción por Server Action como `anon`, con RLS que solo permite `insert` y `select`. **No:** esperar a Auth. **No:** insert directo desde el navegador sin una capa de validación. Elegido por el usuario.
- **Sí:** seed con los 8 juegos y las filas actuales de `seededScores()`, para que la plataforma no se vea vacía. Elegido por el usuario.
- **Sí:** guardan en Supabase los 8 juegos, porque todos usan el mismo `GameShell`. Las puntuaciones aleatorias de los simulados se mezclan con las reales y se pueden vaciar con SQL cuando haga falta. Elegido por el usuario.
- **No:** "ACTIVIDAD EN VIVO" de la home en esta spec. Irá con Realtime. Elegido por el usuario.
- **Sí:** una fila por jugador en los rankings (su mejor marca), con desempate por la más antigua. **No:** todas las partidas. Elegido por el usuario.
- **Sí:** "TU MEJOR MARCA" se busca por `name = user.name`. Es la única identidad que hay sin Auth. La limitación es que, al cambiar de nombre, se "pierden" las marcas. Elegido por el usuario.
- **Sí:** `"use cache"` + `cacheTag` y `updateTag` desde la Server Action (read-your-own-writes). **No:** lecturas dinámicas sin caché. Elegido por el usuario.
- **Sí:** `app/data/games.ts` se queda como respaldo del catálogo y fuente del seed. Sin Supabase, los rankings muestran "RANKING NO DISPONIBLE" y el build sigue funcionando, igual que en la SPEC 04. Se acepta tener el catálogo duplicado. Elegido por el usuario.
- **Sí:** cliente público sin cookies (`lib/supabase/public.ts`) para lecturas cacheadas y para la Server Action. `"use cache"` prohíbe `cookies()`, y sin Auth no hay sesión que propagar.
- **Sí:** nombre de 1 a 10 caracteres en mayúsculas (lo mismo que ya limita el input del modal) y puntuación entre 0 y 9.999.999. Se impone dos veces, en la Server Action y en los `check` de la tabla. Aceptado por el usuario con el resto de recomendaciones.
- **Sí:** se deja de escribir en `localStorage.av_scores` y no se migra lo que haya. Eran datos de prueba locales. Aceptado por el usuario con el resto de recomendaciones.
- **Sí:** el seed va en una migración propia, separada del esquema, para poder distinguirlo o rehacerlo sin tocar las tablas.
- **Sí:** las respuestas de las preguntas 2 a 11 se tomaron de las recomendaciones, a petición del usuario ("sigue avanzando con tus recomendaciones").

## Riesgos

| Riesgo                                                                                     | Mitigación                                                                                                                                                        |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La RLS de `insert` abierta a `anon` permite insertar puntuaciones falsas saltándose la app | Aceptado hasta Auth y antitrampas. Los `check` limitan rangos y no hay `update` ni `delete`. Se puede limpiar con SQL desde el MCP.                               |
| Usar `lib/supabase/server.ts` dentro de `"use cache"` rompe en runtime (`cookies()`)       | Las lecturas usan siempre `lib/supabase/public.ts`. El error puede pasar el build y fallar en `next start`, así que el paso 8 prueba también con `npm run start`. |
| El respaldo de un fallo de Supabase se queda cacheado (catálogo con stats a 0)             | `cacheLife` corto en las lecturas que pueden caer al respaldo. Se decide el perfil exacto en el paso 3, tras leer los docs.                                       |
| `generateStaticParams` depende de la red en el build                                       | `getGames()` cae a `app/data/games.ts` si Supabase no responde, así que el build no falla.                                                                        |
| `updateTag` no refresca `/salon` porque las 8 lecturas se cachean juntas                   | Cada `getLeaderboard` lleva su propio tag `scores-<id>`. Hay un criterio de que la puntuación aparece en `/salon` después de guardar.                             |
| `player_best` desde el navegador expone el RPC a cualquiera                                | Es una lectura de datos que ya son públicos por la RLS de `select`. No devuelve nada que no esté en el ranking.                                                   |
| El seed generado no coincide con lo que se veía antes                                      | Se genera con las mismas funciones (`seededScores(seedFor(id), 12)`). Los `best` cambian respecto a los números escritos a mano, y eso es lo esperado.            |

## Lo que **no** entra en esta spec

- Auth real y `user_id` en `scores`.
- Antitrampas.
- "ACTIVIDAD EN VIVO" de la home y Realtime.
- Ranking global o página nueva de estadísticas.
- Administración de juegos.
- Migrar `localStorage.av_scores`.
- Test runner.

Cada una de estas cosas, si llega, irá en su propia spec.

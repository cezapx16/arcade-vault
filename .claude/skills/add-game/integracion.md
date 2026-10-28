# Contratos de integración de un juego en Arcade Vault

Lo que ya existe tras las SPEC 05 y 06, y lo que cada juego nuevo debe cumplir. La spec que genere `/add-game` describe el juego **dentro** de estos contratos; si necesita romper uno, hace falta una spec previa.

El ejemplo canónico es ROCAS: `lib/games/asteroids/`, `components/games/asteroids-game.tsx` y `app/games/rocas/play/page.tsx`.

## 1. Qué hereda el juego sin escribir código

| Pieza                  | Dónde                                                      | Qué da                                                                             |
| ---------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| HUD, CRT, pausa, modal | `components/games/game-shell.tsx`                          | PUNTUACIÓN / VIDAS / NIVEL, overlay "EN PAUSA", modal "FIN DEL JUEGO", botones     |
| Guardado               | `GameShell` → `submitScore` (`app/actions/scores.ts`)      | Valida, inserta en `scores` como `anon`, `updateTag("scores-<id>")` y `game-stats` |
| TOP 10 de la ficha     | `components/leaderboard.tsx` en `/games/[id]`              | `getLeaderboard(id, 10)` con estados "SIN PUNTUACIONES" y "NO DISPONIBLE"          |
| Salón de la Fama       | `app/salon/page.tsx` + `components/hall-of-fame.tsx`       | Una pestaña por juego de `getGames()`, podio, TOP 12 y "TU MEJOR MARCA"            |
| Catálogo y stats       | `lib/data/games.ts` (`getGames`, `getGame`, `formatPlays`) | `best` y `plays` desde la vista `game_stats`                                       |

Un juego que esté en la tabla `games` y use `GameShell` tiene leaderboard completo automáticamente. **No se crea ninguna tabla, función, acción ni componente de ranking por juego.**

## 2. Motor (`lib/games/<motor>/`)

TypeScript sin React. Archivos: `constants.ts` (resolución, reglas, `PALETTE`, `GLOW`), `entities.ts` (clases y utilidades; `draw(ctx)` recibe el contexto), `engine.ts` (estado, entrada, `update`, `draw`, loop y la factoría). Si el juego es pequeño, `entities.ts` puede no existir; dilo en la spec.

```ts
export type <Motor>Callbacks = {
  onScore: (score: number) => void; // solo cuando cambia
  onLives: (lives: number) => void; // solo cuando cambia
  onLevel: (level: number) => void; // solo cuando cambia
  onGameOver: (score: number) => void; // una vez por partida
};

export type <Motor>Game = {
  pause: () => void; // detiene el loop y limpia las teclas pulsadas
  resume: () => void; // reanuda sin salto de dt (reinicia lastTime)
  restart: () => void; // reinicia y vuelve a emitir los valores iniciales
  end: () => void; // fuerza game over con la puntuación actual → onGameOver
  destroy: () => void; // cancela rAF y quita listeners; idempotente
};

export function create<Motor>Game(
  canvas: HTMLCanvasElement,
  callbacks: <Motor>Callbacks,
): <Motor>Game;
```

Reglas fijas:

- Resolución lógica fija con aspecto **4:3** (800×600 por defecto). HiDPI: `canvas.width = W * dpr`, `canvas.height = H * dpr`, `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`. El CSS (`.game-canvas`) lo escala al `.crt-screen`.
- `dt` limitado (50 ms en ROCAS). Si la referencia usa un acumulador por pasos (Tetris), el limitador va igual sobre el delta del frame.
- Listeners en `window` registrados en la factoría y quitados en `destroy`. Nunca `getElementById` ni globales.
- `preventDefault` solo en las teclas del juego, solo mientras se juega, y nunca con el foco en `input` o `textarea` (el modal tiene el input de iniciales).
- Callbacks emitidos solo cuando cambia el valor (nada de renders de React a 60 fps). Al crearse emite los valores iniciales.
- Del canvas se quitan el HUD de puntuación, vidas y nivel, los overlays de pausa y "GAME OVER", y el reinicio por tecla. Se queda lo que es jugabilidad (indicadores de power-up, pieza siguiente, etc.).
- En `gameover` el motor puede seguir animando efectos, pero ignora la entrada y no hace `preventDefault`.
- Puntuación entera entre 0 y 9.999.999 (lo exigen la Server Action y el `check` de `scores`).
- Paleta: hex de los tokens de `app/globals.css` en `PALETTE` (el canvas no lee variables CSS), glow con `shadowBlur`, diseñada con `/frontend-design`. Primero se porta con los colores originales y en un paso posterior se aplica la paleta.
- Assets, si los hay: en `public/games/<id>/`, cargados por el motor y esperados antes de arrancar el loop.

## 3. Componente (`components/games/<motor>-game.tsx`)

`"use client"`, recibe `{ game: Game }` y renderiza `<GameShell>` con el `<canvas className="game-canvas">` como `children`. Copia el patrón de `asteroids-game.tsx`:

- Estado `hud`, `paused` y `over`. El motor se crea en un `useEffect` con el canvas por ref, y la limpieza llama a `destroy` (aguanta el doble montaje de StrictMode).
- Un único estado de pausa para el botón, `P`/`Escape` (ignoradas con `over` o con foco en un input) y `visibilitychange` cuando `document.hidden`.
- `onEnd` llama a `end()`. `onRestart` llama a `restart()` y resetea `over` y `paused`.
- Sin teclado (`(hover: none) and (pointer: coarse)` con `useSyncExternalStore` y snapshot de servidor `false`): aviso "REQUIERE TECLADO" / "JUEGA DESDE UN ORDENADOR" en `.crt-content` y el motor no se crea.

Si ya existe un hook compartido para esto (por ejemplo, extraído por una spec de juego anterior), se usa ese en lugar de copiar.

`GameShell` solo pinta score, lives y level. Si el juego necesita otra métrica, la spec decide si se amplía `GameShell` (de forma opcional y sin cambiar el resto de juegos) o se dibuja en el canvas.

## 4. Ruta (`app/games/<id>/play/page.tsx`)

Ruta estática con prioridad sobre `app/games/[id]/play/page.tsx`, que **no se toca** (los juegos simulados siguen usándola):

```tsx
export default async function <Id>PlayPage() {
  const game = await getGame("<id>");
  if (!game) notFound();
  return <<Motor>Game game={game} />;
}
```

No lee `params`, así que no necesita `<Suspense>` con Cache Components. `generateStaticParams` de la ruta genérica puede seguir generando ese id.

## 5. Catálogo

### Sustituir una partida simulada

El id ya está en `games` (seed de la SPEC 06) y en `GAMES` (`app/data/games.ts`), con cover y ranking. No hay migración de catálogo. Lo que la spec debe decidir:

- Si se conservan las 12 puntuaciones aleatorias del simulado o se vacían con una migración `supabase/migrations/<ts>_reset_scores_<id>.sql` (`delete from public.scores where game_id = '<id>';`), aplicada con `apply_migration`.
- Si cambian los textos `short`/`long` para describir el juego real. Si cambian, la migración hace `update public.games …` **y** se actualiza la entrada de `GAMES` igual, para que el respaldo coincida.

### Juego nuevo

- Migración `supabase/migrations/<ts>_game_<id>.sql`: `insert into public.games (id, title, short, long, cat, cover, color, sort_order) values (…) on conflict (id) do nothing;`. Aplicada con `apply_migration` (nombre `game_<id>`), y revisada con `get_advisors`.
- Restricciones de la tabla: `id ~ '^[a-z0-9-]{1,32}$'`, `cat` en `ARCADE | PUZZLE | SHOOTER | VERSUS`, `color` en `cyan | magenta | yellow | green`, `cover like 'cover-%'`. `sort_order` es el máximo actual + 1 salvo que se pida otra posición (cambiar el orden de los demás exige `update`).
- Entrada en `GAMES` de `app/data/games.ts`, en la misma posición, para el respaldo sin Supabase.
- Cover `.cover-<nombre>` en `app/globals.css` (CSS puro con `::before`/`::after`, como las existentes), diseñada con `/frontend-design`. Se ve en `GameCard`, `MiniCard` y la ficha.
- Seed opcional: migración aparte `<ts>_seed_scores_<id>.sql` con 12 filas (`name` en mayúsculas, de 1 a 10 caracteres). Sin seed, el ranking muestra "SIN PUNTUACIONES TODAVÍA".
- No cambia el esquema, así que no hace falta regenerar `lib/supabase/database.types.ts`.
- `getGames()` se cachea con `cacheLife("hours")` y el tag `games`. Tras aplicar la migración, el juego aparece al reiniciar `next dev` o en el siguiente build. Hay que comprobar que `/salon` (una pestaña más) y el carrusel de la home (`slice(0, 6)`) siguen bien.

## 6. Verificación común

- `npm run build` y `npm run lint` sin errores.
- `app/games/[id]/play/page.tsx` no aparece en `git diff`. Los simulados siguen igual (por ejemplo, `/games/bloque-buster/play` si no es el que se sustituye).
- `/games/<id>/play`: canvas dentro de `.crt-screen` en 4:3, sin errores en consola, y HUD de React con los valores iniciales.
- Reglas de puntuación, vidas y niveles comprobables una a una con los números de la spec.
- Teclas del juego sin scroll. PAUSA, `P`, `Escape` y cambio de pestaña pausan. Al reanudar no quedan teclas pegadas.
- FIN y game over abren el modal con la puntuación. Se pueden escribir iniciales con espacios. JUGAR DE NUEVO reinicia.
- GUARDAR PUNTUACIÓN: "GUARDANDO…" y luego "▸ PUNTUACIÓN GUARDADA_", con fila nueva en `scores` con `game_id = '<id>'` (`execute_sql`).
- La puntuación aparece en el TOP 10 de `/games/<id>` y en la pestaña de `/salon` sin recargar la caché, y coincide con `leaderboard('<id>', 10)`.
- Al salir de la ruta no quedan listeners ni loop (flechas y Espacio hacen scroll con normalidad).
- Emulación táctil: "REQUIERE TECLADO" y sin `<canvas>`.
- Nitidez con `devicePixelRatio` 2 y colores de `PALETTE`.
- Juego nuevo: aparece en `/games` en su `sort_order`, filtra por su categoría, y sin variables de Supabase sale del respaldo con MEJOR PUNTUACIÓN 0.

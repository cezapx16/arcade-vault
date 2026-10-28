# SPEC 07 — Juego Tetris real en CAÍDA

> **Estado:** Implementado
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-10-28
> **Objetivo:** Portar el Tetris de `references/started-games/03-tetris/` a TypeScript y hacerlo jugable en `/games/caida/play`, integrado con el HUD, la pausa, el modal de fin y el ranking de la plataforma.

## Por qué existe esta spec

Hoy `/games/caida/play` muestra la partida simulada de `GamePlayer`: un contador que suma puntos al azar sobre una animación CSS. CAÍDA ya tiene ficha, cover (`cover-tetro`) y un ranking con 12 puntuaciones aleatorias del seed de la SPEC 06.

`references/started-games/03-tetris/` tiene un Tetris completo en canvas puro (`index.html`, `style.css` y `game.js`, de unas 300 líneas), pero no se puede usar tal cual:

- Es un script global que busca dos canvas con `getElementById`: `#board`, de 300×600, y `#next-canvas`, de 120×120.
- Registra `keydown` en `document` sin quitarlo nunca.
- Pinta en el DOM su propio HUD (`#score`, `#lines`, `#level`) y un overlay PAUSA / GAME OVER con un botón "Reiniciar".
- Tiene un selector de tema claro/oscuro guardado en `localStorage`.
- El tablero no es 4:3.
- `dropAccum` acumula el `dt` sin límite.

Esta spec lo convierte en el segundo juego real de Arcade Vault con el patrón de ROCAS. De paso, extrae el hook compartido que la SPEC 05 dejó pendiente "para el segundo juego de canvas". El leaderboard se hereda de la SPEC 06 sin código nuevo.

## Alcance

**Entra:**

- Port 1:1 de `game.js` a TypeScript en `lib/games/tetris/`, sin React, con estas reglas:
  - Tablero de 10 columnas × 20 filas.
  - **8 piezas**: las 7 clásicas (I, O, T, S, Z, J, L) más la **tuerca** (`N`), un anillo 3×3 con el hueco en el centro.
  - Pieza aleatoria con `Math.floor(Math.random() * 8) + 1`, sin bolsa.
  - Aparición en `x = floor(10 / 2) − floor(ancho / 2)`, `y = 0`.
  - Rotación horaria (`rotateCW`) con wall kicks `[0, −1, 1, −2, 2]`.
  - Pieza fantasma con alpha 0,2.
  - Puntos por líneas: `LINE_SCORES = [0, 100, 300, 500, 800] × nivel`. Hard drop: +2 por celda. Soft drop: +1 por fila.
  - Nivel `floor(líneas / 10) + 1`, con caída cada `max(100, 1000 − (nivel − 1) × 90)` ms.
  - **1 vida**: cuando la pieza nueva colisiona al aparecer, la vida pasa a 0 y se acaba la partida.
- API del motor `createTetrisGame(canvas, callbacks)`, que devuelve `pause / resume / restart / end / destroy`. `destroy` cancela el `requestAnimationFrame` y quita todos los listeners.
- El motor avisa a React solo cuando cambian `score`, `lives` o `level`, y una vez en game over.
- Del canvas y del motor se quitan:
  - El HUD de puntuación y nivel.
  - El overlay PAUSA / GAME OVER y el botón "Reiniciar".
  - La pausa con `P` del propio motor, que pasa al hook.
  - El selector de tema con su `localStorage`.
  - La lectura de `--grid-line` con `getComputedStyle`.
- Se mantiene lo que es jugabilidad: la pieza fantasma y un panel lateral dibujado en el canvas con **SIGUIENTE**, **LÍNEAS** y la chuleta de **CONTROLES**.
- `preventDefault` en `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown` y `Space` mientras se juega, para que la página no haga scroll. Nunca se aplica con el foco en un `input` o `textarea`.
- Durante la pausa, el motor ignora las teclas de juego.
- Resolución lógica fija de 800×600 (4:3), escalada con CSS al `.crt-screen`, con el buffer multiplicado por `devicePixelRatio`:
  - El tablero (celdas de 28 px, 280×560) va **centrado** en el canvas, en `x = 260`, `y = 20`.
  - El panel lateral va a la derecha, separado del tablero y sin alinearse con él (ver Modelo de datos).
- Paleta neón de la plataforma con glow (`shadowBlur`), diseñada con `/frontend-design`.
- Hook compartido `useCanvasGame` y componente `CanvasScreen` en `components/games/use-canvas-game.tsx`, extraídos de `asteroids-game.tsx`:
  - Llevan la pausa (botón, `P`/`Escape` y `visibilitychange`), la detección de teclado y el ciclo de vida del motor.
  - ROCAS y CAÍDA los usan.
- Componente cliente `components/games/tetris-game.tsx`, que usa el hook y conecta el motor con `GameShell`.
- Ruta estática `app/games/caida/play/page.tsx`, que tiene prioridad sobre `app/games/[id]/play/page.tsx`. La ruta genérica no se toca.
- Fin de partida: `onLives(0)` y luego `onGameOver(score)`, que abre el modal "FIN DEL JUEGO". FIN llama a `end()` y JUGAR DE NUEVO a `restart()`.
- GUARDAR PUNTUACIÓN usa `submitScore` (heredado de `GameShell`). La puntuación aparece en el TOP 10 de `/games/caida` y en la pestaña CAÍDA de `/salon`.
- En dispositivos sin teclado (`(hover: none) and (pointer: coarse)`), el CRT muestra "REQUIERE TECLADO" y el motor no se crea.
- El juego ocupa la entrada `caida` del catálogo:
  - Se vacían las 12 puntuaciones aleatorias del seed con una migración.
  - El `long` se actualiza en `games` y en `GAMES`.
  - `short`, título, categoría, cover y color se quedan igual.

**Fuera de alcance (specs futuras):**

- Controles táctiles.
- Sonido, música o botón de mute.
- Mecánicas que no están en `game.js`: bolsa de 7, _hold_, rotación antihoraria, _lock delay_, DAS/ARR propios o T-spins.
- Ampliar `GameShell` con una métrica LÍNEAS en el HUD de React.
- Tema claro.
- Cambios en los demás juegos simulados.
- Auth real y antitrampas (siguen como en la SPEC 06).
- Instalar un test runner o escribir tests del motor.

## Modelo de datos

No cambia el esquema. Las puntuaciones van a la tabla `scores` de la SPEC 06. Lo nuevo es la API del motor, el hook compartido y una migración de datos para la fila `caida`.

### Motor (`lib/games/tetris/engine.ts`)

```ts
export type TetrisCallbacks = {
  onScore: (score: number) => void; // solo cuando cambia
  onLives: (lives: number) => void; // solo cuando cambia
  onLevel: (level: number) => void; // solo cuando cambia
  onGameOver: (score: number) => void; // una vez por partida
};

export type TetrisGame = {
  pause: () => void; // detiene el loop; las teclas de juego se ignoran
  resume: () => void; // reanuda sin salto de dt (reinicia lastTime)
  restart: () => void; // init() y vuelve a emitir score/lives/level iniciales
  end: () => void; // fuerza game over con la puntuación actual → onLives(0) + onGameOver
  destroy: () => void; // cancela rAF y quita listeners; idempotente
};

export function createTetrisGame(
  canvas: HTMLCanvasElement,
  callbacks: TetrisCallbacks,
): TetrisGame;
```

- Estado interno: `state: "playing" | "paused" | "gameover"`. En `gameover` el motor ignora la entrada y no aplica `preventDefault`.
- Variables del original: `board`, `current`, `next`, `score`, `lines`, `level`, `dropInterval` y `dropAccum`, más `lives`.
- El `dt` del frame se limita a 50 ms antes de sumarse a `dropAccum`. Es el único cambio sobre el bucle original.
- Al crearse emite `onScore(0)`, `onLives(1)` y `onLevel(1)`.
- Cuando `spawn()` colisiona, el motor hace `lives = 0`, emite `onLives(0)` y `onGameOver(score)`. `end()` hace lo mismo con la puntuación actual.
- El movimiento continuo sigue saliendo de la repetición de `keydown` del sistema, como en el original.
- No hay estado de victoria: se juega hasta que la pila llega arriba.

### Pantalla 800×600

| Elemento       | Posición (px lógicos)                                                                   |
| -------------- | --------------------------------------------------------------------------------------- |
| Tablero 10×20  | `BOARD_X = 260`, `BOARD_Y = 20`, celdas `CELL = 28` (280×560). Centrado en `x = 400`    |
| Panel lateral  | `PANEL_X = 580` (40 px a la derecha del tablero), 160 px de ancho                       |
| SIGUIENTE      | Etiqueta en `y = 70` y recuadro de 128×128 en `y = 84` (4×4 celdas de 28 + 8 de margen) |
| LÍNEAS         | Etiqueta en `y = 250` y valor en `y = 275`                                              |
| CONTROLES      | Desde `y = 330`: `← →` mover, `↑ X` rotar, `↓` bajar, `ESPACIO` caída, `P` pausa        |
| Lado izquierdo | Libre (solo fondo)                                                                      |

- El panel empieza más abajo que el tablero (`y = 70` frente a `y = 20`) y no se centra con él como bloque. El que va centrado es el tablero.
- La pieza siguiente se centra en su recuadro con los mismos desplazamientos que `drawNext()`.
- Los textos del panel usan `monospace`, como el indicador `3x` de ROCAS.

### Archivos del motor

| Archivo                         | Contenido                                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/games/tetris/constants.ts` | `W`, `H`, `COLS`, `ROWS`, `CELL`, `BOARD_X`, `BOARD_Y`, `PANEL_X`, `PIECES`, `LINE_SCORES`, `KICKS`, `PALETTE` y `GLOW`                     |
| `lib/games/tetris/entities.ts`  | Funciones puras: `createBoard`, `randomPiece`, `collide`, `rotateCW`, `ghostY`, `clearLines`, y `drawBlock(ctx, …)`, que recibe el contexto |
| `lib/games/tetris/engine.ts`    | Estado, entrada, `update`, `draw` (tablero, fantasma, pieza y panel), loop y `createTetrisGame`                                             |

`PALETTE` usa los hex de los tokens de `app/globals.css`, porque el canvas no lee variables CSS. Los colores finales los decide `/frontend-design`, partiendo de esta propuesta:

```ts
export const PALETTE = {
  bg: "#000",
  grid: "rgba(255,255,255,0.06)", // --line-2
  border: "#ff006e", // --magenta (color de CAÍDA)
  pieces: [
    null,
    "#00f5ff", // I — --cyan
    "#f5ff00", // O — --yellow
    "#ff006e", // T — --magenta
    "#00ff88", // S — --green
    "#d97a3a", // Z — --bronze
    "#8a8fb5", // J — --ink-dim
    "#ffcf3a", // L — --gold
    "#c7d0e0", // N (tuerca) — --silver
  ],
  label: "#4a4f70", // --ink-faint
  text: "#e6e9ff", // --ink
} as const;
```

### Hook compartido (`components/games/use-canvas-game.tsx`)

```ts
export type CanvasEngine = {
  pause: () => void;
  resume: () => void;
  restart: () => void;
  end: () => void;
  destroy: () => void;
};

export type HudCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (score: number) => void;
};

export function useCanvasGame(
  create: (canvas: HTMLCanvasElement, callbacks: HudCallbacks) => CanvasEngine, // estable (función de módulo)
  initialHud: { score: number; lives: number; level: number },
): {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  hud: { score: number; lives: number; level: number };
  paused: boolean;
  over: boolean;
  noKeyboard: boolean;
  togglePause: () => void;
  end: () => void; // engine.end()
  restart: () => void; // engine.restart() y resetea over y paused
};

// Aviso "REQUIERE TECLADO" / "JUEGA DESDE UN ORDENADOR" o el <canvas className="game-canvas">.
export function CanvasScreen(props: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  noKeyboard: boolean;
  label: string;
}): React.ReactNode;
```

- El hook contiene lo que hoy está en `asteroids-game.tsx`:
  - `isTypingTarget`.
  - `useSyncExternalStore` sobre `(hover: none) and (pointer: coarse)`, con snapshot de servidor `false`.
  - Un motor por montaje, destruido en la limpieza (doble montaje de StrictMode).
  - Un único estado de pausa para el botón, `P`/`Escape` (ignoradas con `over` o con foco en un input) y `visibilitychange`.
- `AsteroidsGame` y `TetrisGame` quedan como envoltorios finos: `useCanvasGame(create…Game, …)` + `<GameShell>` + `<CanvasScreen>`.
- `GameShell` no cambia. Con 1 vida, VIDAS muestra `♥` y pasa a `—` en game over.

### Catálogo y reset de puntuaciones (`supabase/migrations/20261028000000_caida_real.sql`)

```sql
update public.games
  set long = 'Ocho piezas caen desde la oscuridad, incluida una tuerca hueca que no perdona. Gíralas, encájalas y limpia líneas para sobrevivir; cada 10 líneas la caída se acelera sin piedad.'
  where id = 'caida';

delete from public.scores where game_id = 'caida';
```

- La entrada `caida` de `GAMES` en `app/data/games.ts` recibe el mismo `long`, para que el respaldo coincida.
- No cambia el esquema: `lib/supabase/database.types.ts` no se regenera.

### Estructura final

```
app/games/caida/play/page.tsx              (nuevo)
components/games/use-canvas-game.tsx       (nuevo: hook y CanvasScreen)
components/games/tetris-game.tsx           (nuevo)
components/games/asteroids-game.tsx        (modificado: usa el hook)
lib/games/tetris/constants.ts              (nuevo)
lib/games/tetris/entities.ts               (nuevo)
lib/games/tetris/engine.ts                 (nuevo)
supabase/migrations/20261028000000_caida_real.sql (nuevo)
app/data/games.ts                          (modificado: long de caida)
```

## Plan de implementación

1. **Extraer el hook compartido.**
   - Mover de `asteroids-game.tsx` a `components/games/use-canvas-game.tsx` la pausa, `visibilitychange`, la detección de teclado, el ciclo de vida del motor y el aviso "REQUIERE TECLADO" (`CanvasScreen`).
   - `AsteroidsGame` pasa a usar `useCanvasGame(createAsteroidsGame, { score: 0, lives: 3, level: 1 })`.
   - Resultado: `/games/rocas/play` se ve y funciona igual. `npm run build` y `npm run lint` pasan.
2. **Catálogo en Supabase.**
   - Crear `supabase/migrations/20261028000000_caida_real.sql`, aplicarla con `apply_migration` (nombre `caida_real`) y revisar `get_advisors`.
   - Actualizar el `long` de `caida` en `GAMES`.
   - Comprobar con `execute_sql` que `games.long` tiene el texto nuevo y que `scores` no tiene filas de `caida`.
   - Resultado: `/games/caida` muestra el texto nuevo y su ranking muestra "SIN PUNTUACIONES TODAVÍA". La partida sigue siendo la simulada.
3. **Portar el motor a TypeScript.**
   - Crear `constants.ts`, `entities.ts` y `engine.ts` con las reglas 1:1 de `game.js`. En este paso se usan los colores originales de `COLORS`.
   - Colocar el tablero y el panel en 800×600 según la tabla de Pantalla.
   - Entrada con listeners en `window`, registrados en `createTetrisGame` y quitados en `destroy`. `preventDefault` según el alcance.
   - Quitar el HUD del DOM, el overlay, el botón "Reiniciar", la pausa con `P`, el tema y `getComputedStyle`.
   - Implementar `pause / resume / restart / end / destroy`, los callbacks (con `lives` 1 → 0), el límite de `dt` y el escalado HiDPI.
   - Todavía no lo usa nadie. Resultado: `npm run build` y `npm run lint` pasan.
4. **Componente y ruta.**
   - Crear `components/games/tetris-game.tsx` (`"use client"`) con `useCanvasGame(createTetrisGame, { score: 0, lives: 1, level: 1 })`, `<GameShell>` y `<CanvasScreen>`.
   - Crear `app/games/caida/play/page.tsx` con `getGame("caida")`, igual que la ruta de ROCAS.
   - Resultado: CAÍDA es jugable de principio a fin y GUARDAR PUNTUACIÓN crea una fila en `scores`.
5. **Paleta neón.**
   - Usar `/frontend-design` para fijar `PALETTE` y `GLOW` (piezas, fantasma, borde del tablero, rejilla y panel), y aplicarlos en `entities.ts` y `engine.ts`.
   - El glow va en la pieza actual y en el borde del tablero. Los bloques fijados solo lo llevan si el rendimiento lo permite (ver Riesgos).
6. **Verificación final.**
   - `npm run build` y `npm run lint`.
   - Recorrer los criterios de aceptación con el MCP de Playwright y el de Supabase.
   - Partida manual completa (el usuario).

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `app/games/[id]/play/page.tsx` y `components/games/game-shell.tsx` no aparecen en `git diff`.
- [ ] `/games/bloque-buster/play` se ve y se comporta igual que antes (partida simulada).
- [ ] `/games/rocas/play` funciona igual que antes: HUD, pausa con botón, `P`/`Escape` y cambio de pestaña, FIN, modal, guardado y "REQUIERE TECLADO" en táctil.
- [ ] `/games/caida/play` muestra un `<canvas>` dentro de `.crt-screen` que ocupa todo el ancho manteniendo 4:3, sin errores en consola.
- [ ] El centro horizontal del tablero coincide con el centro del canvas (`x = 400` de 800). El panel SIGUIENTE / LÍNEAS / CONTROLES está a la derecha del tablero, separado y empezando más abajo que su borde superior.
- [ ] Al iniciar, el HUD de React muestra PUNTUACIÓN 0, VIDAS ♥ y NIVEL 01. El canvas no dibuja puntuación ni nivel, ni el overlay PAUSA / GAME OVER ni el botón "Reiniciar". Tampoco hay selector de tema.
- [ ] Las piezas que aparecen incluyen las 8 formas, entre ellas la tuerca (anillo 3×3 con hueco).
- [ ] En nivel 1, completar 1 línea sube la PUNTUACIÓN 100. Completar 2 sube 300, 3 sube 500 y 4 sube 800. En nivel 2, una línea sube 200.
- [ ] Un hard drop que recorre n filas suma 2·n. Cada pulsación de ↓ que baja la pieza suma 1.
- [ ] Al llegar a 10 líneas, NIVEL pasa a 02 y la caída automática pasa de 1000 ms a 910 ms. El intervalo nunca baja de 100 ms.
- [ ] LÍNEAS del panel del canvas muestra el total de líneas eliminadas.
- [ ] El recuadro SIGUIENTE muestra la pieza que aparece justo después.
- [ ] La pieza fantasma se dibuja translúcida en la fila donde aterrizaría.
- [ ] ↑ y `X` rotan en sentido horario, y la pieza puede rotar pegada a una pared gracias a los wall kicks.
- [ ] Pulsar flechas o Espacio en `/games/caida/play` no hace scroll en la página.
- [ ] PAUSA congela el canvas y muestra "EN PAUSA". REANUDAR continúa sin saltos. `P` y `Escape` hacen lo mismo.
- [ ] Durante la pausa, flechas y Espacio no mueven la pieza. Al reanudar, la pieza está donde estaba.
- [ ] Cambiar de pestaña y volver: el juego está en pausa y la pieza no ha caído varias filas de golpe.
- [ ] Cuando la pila llega arriba y la pieza nueva no cabe, VIDAS pasa a "—" y se abre "FIN DEL JUEGO" con la puntuación final. FIN hace lo mismo con la puntuación actual.
- [ ] Con el modal abierto se pueden escribir iniciales con espacios, y Espacio no hace hard drop.
- [ ] GUARDAR PUNTUACIÓN muestra "GUARDANDO…" y luego "▸ PUNTUACIÓN GUARDADA_", y aparece una fila nueva en `scores` con `game_id = 'caida'`.
- [ ] Una puntuación que entra en el TOP 10 aparece en `/games/caida` y en la pestaña CAÍDA de `/salon` sin recargar la caché, y coincide con `leaderboard('caida', 10)`.
- [ ] JUGAR DE NUEVO cierra el modal y empieza una partida nueva: PUNTUACIÓN 0, VIDAS ♥, NIVEL 01, LÍNEAS 0 y tablero vacío.
- [ ] Al navegar de `/games/caida/play` a otra página, pulsar flechas o Espacio no lanza errores y la página hace scroll con normalidad.
- [ ] Con emulación táctil en Playwright, `/games/caida/play` muestra "REQUIERE TECLADO" y no hay `<canvas>`.
- [ ] Las piezas, la rejilla y el panel usan los colores de `PALETTE`, y el canvas se ve nítido con `devicePixelRatio` 2.
- [ ] Tras la migración, `select long from games where id = 'caida'` devuelve el texto nuevo y coincide con `GAMES`.
- [ ] Tras la migración, `select count(*) from scores where game_id = 'caida'` devuelve 0 antes de jugar, y `/games/caida` y su pestaña de `/salon` muestran "SIN PUNTUACIONES TODAVÍA".
- [ ] `list_migrations` muestra `caida_real`.

## Decisiones

- **Sí:** port 1:1 de `references/started-games/03-tetris/`. Se mantienen las 8 piezas con la tuerca, el azar sin bolsa, los wall kicks, la pieza fantasma, las puntuaciones y las velocidades. El único cambio es el límite de 50 ms en el `dt`. Tomado de las recomendaciones.
- **Sí:** sustituir la partida simulada de `caida`. **No:** un juego nuevo con id propio, que necesitaría fila, entrada en `GAMES` y cover nuevas. Elegido por el usuario.
- **Sí:** título CAÍDA, categoría PUZZLE, cover `cover-tetro`, color magenta y `short` sin cambios. **No:** "TETRIS" como título, porque es una marca y el catálogo usa nombres propios en español. Elegido por el usuario.
- **Sí:** `long` nuevo que menciona la tuerca, aplicado en `games` y en `GAMES`. Elegido por el usuario.
- **Sí:** vaciar las 12 puntuaciones aleatorias de `caida`. **No:** conservarlas, porque eran del simulado y algunas serían inalcanzables. Tomado de las recomendaciones.
- **Sí:** una sola migración (`caida_real`) para el texto y el reset, porque las dos cosas van juntas al convertir CAÍDA en juego real.
- **Sí:** CAÍDA tiene 1 vida. Perderla (pieza nueva sin sitio) es el game over, y ese es el que se emite al HUD principal y al modal. **No:** ampliar `GameShell` con `lives` opcional. **No:** VIDAS fijo en "—". Elegido por el usuario ("todos los juegos tienen vidas").
- **Sí:** LÍNEAS se dibuja en el panel del canvas, junto a SIGUIENTE. **No:** una métrica LÍNEAS en `GameShell`, porque con 1 vida el shell ya cubre el HUD sin cambios. Se deduce de la respuesta del usuario sobre las vidas; si se prefiere en el HUD de React, va en otra spec.
- **Sí:** el tablero va centrado en el canvas de 800×600 y el panel queda a la derecha, separado y sin alinear. **No:** centrar el conjunto tablero + panel. Elegido por el usuario.
- **Sí:** mismos controles que el original (←/→, ↑/`X`, ↓, Espacio) con `preventDefault`. La repetición del movimiento la da el sistema. `P` pasa al hook. Elegido por el usuario.
- **Sí:** extraer ahora `useCanvasGame` y `CanvasScreen` en un paso propio, con criterio de que ROCAS siga igual. **No:** duplicar `asteroids-game.tsx`. Tomado de las recomendaciones.
- **Sí:** quitar el tema claro/oscuro y su `localStorage`. La plataforma tiene un único tema. Tomado de las recomendaciones.
- **Sí:** sin sonido ni assets, porque la referencia no tiene. Sin estado de victoria. Tomado de las recomendaciones.
- **Sí:** aviso "REQUIERE TECLADO" en táctil. **No:** controles táctiles en esta spec. Tomado de las recomendaciones.
- **Sí:** el leaderboard se hereda de `GameShell` + `submitScore` + `getLeaderboard`. **No:** código de ranking propio del juego.
- **Sí:** ruta estática `app/games/caida/play/page.tsx`. **No:** un `if` en la ruta genérica.
- **Sí:** motor en `lib/games/tetris/` y componente en `components/games/`, como ROCAS. `entities.ts` contiene funciones puras en lugar de clases, porque el original no tiene clases.
- **Sí:** paleta neón con glow, diseñada con `/frontend-design`. Exigido por `CLAUDE.md`.
- **Sí:** los callbacks solo se emiten cuando cambia el valor, para no provocar un render de React en cada frame.

## Riesgos

| Riesgo                                                                             | Mitigación                                                                                                                  |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Listeners o `requestAnimationFrame` que sobreviven al desmontar                    | `destroy` idempotente y criterio de navegación sin errores. StrictMode lo prueba en desarrollo.                             |
| `preventDefault` en Espacio impide escribir las iniciales en el modal              | No se aplica con foco en `input`/`textarea` ni en `gameover`. Hay un criterio específico.                                   |
| Salto de `dt` al reanudar o al volver de otra pestaña (la pieza cae varias filas)  | `resume` reinicia `lastTime` y el `dt` se limita a 50 ms antes de sumarse a `dropAccum`.                                    |
| Renders de React a 60 fps                                                          | Callbacks solo cuando cambia el valor.                                                                                      |
| `matchMedia` en SSR provoca un hydration mismatch                                  | `useSyncExternalStore` con snapshot de servidor `false`, ahora dentro del hook.                                             |
| Extraer el hook cambia sin querer el comportamiento de ROCAS                       | El paso 1 es puramente estructural y hay un criterio de que ROCAS funciona igual.                                           |
| `create` inestable en el hook recrea el motor en cada render                       | `create` es una función de módulo (`createAsteroidsGame`, `createTetrisGame`), nunca una lambda inline.                     |
| `shadowBlur` en hasta 200 bloques fijados baja los FPS                             | Glow en la pieza actual y en el borde. Los bloques fijados solo lo llevan si se mantiene a 60 fps (se decide en el paso 5). |
| El tablero recolocado (celda de 28 px en lugar de 30) cambia la sensación de juego | Tamaños y posiciones fijados en la tabla de Pantalla. La lógica trabaja en celdas, no en píxeles.                           |
| La caché de `getGames()` sigue mostrando el `long` viejo tras la migración         | Reiniciar `next dev`; en producción entra con el build.                                                                     |

## Lo que **no** entra en esta spec

- Controles táctiles.
- Sonido, música o mute.
- Bolsa de 7, _hold_, rotación antihoraria, _lock delay_ o cualquier mecánica que no esté en `game.js`.
- LÍNEAS en el HUD de React (ampliar `GameShell`).
- Tema claro.
- Cambios en los demás juegos simulados.
- Auth, antitrampas y test runner.

Cada una de estas cosas, si llega, irá en su propia spec.

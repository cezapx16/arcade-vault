# SPEC 09 — Juego Snake real en SERPENTINA

> **Estado:**Implementado
> **Depende de:** SPEC 05, SPEC 06, SPEC 07
> **Fecha:** 2026-10-29
> **Objetivo:** Crear un Snake original con sprites de fruta y hacerlo jugable en `/games/serpentina/play`, integrado con el HUD, la pausa, el modal de fin y el ranking de la plataforma.

## Por qué existe esta spec

Hoy `/games/serpentina/play` muestra la partida simulada de `GamePlayer`: un contador que suma puntos al azar sobre una animación CSS. SERPENTINA ya tiene ficha, cover (`cover-snake`) y un ranking con 12 puntuaciones aleatorias del seed de la SPEC 06.

No hay código de referencia en `references/started-games/`. El juego se diseña en esta spec: un Snake de tablero cerrado con 3 vidas, fruta normal y fruta bonus, y velocidad creciente por nivel. Lo único que viene de fuera son los sprites de `references/source-assets/snake-assets/`:

- `fruits.png`, de 3790×442, con tres filas de 22 frutas (emoji, pixel art y realista) y fondo transparente.
- `sprites.js`, un atlas global (`window.SPRITE_ATLAS`) con las coordenadas de la fila pixel art (`y = 136–295`).
- Las coordenadas de `sprites.js` son correctas, pero **los nombres están mal**: `banana` recorta una manzana, `orange` un plátano, `grape` una piña, y así con todos. Esta spec fija los nombres reales.

Esta spec convierte SERPENTINA en el cuarto juego real de Arcade Vault. Usa el hook `useCanvasGame` y el componente `CanvasScreen` de la SPEC 07 sin cambiarlos. El leaderboard se hereda de la SPEC 06 sin código nuevo.

## Alcance

**Entra:**

- Motor nuevo en TypeScript en `lib/games/snake/`, sin React, con estas reglas:
  - Tablero cuadrado de **20 × 20 celdas de 30 px** (600×600), centrado en un canvas de 800×600.
  - Serpiente inicial de **4 segmentos**, con la cabeza en la celda `(6, 10)` y el cuerpo en `(5, 10)`, `(4, 10)` y `(3, 10)`, mirando a la derecha.
  - **Arranque en espera:** la serpiente no se mueve hasta que se pulsa W, S o D. Mientras tanto, el canvas muestra "PULSA W A S D". A se ignora en la espera porque sería un giro de 180°.
  - **Movimiento por ticks:** una celda por tick, con tick de `max(60, 140 − (nivel − 1) × 10)` ms. Son 140 ms en el nivel 1 y 60 ms a partir del nivel 9.
  - **Controles:** solo WASD (W arriba, A izquierda, S abajo, D derecha). No se puede girar 180°. Un búfer de 2 giros guarda las pulsaciones rápidas para los ticks siguientes.
  - **Paredes sólidas:** si la cabeza sale del tablero o entra en una celda del cuerpo, se pierde una vida. La celda de la cola cuenta como libre si ese tick la serpiente no crece.
  - **Fruta normal:** siempre hay una, en una celda libre al azar y con uno de los **22 sprites** al azar. Alarga la serpiente **1 segmento** y vale **10 × nivel** puntos.
  - **Fruta bonus:** cada 5 frutas normales comidas aparece una **piña con glow dorado** en otra celda libre, junto a la normal. Dura **6 s**, con una barra de tiempo dibujada bajo el sprite. Alarga **3 segmentos** y vale **50 × nivel** puntos. Si se acaba el tiempo, desaparece.
  - **Nivel:** `floor(frutas comidas / 5) + 1`, contando las normales y las bonus, sin tope.
  - **3 vidas.** Al perder una, la serpiente vuelve a la posición y longitud iniciales y espera otra vez a que se pulse W, S o D. Se conservan la puntuación, el nivel y la fruta normal. La bonus, si estaba, desaparece. Con 0 vidas se acaba la partida.
  - **Sin victoria.** Si no queda ninguna celda libre para la fruta (la serpiente llena las 400 celdas), la partida termina como con `end()`.
- El `dt` del frame se limita a 50 ms antes de sumarse al acumulador de ticks. Como el tick mínimo es de 60 ms, nunca se avanza más de una celda por frame.
- API del motor `createSnakeGame(canvas, callbacks)`, que devuelve `pause / resume / restart / end / destroy`. `destroy` cancela el `requestAnimationFrame`, quita todos los listeners y descarta la carga del sprite si no ha terminado.
- El motor avisa a React solo cuando cambian `score`, `lives` o `level`, y una vez en game over.
- En el canvas solo se dibuja jugabilidad: el tablero, la serpiente, las frutas, la barra del bonus, el aviso "PULSA W A S D" y un destello de 150 ms en la celda donde se come una fruta. No se dibujan puntuación, vidas, nivel ni overlays de pausa o fin.
- Ninguna tecla lleva `preventDefault`: WASD no hace scroll y las flechas y Espacio no son teclas del juego. Las teclas se leen por `e.code` (`KeyW`, `KeyA`, `KeyS`, `KeyD`) y se ignoran con el foco en un `input` o `textarea`.
- Al pausar se vacía el búfer de giros, y durante la pausa el motor ignora el teclado.
- Resolución lógica fija de 800×600 (4:3), escalada con CSS al `.crt-screen`, con el buffer multiplicado por `devicePixelRatio`. El tablero ocupa `x = 100–700` y las franjas laterales de 100 px quedan como fondo.
- Sprites de fruta: solo la fila pixel art, recortada en `public/games/serpentina/fruits.png` y cargada por el motor antes del primer frame. Se dibujan con `imageSmoothingEnabled = false`.
- Serpiente, tablero, barra y destello redibujados en canvas con la paleta neón de la plataforma y glow (`shadowBlur`), diseñados con `/frontend-design`.
- Componente cliente `components/games/snake-game.tsx`, que usa `useCanvasGame` y `CanvasScreen` y conecta el motor con `GameShell`.
- Ruta estática `app/games/serpentina/play/page.tsx`, que tiene prioridad sobre `app/games/[id]/play/page.tsx`. La ruta genérica no se toca.
- Pausa por tres vías con un único estado de React (la del hook): botón PAUSA/REANUDAR, teclas `P`/`Escape` y `visibilitychange`.
- Fin de partida: `onLives(0)` y luego `onGameOver(score)`, que abre el modal "FIN DEL JUEGO". FIN llama a `end()` y JUGAR DE NUEVO a `restart()`.
- GUARDAR PUNTUACIÓN usa `submitScore` (heredado de `GameShell`). La puntuación aparece en el TOP 10 de `/games/serpentina` y en la pestaña SERPENTINA de `/salon`.
- En dispositivos sin teclado (`(hover: none) and (pointer: coarse)`), el CRT muestra "REQUIERE TECLADO" y el motor no se crea. Viene de `CanvasScreen`.
- El juego ocupa la entrada `serpentina` del catálogo:
  - Se vacían las 12 puntuaciones aleatorias del seed con una migración.
  - El `long` se actualiza en `games` y en `GAMES`, porque ahora se come fruta y no "núcleos magenta".
  - Título, `short`, categoría, cover, color y posición se quedan igual.

**Fuera de alcance (specs futuras):**

- Controles táctiles.
- Control con flechas del teclado.
- Sonido, música o botón de mute.
- Tablero toroidal, obstáculos, varios tipos de bonus o frutas con efectos especiales.
- Las filas emoji y realista de `fruits.png`.
- Sustituir los sprites de terceros por arte propio (ver Riesgos).
- Información en las franjas laterales del canvas.
- Cambiar el aspecto 4:3 de `.crt-screen` para admitir un canvas cuadrado.
- Cambios en `useCanvasGame`, `CanvasScreen` o `GameShell`.
- Cambios en los demás juegos simulados.
- Auth real y antitrampas (siguen como en la SPEC 06).
- Instalar un test runner o escribir tests del motor.

## Modelo de datos

No cambia el esquema. Las puntuaciones van a la tabla `scores` de la SPEC 06. Lo nuevo es la API del motor, el atlas de sprites y una migración de datos para la fila `serpentina`.

### Motor (`lib/games/snake/engine.ts`)

```ts
export type SnakeCallbacks = {
  onScore: (score: number) => void; // solo cuando cambia
  onLives: (lives: number) => void; // solo cuando cambia
  onLevel: (level: number) => void; // solo cuando cambia
  onGameOver: (score: number) => void; // una vez por partida
};

export type SnakeGame = {
  pause: () => void; // detiene el loop, vacía el búfer de giros e ignora el teclado
  resume: () => void; // reanuda sin salto de dt (reinicia lastTime)
  restart: () => void; // serpiente inicial, 3 vidas, nivel 1, 0 puntos, fruta nueva; reemite los valores iniciales
  end: () => void; // fuerza game over con la puntuación actual → onLives(0) + onGameOver
  destroy: () => void; // cancela rAF, quita listeners y descarta la carga del sprite; idempotente
};

export function createSnakeGame(
  canvas: HTMLCanvasElement,
  callbacks: SnakeCallbacks,
): SnakeGame;
```

Estado interno:

```ts
type Cell = { x: number; y: number }; // columna y fila, de 0 a 19
type Dir = "up" | "down" | "left" | "right";

const state = {
  phase: "loading" as "loading" | "ready" | "playing" | "paused" | "gameover",
  snake: [] as Cell[], // cabeza primero
  dir: "right" as Dir,
  queue: [] as Dir[], // búfer de giros, máximo 2
  grow: 0, // segmentos pendientes de crecer
  fruit: { cell: { x: 0, y: 0 }, sprite: "apple" as FruitName },
  bonus: null as { cell: Cell; remaining: number } | null, // remaining en ms
  normalsEaten: 0, // para el bonus cada 5
  fruitsEaten: 0, // para el nivel
  flashes: [] as { cell: Cell; elapsed: number }[], // destellos de 150 ms
  accum: 0, // ms acumulados hacia el siguiente tick
  score: 0,
  lives: 3,
  level: 1,
};
```

- `loading` dura hasta que carga `fruits.png`. Después pasa a `ready`.
- En `ready`, la primera pulsación válida (W, S o D) fija `dir` y pasa a `playing`. El acumulador y el temporizador del bonus solo avanzan en `playing`.
- Un giro entra en `queue` si no es igual ni opuesto al último giro de la cola (o a `dir` si la cola está vacía). En cada tick se consume como mucho un giro.
- Al comer, `grow` suma 1 (fruta normal) o 3 (bonus). Mientras `grow > 0`, la cola no se recorta en el tick.
- La fruta y la bonus se colocan en una celda al azar entre las que no ocupan la serpiente ni la otra fruta. Si al perder una vida la fruta normal queda sobre las celdas iniciales de la serpiente, se recoloca.
- Al perder la última vida, el motor hace `lives = 0`, emite `onLives(0)` y `onGameOver(score)`. `end()` y el tablero lleno hacen lo mismo con la puntuación actual.
- En `gameover` el motor sigue animando los destellos que queden, pero ignora el teclado.
- Al crearse emite `onScore(0)`, `onLives(3)` y `onLevel(1)`.
- La puntuación tiene un techo práctico muy por debajo de 9.999.999: el tablero solo admite 396 frutas más allá de la serpiente inicial.

### Pantalla 800×600

| Elemento          | Posición (px lógicos)                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| Tablero 20×20     | `BOARD_X = 100`, `BOARD_Y = 0`, celdas `CELL = 30` (600×600). Centrado en `x = 400`                        |
| Borde del tablero | Trazo neón verde de 2 px dentro del tablero. Es la pared que mata                                          |
| Franjas laterales | `x = 0–100` y `x = 700–800`. Solo fondo                                                                    |
| Fruta             | Sprite escalado a 28 px de alto, con el ancho proporcional, centrado en su celda                           |
| Barra del bonus   | 24×3 px en la parte baja de la celda de la piña. Se acorta de 24 a 0 px en 6 s                             |
| Aviso de arranque | "PULSA W A S D" centrado en el tablero, en `monospace`, solo en `ready`                                    |
| Destello          | Cuadro de la celda que crece y se desvanece en 150 ms. El tamaño y la opacidad los fija `/frontend-design` |

### Sprites (`lib/games/snake/sprites.ts`)

`public/games/serpentina/fruits.png` es la fila pixel art de `fruits.png` (`y = 136–295`), recortada a 3790×160. Las `x` y los anchos se conservan, y la `y` pasa a ser 0. Todos los sprites miden 160 px de alto.

```ts
export const FRUITS_SRC = "/games/serpentina/fruits.png";
export const FRUIT_H = 160;

// Coordenadas de sprites.js con los nombres reales de cada recorte.
export const FRUITS = {
  apple: { x: 34, w: 110 },
  banana: { x: 186, w: 150 },
  pineapple: { x: 378, w: 110 }, // también es la fruta bonus
  grape: { x: 540, w: 130 },
  pumpkin: { x: 712, w: 130 },
  turnip: { x: 894, w: 110 },
  eggplant: { x: 1066, w: 110 },
  strawberry: { x: 1228, w: 130 },
  cherry: { x: 1400, w: 130 },
  carrot: { x: 1582, w: 110 },
  mushroom: { x: 1734, w: 150 },
  broccoli: { x: 1906, w: 150 },
  watermelon: { x: 2068, w: 170 },
  pepper: { x: 2250, w: 140 },
  kiwi: { x: 2432, w: 130 },
  lemon: { x: 2604, w: 130 },
  orange: { x: 2786, w: 110 },
  peach: { x: 2948, w: 130 },
  peanut: { x: 3110, w: 150 },
  raspberry: { x: 3302, w: 110 },
  tomato: { x: 3454, w: 150 },
  bowl: { x: 3637, w: 130 },
} as const;
export type FruitName = keyof typeof FRUITS;

export function loadFruits(): Promise<HTMLImageElement>;
```

- El recorte se hace una sola vez con un script temporal que no se versiona, y el PNG queda fijo en `public/`.
- Los nombres se comprueban a ojo al dibujar los 22 sprites en el paso 2. Si alguno no coincide, se corrige el nombre, nunca la coordenada.

### Archivos del motor

| Archivo                        | Contenido                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/games/snake/constants.ts` | `W`, `H`, `COLS = 20`, `ROWS = 20`, `CELL = 30`, `BOARD_X`, `BOARD_Y`, `START_CELLS`, `START_LIVES`, `BASE_TICK = 140`, `TICK_STEP = 10`, `MIN_TICK = 60`, `FRUITS_PER_LEVEL = 5`, `BONUS_EVERY = 5`, `BONUS_MS = 6000`, `POINTS_FRUIT = 10`, `POINTS_BONUS = 50`, `GROW_FRUIT = 1`, `GROW_BONUS = 3`, `FLASH_MS = 150`, `PALETTE` y `GLOW` |
| `lib/games/snake/sprites.ts`   | `FRUITS_SRC`, `FRUIT_H`, `FRUITS`, `FruitName` y `loadFruits()`                                                                                                                                                                                                                                                                             |
| `lib/games/snake/entities.ts`  | Funciones puras: `tickFor(level)`, `isOpposite`, `step`, `randomFreeCell`, y `drawBoard`, `drawSnake`, `drawFruit`, `drawBonusBar` y `drawFlash`, que reciben `ctx`                                                                                                                                                                         |
| `lib/games/snake/engine.ts`    | Estado, entrada, `update`, `draw`, loop, carga del sprite y `createSnakeGame`                                                                                                                                                                                                                                                               |

`sprites.ts` es un archivo más que en ROCAS y CAÍDA, igual que `levels.ts` en BLOQUE BUSTER, porque el atlas viene de un archivo aparte (`sprites.js`).

### Paleta

`PALETTE` usa los hex de los tokens de `app/globals.css`, porque el canvas no lee variables CSS. Los colores finales los decide `/frontend-design`, partiendo de esta propuesta:

```ts
export const PALETTE = {
  bg: "#000",
  grid: "rgba(255,255,255,0.06)", // --line-2
  border: "#00ff88", // --green (color de SERPENTINA)
  head: "#00ff88", // --green
  body: "#00ff88", // --green, con menos alpha hacia la cola
  bonusGlow: "#ffcf3a", // --gold
  bonusBar: "#ffcf3a", // --gold
  flash: "#e6e9ff", // --ink
  prompt: "#8a8fb5", // --ink-dim
} as const;
```

### Catálogo y reset de puntuaciones (`supabase/migrations/20261029000000_serpentina_real.sql`)

```sql
update public.games
  set long = 'Una serpiente de luz recorre la grilla devorando fruta pixelada. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.'
  where id = 'serpentina';

delete from public.scores where game_id = 'serpentina';
```

- La entrada `serpentina` de `GAMES` en `app/data/games.ts` recibe el mismo `long`, para que el respaldo coincida.
- No cambia el esquema: `lib/supabase/database.types.ts` no se regenera.

### Estructura final

```
app/games/serpentina/play/page.tsx                    (nuevo)
components/games/snake-game.tsx                       (nuevo)
lib/games/snake/constants.ts                          (nuevo)
lib/games/snake/sprites.ts                            (nuevo)
lib/games/snake/entities.ts                           (nuevo)
lib/games/snake/engine.ts                             (nuevo)
public/games/serpentina/fruits.png                    (nuevo: fila pixel art recortada)
supabase/migrations/20261029000000_serpentina_real.sql (nuevo)
app/data/games.ts                                     (modificado: long de serpentina)
```

## Plan de implementación

1. **Catálogo en Supabase.**
   - Crear `supabase/migrations/20261029000000_serpentina_real.sql`, aplicarla con `apply_migration` (nombre `serpentina_real`) y revisar `get_advisors`.
   - Actualizar el `long` de `serpentina` en `GAMES`.
   - Comprobar con `execute_sql` que `games.long` tiene el texto nuevo y que `scores` no tiene filas de `serpentina`.
   - Resultado: `/games/serpentina` muestra el texto nuevo y su ranking muestra "SIN PUNTUACIONES TODAVÍA". La partida sigue siendo la simulada.
2. **Sprites de fruta.**
   - Recortar la fila `y = 136–295` de `references/source-assets/snake-assets/fruits.png` con un script temporal y guardarla en `public/games/serpentina/fruits.png` (3790×160).
   - Crear `lib/games/snake/sprites.ts` con `FRUITS` (nombres reales), `FRUIT_H` y `loadFruits()`.
   - Comprobar los 22 nombres dibujando cada recorte en una página o canvas temporal que no se versiona.
   - Todavía no lo usa nadie. Resultado: `npm run build` y `npm run lint` pasan.
3. **Motor en TypeScript.**
   - Crear `constants.ts`, `entities.ts` y `engine.ts` con las reglas del alcance. En este paso la serpiente y el tablero se dibujan con colores planos.
   - Entrada con `keydown` en `window` por `e.code`, registrada en `createSnakeGame` y quitada en `destroy`. Sin `preventDefault`.
   - Estados `loading → ready → playing`, búfer de 2 giros, crecimiento pendiente, fruta, bonus con temporizador, vidas con reaparición en espera y tablero lleno.
   - Implementar `pause / resume / restart / end / destroy`, los callbacks (con `lives` 3 → 0), el límite de `dt` y el escalado HiDPI.
   - Todavía no lo usa nadie. Resultado: `npm run build` y `npm run lint` pasan.
4. **Componente y ruta.**
   - Crear `components/games/snake-game.tsx` (`"use client"`) con `useCanvasGame(createSnakeGame, { score: 0, lives: 3, level: 1 })`, `<GameShell>` y `<CanvasScreen>`, igual que `tetris-game.tsx`.
   - Crear `app/games/serpentina/play/page.tsx` con `getGame("serpentina")`, igual que la ruta de CAÍDA.
   - Resultado: SERPENTINA es jugable de principio a fin y GUARDAR PUNTUACIÓN crea una fila en `scores`.
5. **Paleta neón.**
   - Usar `/frontend-design` para fijar `PALETTE`, `GLOW`, el dibujo de la cabeza y del cuerpo, el destello y la barra del bonus, y aplicarlos en `entities.ts` y `engine.ts`.
   - El glow va en la cabeza, el borde del tablero, la piña bonus y el destello. El cuerpo solo lo lleva si el rendimiento lo permite (ver Riesgos).
6. **Verificación final.**
   - `npm run build` y `npm run lint`.
   - Recorrer los criterios de aceptación con el MCP de Playwright y el de Supabase.
   - Partida manual completa (el usuario).

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `app/games/[id]/play/page.tsx`, `components/games/game-shell.tsx` y `components/games/use-canvas-game.tsx` no aparecen en `git diff`.
- [ ] `/games/gloton/play` se ve y se comporta igual que antes (partida simulada).
- [ ] `/games/rocas/play`, `/games/caida/play` y `/games/bloque-buster/play` funcionan igual que antes.
- [ ] `/games/serpentina/play` muestra un `<canvas>` dentro de `.crt-screen` que ocupa todo el ancho manteniendo 4:3, sin errores en consola.
- [ ] El tablero es un cuadrado de 20 × 20 celdas centrado en el canvas (`x = 100–700`), con borde neón, y las franjas laterales están vacías.
- [ ] Al iniciar, el HUD de React muestra PUNTUACIÓN 0, VIDAS ♥ ♥ ♥ y NIVEL 01. El canvas no dibuja puntuación, vidas ni nivel.
- [ ] Al iniciar, la serpiente tiene 4 segmentos con la cabeza en `(6, 10)`, no se mueve y el canvas muestra "PULSA W A S D". Pulsar A no la arranca. Pulsar D la arranca hacia la derecha.
- [ ] En el nivel 1 la serpiente avanza una celda cada 140 ms, y en el nivel 2, cada 130 ms.
- [ ] W, A, S y D cambian la dirección. Un giro de 180° se ignora. Pulsar dos giros seguidos (por ejemplo, W y A) dentro del mismo tick hace los dos en ticks consecutivos.
- [ ] Las flechas y Espacio no mueven la serpiente y la página hace scroll con normalidad.
- [ ] Comer una fruta normal en el nivel 1 sube la PUNTUACIÓN 10 y alarga la serpiente 1 segmento. En el nivel 2 sube 20. Se ve un destello de unos 150 ms en su celda.
- [ ] Las frutas que aparecen usan sprites de la fila pixel art, nunca caen sobre la serpiente y se ven nítidas (sin suavizado).
- [ ] Al comer la quinta fruta normal aparece una piña con glow dorado y barra de tiempo. Comerla en el nivel 2 sube la PUNTUACIÓN 100 y alarga 3 segmentos. Si no se come, desaparece a los 6 s.
- [ ] Al comer 5 frutas, NIVEL pasa a 02.
- [ ] Chocar con el borde del tablero o con el propio cuerpo baja VIDAS en uno. La serpiente vuelve a `(6, 10)` con 4 segmentos y espera "PULSA W A S D", y la puntuación y el nivel se mantienen.
- [ ] Moverse a la celda que deja la cola en ese mismo tick no cuesta una vida.
- [ ] PAUSA congela el canvas y muestra "EN PAUSA". REANUDAR continúa sin saltos. `P` y `Escape` hacen lo mismo.
- [ ] Durante la pausa, WASD no cambia la dirección. Al reanudar, la serpiente sigue en la dirección que llevaba.
- [ ] Cambiar de pestaña y volver: el juego está en pausa, la serpiente no ha avanzado varias celdas de golpe y la barra del bonus no ha corrido.
- [ ] Al perder la tercera vida, VIDAS pasa a "—" y se abre "FIN DEL JUEGO" con la puntuación final. FIN hace lo mismo con la puntuación actual.
- [ ] Con el modal abierto se pueden escribir iniciales con W, A, S, D y espacios, y la serpiente no se mueve.
- [ ] GUARDAR PUNTUACIÓN muestra "GUARDANDO…" y luego "▸ PUNTUACIÓN GUARDADA_", y aparece una fila nueva en `scores` con `game_id = 'serpentina'`.
- [ ] Una puntuación que entra en el TOP 10 aparece en `/games/serpentina` y en la pestaña SERPENTINA de `/salon` sin recargar la caché, y coincide con `leaderboard('serpentina', 10)`.
- [ ] JUGAR DE NUEVO cierra el modal y empieza una partida nueva: PUNTUACIÓN 0, VIDAS ♥ ♥ ♥, NIVEL 01, serpiente inicial en espera y una fruta nueva.
- [ ] Al navegar de `/games/serpentina/play` a otra página, pulsar WASD no lanza errores y no queda ningún loop activo.
- [ ] Con emulación táctil en Playwright, `/games/serpentina/play` muestra "REQUIERE TECLADO", no hay `<canvas>` y no se pide `fruits.png`.
- [ ] La serpiente, el borde, la barra y el destello usan los colores de `PALETTE`, y el canvas se ve nítido con `devicePixelRatio` 2.
- [ ] `public/games/serpentina/fruits.png` mide 3790×160 y es la única imagen que se pide al abrir `/games/serpentina/play`.
- [ ] Tras la migración, `select long from games where id = 'serpentina'` devuelve el texto nuevo y coincide con `GAMES`.
- [ ] Tras la migración, `select count(*) from scores where game_id = 'serpentina'` devuelve 0 antes de jugar, y `/games/serpentina` y su pestaña de `/salon` muestran "SIN PUNTUACIONES TODAVÍA".
- [ ] `list_migrations` muestra `serpentina_real`.

## Decisiones

- **Sí:** juego original diseñado en esta spec a partir de la descripción del usuario, porque no hay código de referencia. Las reglas son de un Snake genérico, no la copia de una versión comercial concreta. Elegido por el usuario.
- **Sí:** sustituir la partida simulada de `serpentina`. **No:** un juego nuevo `snake`, que necesitaría fila, entrada en `GAMES` y cover nuevas para un género que el catálogo ya tiene. Elegido por el usuario.
- **Sí:** título SERPENTINA, `short`, categoría ARCADE, `cover-snake`, color green y posición 3 sin cambios. **No:** "SNAKE" como título, porque el catálogo usa nombres propios en español. Elegido por el usuario.
- **Sí:** `long` nuevo que habla de fruta pixelada en lugar de "núcleos magenta", en `games` y en `GAMES`. Elegido por el usuario.
- **Sí:** vaciar las 12 puntuaciones aleatorias de `serpentina` en la misma migración que el `long` (`serpentina_real`), como hizo CAÍDA. Elegido por el usuario.
- **Sí:** tablero cuadrado de 20 × 20 celdas de 30 px dentro de un canvas de 800×600, con franjas laterales vacías. **No:** canvas de 800×800, que rompe el 4:3 de `.crt-screen` y obligaría a cambiar `GameShell` y los otros tres juegos en una spec previa. **No:** celdas de 40 px (15 × 15), con menos recorrido. Elegido por el usuario.
- **Sí:** solo WASD. **No:** flechas. Como WASD no hace scroll, el motor no aplica `preventDefault` a ninguna tecla. Las teclas se leen por `e.code` para que funcionen con Bloq Mayús y con distribuciones distintas. Elegido por el usuario.
- **Sí:** paredes sólidas que quitan una vida. **No:** tablero toroidal. Elegido por el usuario.
- **Sí:** arranque y reaparición en espera hasta pulsar una dirección, con el aviso "PULSA W A S D". Tomado de las recomendaciones, aceptado por el usuario.
- **Sí:** tick de `max(60, 140 − (nivel − 1) × 10)` ms, nivel cada 5 frutas sin tope, fruta normal de 10 × nivel y bonus de 50 × nivel cada 5 frutas normales durante 6 s. Tomado de las recomendaciones, aceptado por el usuario.
- **Sí:** búfer de 2 giros. **No:** aceptar solo el último giro del tick, que hace perder giros rápidos en U. Tomado de las recomendaciones, aceptado por el usuario.
- **Sí:** 3 vidas, conservando puntuación, nivel y fruta al reaparecer. La bonus desaparece al perder una vida para que no se pueda esperar quieto a cogerla. Tomado de las recomendaciones, aceptado por el usuario.
- **Sí:** sin victoria. Llenar el tablero acaba la partida como `end()`. Tomado de las recomendaciones, aceptado por el usuario.
- **Sí:** HUD de `GameShell` sin cambios (PUNTUACIÓN, VIDAS, NIVEL). En el canvas solo hay jugabilidad: barra del bonus, aviso de arranque y destello. Tomado de las recomendaciones, aceptado por el usuario.
- **Sí:** sprites de la fila pixel art, recortada a `public/games/serpentina/fruits.png` y cargada antes del primer frame. **No:** copiar `fruits.png` entero (585 KB con dos filas que no se usan). Elegido por el usuario.
- **Sí:** corregir los nombres de `sprites.js` en `sprites.ts`, conservando las coordenadas. Los nombres originales no coinciden con los recortes.
- **Sí:** la piña es la fruta bonus y también puede salir como normal. El glow dorado y la barra de tiempo la distinguen. Se mantienen los 22 sprites acordados para la fruta normal.
- **Sí:** serpiente redibujada en canvas con la paleta neón y glow. Las frutas son los únicos sprites. Elegido por el usuario.
- **Sí:** sin sonido, igual que los otros tres juegos. Elegido por el usuario.
- **Sí:** aviso "REQUIERE TECLADO" en táctil con `CanvasScreen`. **No:** controles táctiles en esta spec. Elegido por el usuario.
- **Sí:** usar `useCanvasGame` y `CanvasScreen` de la SPEC 07 sin cambios. **No:** extraer ni duplicar nada, porque el hook ya existe.
- **Sí:** el leaderboard se hereda de `GameShell` + `submitScore` + `getLeaderboard`. **No:** código de ranking propio del juego.
- **Sí:** ruta estática `app/games/serpentina/play/page.tsx`. **No:** un `if` en la ruta genérica.
- **Sí:** motor en `lib/games/snake/` y componente en `components/games/`, como los otros tres juegos. `entities.ts` contiene funciones puras, y `sprites.ts` va aparte porque el atlas venía en su propio archivo.
- **Sí:** paleta neón con glow, diseñada con `/frontend-design`. Exigido por `CLAUDE.md`.
- **Sí:** los callbacks solo se emiten cuando cambia el valor, para no provocar un render de React en cada frame.

## Riesgos

| Riesgo                                                                                             | Mitigación                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Los sprites son de terceros (el Snake de Google, vía spriters-resource) y tienen copyright         | Aceptado mientras Arcade Vault sea un proyecto de práctica. Antes de publicarlo, se sustituyen por arte propio en otra spec. Solo cambiaría el PNG y `FRUITS`. |
| El juego arranca antes de que cargue `fruits.png`, o el motor se destruye durante la carga         | Estado `loading` sin loop hasta el `onload`. `destroy` marca el motor como destruido y el `onload` tardío no arranca nada.                                     |
| `fruits.png` no carga (404 o red)                                                                  | En `onerror` el motor pasa a `ready` y dibuja la fruta como un círculo de color de `PALETTE`. El juego sigue siendo jugable.                                   |
| Los nombres corregidos de los sprites siguen sin coincidir con algún recorte                       | Comprobación visual de los 22 en el paso 2. Se corrige el nombre, no la coordenada.                                                                            |
| Pixel art borroso al escalar 160 px a 28 px o con `devicePixelRatio` 2                             | `imageSmoothingEnabled = false` después de cada `setTransform`. Hay un criterio de nitidez.                                                                    |
| Listeners o `requestAnimationFrame` que sobreviven al desmontar                                    | `destroy` idempotente y criterio de navegación sin errores. StrictMode lo prueba en desarrollo.                                                                |
| WASD mueve la serpiente mientras se escriben las iniciales en el modal                             | El motor ignora el teclado en `gameover` y con foco en `input`/`textarea`. Hay un criterio específico.                                                         |
| Salto de `dt` al reanudar o al volver de otra pestaña (la serpiente avanza varias celdas de golpe) | `resume` reinicia `lastTime` y el `dt` se limita a 50 ms. Con el tick mínimo de 60 ms, nunca hay más de un paso por frame.                                     |
| Dos giros en el mismo tick hacen que la serpiente se coma a sí misma                               | El búfer valida cada giro contra el anterior de la cola, no solo contra `dir`.                                                                                 |
| Renders de React a 60 fps                                                                          | Callbacks solo cuando cambia el valor.                                                                                                                         |
| `create` inestable en el hook recrea el motor en cada render                                       | `createSnakeGame` es una función de módulo, nunca una lambda inline.                                                                                           |
| `shadowBlur` en hasta 400 segmentos baja los FPS                                                   | Glow en la cabeza, el borde, la bonus y el destello. El cuerpo solo lo lleva si se mantiene a 60 fps (se decide en el paso 5).                                 |
| La caché de `getGames()` o del ranking sigue mostrando el `long` o las puntuaciones viejas         | Reiniciar `next dev`; en producción entra con el build.                                                                                                        |

## Lo que **no** entra en esta spec

- Controles táctiles.
- Control con flechas.
- Sonido, música o mute.
- Tablero toroidal, obstáculos o frutas con efectos especiales.
- Filas emoji y realista de `fruits.png`, y arte propio para sustituir los sprites.
- Información en las franjas laterales.
- Canvas cuadrado o cambios en el 4:3 de `.crt-screen`.
- Cambios en `useCanvasGame`, `CanvasScreen` o `GameShell`.
- Cambios en los demás juegos simulados.
- Auth, antitrampas y test runner.

Cada una de estas cosas, si llega, irá en su propia spec.

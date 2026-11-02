# SPEC GJ-vaiven-01 — Juego de cruce de carriles real en VAIVÉN

> **Estado:** Draft
> **Depende de:** SPEC 05, SPEC 06, SPEC 07
> **Fecha:** 2026-10-30
> **Objetivo:** Crear VAIVÉN, un juego original de cruce de carriles a saltos con ida y vuelta, volteo del tablero y rozones con multiplicador, y hacerlo jugable en `/games/vaiven/play` como juego nuevo del catálogo, integrado con el HUD, la pausa, el modal de fin y el ranking de la plataforma.

## Por qué existe esta spec

VAIVÉN no existe en el catálogo. Los 8 juegos de la tabla `games` tienen ficha y ranking, y solo 4 son reales (ROCAS, CAÍDA, BLOQUE BUSTER y SERPENTINA). El género de cruce de carriles solo está representado por RANARIA, que sigue con la partida simulada de `GamePlayer`.

No hay código de referencia en `references/started-games/`. El juego se diseña en esta spec a partir de la idea de cezapx16 para el game jam "cruce de carriles a saltos":

- Un saltador de luz cruza a saltos una autopista de neón y un río de datos.
- Al llegar a la orilla de enfrente, el tablero se **voltea** (espejo horizontal): todos los carriles invierten su sentido y hay que volver bajando.
- En cada viaje los carriles van más rápido.
- Saltar justo cuando un vehículo está a punto de tocarte es un **rozón**, y cada rozón sube un multiplicador de racha.

Es un diseño original dentro del género: no hay casillas de llegada, ranas, troncos, tortugas ni nenúfares. El jugador es un rombo de luz, los obstáculos son vehículos de neón y las plataformas son paquetes de datos.

Esta spec convierte VAIVÉN en el quinto juego real de Arcade Vault y el primero que entra como juego nuevo, con migración de catálogo y cover propia. Usa el hook `useCanvasGame` y el componente `CanvasScreen` de la SPEC 07 sin cambiarlos. El leaderboard se hereda de la SPEC 06 sin código nuevo.

## Alcance

**Entra:**

- Motor nuevo en TypeScript en `lib/games/hopper/`, sin React, con estas reglas:
  - **Tablero de 20 columnas × 14 filas de 40 px** (800×560), más una franja de estado de 800×40 en `y = 560–600`.
  - Filas, de arriba abajo: **orilla norte** (fila 0), **río de datos** (filas 1–5), **mediana** (fila 6), **autopista** (filas 7–12) y **orilla sur** (fila 13). Las orillas y la mediana son zonas seguras.
  - **Saltador:** ocupa una celda de 40×40 con una caja de colisión de 26×26 centrada. Empieza en la orilla sur, columna 10 (`x = 400`).
  - **Saltos:** ↑ ↓ ← → o W S A D mueven una celda (40 px) por pulsación. Se ignora la autorrepetición (`e.repeat`). El salto se ve como una animación de 90 ms, pero la celda lógica cambia en el instante de la pulsación. Un búfer de 1 salto guarda la pulsación que llega durante la animación.
  - Los saltos laterales se limitan a `x = 0–760`. Los verticales, a las filas 0–13. Se puede saltar hacia atrás, pero no suma puntos.
  - **Autopista:** 6 carriles con vehículos que se mueven en horizontal y reaparecen por el lado contrario. Tocar un vehículo cuesta una vida.
  - **Río de datos:** 5 carriles con paquetes de datos que hacen de plataforma y arrastran al saltador. Estar en una fila del río sin un paquete bajo el centro del saltador, o salir del tablero arrastrado por un paquete, cuesta una vida.
  - **Viajes:** la partida empieza con el viaje 1 (ida, de la orilla sur a la norte). Llegar a cualquier celda de la orilla de enfrente completa el viaje y lanza el **volteo**.
  - **Volteo:** 600 ms en los que el tablero gira como una carta sobre su eje vertical (`x = 400`) y todo se congela. Al terminar, cada carril invierte su sentido, todas las entidades y el saltador quedan en su posición reflejada (`x' = 800 − x − ancho`), y el objetivo pasa a ser la orilla de la que se salió. En la vuelta se cruza primero el río y luego la autopista.
  - **Velocidad por viaje:** cada carril va a `velocidad base × speedFor(viaje)`, con `speedFor(v) = min(2.0, 1 + 0.1 × (v − 1))`. Es ×1.0 en el viaje 1, ×1.5 en el 6 y ×2.0 del 11 en adelante.
  - **Rozón:** un salto es rozón si, en el instante de la pulsación, hay un vehículo **que se acerca** al saltador en la fila de origen o en la de destino, con un hueco de 1 a 16 px entre su caja y la del saltador. Solo cuenta en la autopista y como mucho un rozón por salto.
  - **Racha:** multiplicador de x1 a x5. Empieza en x1. Cada rozón la sube en 1 (hasta x5). Vuelve a x1 si pasan **3 s** sin otro rozón o al perder una vida. El volteo no la reinicia y congela su temporizador.
  - **Tiempo:** cada viaje tiene **45 s**. Si se agota, se pierde una vida.
  - **Puntos:**
    - **Avance:** 10 × racha por cada fila nueva alcanzada en el viaje, contando desde la orilla de salida. Las filas ya alcanzadas no vuelven a puntuar, ni siquiera tras perder una vida en ese viaje. Son 13 filas por viaje.
    - **Rozón:** 50 × racha, con la racha ya subida. El primer rozón de una racha da 100.
    - **Llegada:** 100 × viaje + 10 por cada segundo entero que quede de los 45.
  - **Nivel** = número de viaje: NIVEL 01 en la primera ida, 02 en la primera vuelta y así sin tope.
  - **3 vidas.** Al perder una se ve una explosión de 800 ms y el saltador reaparece en la orilla de salida del viaje actual, columna 10, con el tiempo del viaje otra vez a 45 s y la racha a x1. Se conservan la puntuación, el viaje y las filas ya puntuadas. Con 0 vidas se acaba la partida.
  - **Arranque en espera:** al empezar la partida, los carriles se mueven pero el tiempo no corre hasta el primer salto. El canvas muestra "PULSA ↑ PARA SALIR" sobre la orilla sur.
  - **Sin victoria.** Los viajes se repiten sin fin.
- El `dt` del frame se limita a 50 ms. A ×2.0 el carril más rápido (110 px/s) recorre 11 px por frame en el peor caso, menos que la caja del saltador (26 px).
- API del motor `createHopperGame(canvas, callbacks)`, que devuelve `pause / resume / restart / end / destroy`. `destroy` cancela el `requestAnimationFrame` y quita todos los listeners.
- El motor avisa a React solo cuando cambian `score`, `lives` o `level`, y una vez en game over.
- En el canvas solo se dibuja jugabilidad: el tablero, las entidades, el saltador, la explosión, el destello y el texto del rozón, el aviso de arranque, el volteo y la franja de estado con la barra de **TIEMPO**, el **sentido del viaje** (▲ IDA / ▼ VUELTA) y la **RACHA** (x1–x5 con su barra de caducidad). No se dibujan puntuación, vidas, nivel ni overlays de pausa o fin.
- `preventDefault` en `ArrowUp`, `ArrowDown`, `ArrowLeft` y `ArrowRight` mientras se juega, para que la página no haga scroll. Nunca se aplica con el foco en un `input` o `textarea`, ni en pausa ni en `gameover`. WASD no lo necesita. Las teclas se leen por `e.code`.
- Al pausar se vacía el búfer de salto, y durante la pausa el motor ignora el teclado.
- Resolución lógica fija de 800×600 (4:3), escalada con CSS al `.crt-screen`, con el buffer multiplicado por `devicePixelRatio`.
- Todo se dibuja en canvas con la paleta neón de la plataforma y glow (`shadowBlur`), diseñado con `/frontend-design`. No hay assets.
- Componente cliente `components/games/hopper-game.tsx`, que usa `useCanvasGame` y `CanvasScreen` y conecta el motor con `GameShell`.
- Ruta estática `app/games/vaiven/play/page.tsx`, que tiene prioridad sobre `app/games/[id]/play/page.tsx`. La ruta genérica no se toca.
- Pausa por tres vías con un único estado de React (la del hook): botón PAUSA/REANUDAR, teclas `P`/`Escape` y `visibilitychange`.
- Fin de partida: `onLives(0)` y luego `onGameOver(score)`, que abre el modal "FIN DEL JUEGO". FIN llama a `end()` y JUGAR DE NUEVO a `restart()`.
- GUARDAR PUNTUACIÓN usa `submitScore` (heredado de `GameShell`). La puntuación aparece en el TOP 10 de `/games/vaiven` y en la pestaña VAIVÉN de `/salon`.
- En dispositivos sin teclado (`(hover: none) and (pointer: coarse)`), el CRT muestra "REQUIERE TECLADO" y el motor no se crea. Viene de `CanvasScreen`.
- Juego nuevo en el catálogo:
  - Fila `vaiven` en `games` por migración, en `sort_order` 9 (el máximo actual es 8).
  - Entrada de respaldo en `GAMES` de `app/data/games.ts`, al final.
  - Cover `.cover-vaiven` en `app/globals.css`, diseñada con `/frontend-design`.
  - Ranking vacío, sin seed: "SIN PUNTUACIONES TODAVÍA".

**Fuera de alcance (specs futuras):**

- Las novedades por viaje: paquetes que se comprimen, ráfagas de carril, ralentí y mediana electrificada (SPEC GJ-vaiven-02).
- Controles táctiles.
- Sonido, música o botón de mute.
- Vidas extra, power-ups, casillas de llegada o cualquier mecánica que no esté en esta spec.
- Rozones con los paquetes del río.
- Una métrica RACHA o TIEMPO en el HUD de React (ampliar `GameShell`).
- Cambios en `useCanvasGame`, `CanvasScreen` o `GameShell`.
- Hacer real RANARIA o cambiar cualquier otro juego simulado.
- Auth real y antitrampas (siguen como en la SPEC 06).
- Instalar un test runner o escribir tests del motor.

## Modelo de datos

No cambia el esquema. Las puntuaciones van a la tabla `scores` de la SPEC 06. Lo nuevo es la API del motor, la tabla de carriles y una migración de datos con la fila `vaiven` en `games`.

### Motor (`lib/games/hopper/engine.ts`)

```ts
export type HopperCallbacks = {
  onScore: (score: number) => void; // solo cuando cambia
  onLives: (lives: number) => void; // solo cuando cambia
  onLevel: (level: number) => void; // solo cuando cambia (número de viaje)
  onGameOver: (score: number) => void; // una vez por partida
};

export type HopperGame = {
  pause: () => void; // detiene el loop, vacía el búfer de salto e ignora el teclado
  resume: () => void; // reanuda sin salto de dt (reinicia lastTime)
  restart: () => void; // viaje 1, 3 vidas, 0 puntos, racha x1, carriles iniciales, fase ready; reemite los valores iniciales
  end: () => void; // fuerza game over con la puntuación actual → onLives(0) + onGameOver
  destroy: () => void; // cancela rAF y quita listeners; idempotente
};

export function createHopperGame(
  canvas: HTMLCanvasElement,
  callbacks: HopperCallbacks,
): HopperGame;
```

Estado interno:

```ts
type Dir = 1 | -1; // 1 = hacia la derecha
type HopKey = "up" | "down" | "left" | "right";

type Lane = {
  row: number; // 1–5 río, 7–12 autopista
  kind: "data" | "road";
  dir: Dir; // se invierte en cada volteo
  base: number; // px/s a ×1.0
  len: number; // largo de cada entidad en px
  vehicle: "moto" | "coche" | "camion" | null; // null en el río
  xs: number[]; // x izquierda de cada entidad
};

const state = {
  phase: "ready" as
    "ready" | "playing" | "dying" | "flipping" | "paused" | "gameover",
  resumeTo: "playing" as "ready" | "playing" | "dying" | "flipping", // fase a la que vuelve resume
  lanes: [] as Lane[],
  player: { x: 400, row: 13, hop: 0 }, // hop: ms restantes de la animación (90 → 0)
  queued: null as HopKey | null, // búfer de 1 salto
  trip: 1, // viaje actual = nivel
  heading: "up" as "up" | "down", // ida (up) o vuelta (down)
  progress: 0, // filas nuevas alcanzadas en el viaje (0–13)
  tripMs: 45000, // tiempo restante del viaje
  streak: 1, // racha x1–x5
  streakMs: 0, // ms hasta que la racha caduca (0 = inactiva)
  phaseMs: 0, // ms restantes de dying (800) o flipping (600)
  particles: [] as {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
  }[],
  rozonFx: [] as { x: number; y: number; text: string; life: number }[], // "ROZÓN x3", 600 ms
  score: 0,
  lives: 3,
};
```

- En `ready` los carriles se mueven y `tripMs` no baja. El primer salto válido pasa a `playing`. `ready` solo existe al empezar la partida y tras `restart()`.
- En `playing`, cada frame: mover los carriles, arrastrar al saltador si está en el río, comprobar muerte (río sin paquete, borde, vehículo, tiempo) y bajar `tripMs` y `streakMs`.
- Un salto llega por `keydown`. Si `hop > 0`, se guarda en `queued` (sustituye al anterior) y se ejecuta al terminar la animación. Al saltar se comprueba el rozón con las posiciones de ese instante y luego se cambia la celda.
- `progress` mide filas desde la orilla de salida: en la ida es `13 − row` y en la vuelta es `row`. Cuando un salto lo supera, se suma `10 × streak` por fila nueva y se actualiza.
- Al aterrizar en la fila objetivo (0 en la ida, 13 en la vuelta) se suma la llegada (`100 × trip + 10 × floor(tripMs / 1000)`) y se pasa a `flipping` durante 600 ms.
- Al terminar `flipping`: `dir *= −1` en cada carril, `x' = 800 − x − len` en cada entidad, `player.x' = 800 − player.x − 40`, `heading` cambia, `trip += 1` (con `onLevel`), `progress = 0`, `tripMs = 45000` y vuelta a `playing`.
- Al perder una vida: `lives −= 1` (con `onLives`), `streak = 1`, explosión de 12 partículas y `dying` durante 800 ms. Después, el saltador vuelve a la orilla de salida (fila 13 en la ida, 0 en la vuelta), columna 10, con `tripMs = 45000`. `progress` se conserva.
- Al perder la última vida, el motor hace `lives = 0`, emite `onLives(0)` y `onGameOver(score)`. `end()` hace lo mismo con la puntuación actual.
- En `gameover` el motor sigue animando las partículas y los carriles, pero ignora el teclado y no aplica `preventDefault`.
- `pause()` guarda la fase en `resumeTo` y pasa a `paused`. `resume()` vuelve a `resumeTo`. Ningún temporizador corre en `paused`.
- Al crearse emite `onScore(0)`, `onLives(3)` y `onLevel(1)`.
- La puntuación se limita a 9.999.999 con `Math.min`. Un viaje da como mucho unos 3.000 puntos en el viaje 20, así que el límite no se alcanza en la práctica.

### Carriles (`lib/games/hopper/lanes.ts`)

Sentido y velocidad en el viaje 1 (ida). `→` es `dir = 1`.

| Fila | Tipo      | Sentido | Base (px/s) | Entidad         | Largo (px) | Cantidad |
| ---- | --------- | ------- | ----------- | --------------- | ---------- | -------- |
| 1    | río       | →       | 45          | paquete         | 160        | 3        |
| 2    | río       | ←       | 65          | paquete         | 120        | 3        |
| 3    | río       | →       | 35          | paquete         | 200        | 2        |
| 4    | río       | ←       | 75          | paquete         | 80         | 4        |
| 5    | río       | →       | 55          | paquete         | 120        | 3        |
| 7    | autopista | ←       | 85          | moto de luz     | 40         | 4        |
| 8    | autopista | →       | 65          | coche           | 60         | 3        |
| 9    | autopista | ←       | 110         | coche           | 60         | 2        |
| 10   | autopista | →       | 50          | camión de carga | 120        | 2        |
| 11   | autopista | ←       | 95          | coche           | 60         | 3        |
| 12   | autopista | →       | 70          | moto de luz     | 40         | 4        |

```ts
export type LaneDef = Omit<Lane, "xs"> & { count: number };
export const LANES: LaneDef[]; // las 11 filas de la tabla
export const LOOP = 960; // las entidades circulan entre x = −80 y x = 880
export function speedFor(trip: number): number; // min(2.0, 1 + 0.1 × (trip − 1))
export function createLanes(): Lane[]; // posiciones iniciales del viaje 1
```

- Las entidades de un carril se reparten a `LOOP / count` px de distancia, empezando en `x = −80 + (row × 37) % (LOOP / count)` para que los carriles no salgan alineados.
- Al pasar de `x = 880` (sentido →) o de `x + len = −80` (sentido ←), una entidad se desplaza `LOOP` px en sentido contrario.
- `restart()` vuelve a llamar a `createLanes()`, así que el viaje 1 siempre empieza igual.

### Colisiones y rozón

| Comprobación      | Regla                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Caja del saltador | `x + 7` a `x + 33` en horizontal, en su fila                                                                                                     |
| Caja del vehículo | `x + 3` a `x + len − 3` en horizontal, en su fila                                                                                                |
| Choque            | Las dos cajas se solapan en la misma fila de la autopista                                                                                        |
| Soporte en el río | El centro del saltador (`x + 20`) está entre `x` y `x + len` de algún paquete de su fila                                                         |
| Borde             | En el río, el centro del saltador sale de `0–800`                                                                                                |
| Rozón             | Al pulsar, un vehículo de la fila de origen o de destino (solo autopista) se mueve hacia el saltador y el hueco entre cajas está entre 1 y 16 px |

- El rozón se evalúa antes de mover al saltador. Si el salto acaba en choque, la vida se pierde igual, pero el rozón ya sumado se queda.
- El choque y el soporte se comprueban cada frame en `playing`, también durante la animación del salto, con la celda lógica nueva.

### Pantalla 800×600

| Elemento          | Posición (px lógicos)                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Orilla norte      | Fila 0, `y = 0–40`. Zona segura                                                                                           |
| Río de datos      | Filas 1–5, `y = 40–240`. Fondo con rayas de flujo que se mueven en el sentido de cada carril                              |
| Mediana           | Fila 6, `y = 240–280`. Zona segura                                                                                        |
| Autopista         | Filas 7–12, `y = 280–520`. Líneas discontinuas entre carriles                                                             |
| Orilla sur        | Fila 13, `y = 520–560`. Zona segura y salida del viaje 1                                                                  |
| Vehículos         | Alto de 28 px centrado en el carril. Moto 40, coche 60 y camión 120 de largo, con un faro en el frente según el sentido   |
| Paquetes de datos | Alto de 30 px centrado en el carril, con el largo de la tabla de carriles                                                 |
| Saltador          | Rombo de luz de 28×28 centrado en su celda. Durante el salto se estira un 20 % en la dirección del movimiento             |
| Aviso de arranque | "PULSA ↑ PARA SALIR" centrado en `x = 400`, `y = 500`, en `monospace`, solo en `ready`                                    |
| Texto del rozón   | "ROZÓN x3" encima del saltador, sube 20 px y se desvanece en 600 ms                                                       |
| Volteo            | Todo el tablero (`y = 0–560`) se dibuja con `scaleX = cos(π × t)` alrededor de `x = 400`, con `t` de 0 a 1 en 600 ms      |
| Franja de estado  | `y = 560–600`. No se voltea                                                                                               |
| TIEMPO            | Etiqueta en `x = 20`, `y = 572` y barra de 360×6 en `x = 20`, `y = 582`. Se acorta de 360 a 0 px en 45 s                  |
| Sentido           | "▲ IDA" o "▼ VUELTA" centrado en `x = 480`, `y = 586`                                                                     |
| RACHA             | "x1"–"x5" en `x = 620`, `y = 586`, y barra de 120×4 en `x = 660`, `y = 584` que se vacía en 3 s. Con x1 la barra no se ve |

- En el volteo, a mitad de animación (`scaleX = 0`) el tablero se ve de canto. A partir de ahí `scaleX` es negativo y se ve la imagen reflejada, que coincide con el estado que se aplica al terminar, así que no hay salto visual.
- Los textos usan `monospace`, como el indicador `3x` de ROCAS y el panel de CAÍDA.

### Archivos del motor

| Archivo                         | Contenido                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/games/hopper/constants.ts` | `W`, `H`, `COLS = 20`, `ROWS = 14`, `CELL = 40`, `STATUS_Y = 560`, `START_COL = 10`, `START_LIVES = 3`, `HOP_MS = 90`, `TRIP_MS = 45000`, `FLIP_MS = 600`, `DYING_MS = 800`, `ROZON_PX = 16`, `STREAK_MAX = 5`, `STREAK_MS = 3000`, `POINTS_ROW = 10`, `POINTS_ROZON = 50`, `POINTS_ARRIVAL = 100`, `POINTS_PER_SECOND = 10`, `MAX_SCORE = 9999999`, `PALETTE` y `GLOW` |
| `lib/games/hopper/lanes.ts`     | `LANES`, `LOOP`, `speedFor(trip)` y `createLanes()`                                                                                                                                                                                                                                                                                                                     |
| `lib/games/hopper/entities.ts`  | Funciones puras: `stepLanes`, `mirrorLanes`, `hitsVehicle`, `supportOf`, `rozonOf`, y `drawBoard`, `drawLane`, `drawPlayer`, `drawParticles`, `drawRozonFx`, `drawPrompt` y `drawStatus`, que reciben `ctx`                                                                                                                                                             |
| `lib/games/hopper/engine.ts`    | Estado, entrada, `update`, `draw` (con la transformación del volteo), loop y `createHopperGame`                                                                                                                                                                                                                                                                         |

`lanes.ts` es un archivo más que en ROCAS y CAÍDA, igual que `levels.ts` en BLOQUE BUSTER, porque la tabla de carriles es la que se ajusta al equilibrar el juego y la SPEC GJ-vaiven-02 la amplía.

### Paleta

`PALETTE` usa los hex de los tokens de `app/globals.css`, porque el canvas no lee variables CSS. Los colores finales los decide `/frontend-design`, partiendo de esta propuesta:

```ts
export const PALETTE = {
  bg: "#000",
  safe: "#15151f", // --bg-3 (orillas y mediana)
  safeEdge: "#00ff88", // --green (color de VAIVÉN)
  road: "#0a0a0f", // --bg
  laneLine: "rgba(255,255,255,0.06)", // --line-2
  data: "#0f0f18", // --bg-2 (fondo del río)
  dataFlow: "rgba(0,245,255,0.18)", // --line
  packet: "#00f5ff", // --cyan
  moto: "#ff006e", // --magenta
  coche: "#f5ff00", // --yellow
  camion: "#d97a3a", // --bronze
  player: "#00ff88", // --green
  rozon: "#ffcf3a", // --gold
  death: "#ff006e", // --magenta
  timeOk: "#00ff88", // --green
  timeLow: "#ff006e", // --magenta, con 10 s o menos
  label: "#4a4f70", // --ink-faint
  text: "#8a8fb5", // --ink-dim
  ink: "#e6e9ff", // --ink
} as const;
```

### Catálogo (`supabase/migrations/20261030000000_game_vaiven.sql`)

```sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order) values
  ('vaiven', 'VAIVÉN', 'Cruza, voltea y vuelve más rápido.', 'Salta carril a carril por una autopista de neón y un río de datos. Al llegar a la otra orilla el tablero se voltea y toca volver, cada viaje más rápido. Esquiva por los pelos y la racha multiplica tus puntos.', 'ARCADE', 'cover-vaiven', 'green', 9)
on conflict (id) do nothing;
```

- La misma entrada se añade al final de `GAMES` en `app/data/games.ts`, después de `duelo-pixel`.
- Sin seed de puntuaciones: el ranking empieza vacío.
- No cambia el esquema: `lib/supabase/database.types.ts` no se regenera.

### Cover (`app/globals.css`)

- `.cover-vaiven` y su `::after` (y `::before` si hace falta), en CSS puro como las demás covers, junto a `.cover-duelo`.
- Propuesta de partida para `/frontend-design`: fondo degradado de `#002a1a` a `#0a0a18`, franjas horizontales de carriles (`--line-2` y `--line`), un rombo `--green` con glow en el centro y dos chevrones ▲▼ que sugieren la ida y vuelta. Debe distinguirse a simple vista de `.cover-rana` (franjas cian y círculo verde).

### Estructura final

```
app/games/vaiven/play/page.tsx                        (nuevo)
components/games/hopper-game.tsx                      (nuevo)
lib/games/hopper/constants.ts                         (nuevo)
lib/games/hopper/lanes.ts                             (nuevo)
lib/games/hopper/entities.ts                          (nuevo)
lib/games/hopper/engine.ts                            (nuevo)
supabase/migrations/20261030000000_game_vaiven.sql    (nuevo)
app/data/games.ts                                     (modificado: entrada vaiven)
app/globals.css                                       (modificado: cover-vaiven)
```

## Plan de implementación

1. **Catálogo en Supabase y cover.**
   - Crear `supabase/migrations/20261030000000_game_vaiven.sql`, aplicarla con `apply_migration` (nombre `game_vaiven`) y revisar `get_advisors`.
   - Añadir la entrada `vaiven` al final de `GAMES`.
   - Diseñar `.cover-vaiven` con `/frontend-design` y añadirla a `app/globals.css`.
   - Comprobar con `execute_sql` que `select * from games where id = 'vaiven'` devuelve la fila con `sort_order = 9` y que `scores` no tiene filas de `vaiven`.
   - Resultado: VAIVÉN aparece en `/games` en la posición 9 con su cover, su ficha muestra "SIN PUNTUACIONES TODAVÍA", `/salon` tiene una pestaña más y `/games/vaiven/play` todavía usa la partida simulada.
2. **Motor: tablero, carriles y saltos.**
   - Crear `constants.ts`, `lanes.ts`, `entities.ts` y `engine.ts` con el tablero, los 11 carriles, el arrastre del río, los saltos con búfer, las muertes (vehículo, río, borde, tiempo), las vidas con explosión y reaparición, el avance por filas y la fase `ready`. En este paso todo se dibuja con colores planos.
   - Entrada con `keydown` en `window` por `e.code`, registrada en `createHopperGame` y quitada en `destroy`. `preventDefault` en las flechas según el alcance.
   - Implementar `pause / resume / restart / end / destroy`, los callbacks (con `lives` 3 → 0), el límite de `dt` y el escalado HiDPI.
   - Todavía no lo usa nadie. Resultado: `npm run build` y `npm run lint` pasan.
3. **Motor: rozón, racha, llegada y volteo.**
   - Añadir `rozonOf`, la racha con su caducidad de 3 s, los puntos de rozón y de llegada, la animación del volteo con `mirrorLanes`, el cambio de viaje con `speedFor` y la franja de estado (TIEMPO, sentido y RACHA).
   - Todavía no lo usa nadie. Resultado: `npm run build` y `npm run lint` pasan.
4. **Componente y ruta.**
   - Crear `components/games/hopper-game.tsx` (`"use client"`) con `useCanvasGame(createHopperGame, { score: 0, lives: 3, level: 1 })`, `<GameShell>` y `<CanvasScreen>`, igual que `snake-game.tsx`.
   - Crear `app/games/vaiven/play/page.tsx` con `getGame("vaiven")`, igual que la ruta de SERPENTINA.
   - Resultado: VAIVÉN es jugable de principio a fin y GUARDAR PUNTUACIÓN crea una fila en `scores`.
5. **Paleta neón.**
   - Usar `/frontend-design` para fijar `PALETTE`, `GLOW`, el rombo del saltador y su estiramiento, los vehículos con faro, los paquetes, las rayas del flujo, la explosión, el destello del rozón y la franja de estado, y aplicarlos en `entities.ts` y `engine.ts`.
   - El glow va en el saltador, los vehículos, el destello del rozón y el borde de las orillas. Los paquetes solo lo llevan si el rendimiento lo permite (ver Riesgos).
6. **Verificación final.**
   - `npm run build` y `npm run lint`.
   - Recorrer los criterios de aceptación con el MCP de Playwright y el de Supabase.
   - Partida manual completa de al menos 3 viajes (el usuario).

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `app/games/[id]/play/page.tsx`, `components/games/game-shell.tsx` y `components/games/use-canvas-game.tsx` no aparecen en `git diff`.
- [ ] `/games/ranaria/play`, `/games/gloton/play`, `/games/invasores/play` y `/games/duelo-pixel/play` se ven y se comportan igual que antes (partida simulada).
- [ ] `/games/rocas/play`, `/games/caida/play`, `/games/bloque-buster/play` y `/games/serpentina/play` funcionan igual que antes.
- [ ] `/games/vaiven/play` muestra un `<canvas>` dentro de `.crt-screen` que ocupa todo el ancho manteniendo 4:3, sin errores en consola.
- [ ] El canvas muestra, de arriba abajo, la orilla norte, 5 carriles de río, la mediana, 6 carriles de autopista, la orilla sur y la franja de estado, con filas de 40 px.
- [ ] Al iniciar, el HUD de React muestra PUNTUACIÓN 0, VIDAS ♥ ♥ ♥ y NIVEL 01. El canvas no dibuja puntuación, vidas ni nivel.
- [ ] Al iniciar, el saltador está en la orilla sur, columna 10, los carriles se mueven, la barra de TIEMPO no baja y el canvas muestra "PULSA ↑ PARA SALIR". El primer salto arranca el tiempo.
- [ ] ↑ ↓ ← → y W S A D mueven el saltador exactamente una celda por pulsación. Mantener una tecla no lo mueve más de una celda.
- [ ] El saltador no sale de las columnas 0–19 al saltar en horizontal.
- [ ] En el viaje 1 los carriles van al sentido y la velocidad de la tabla de carriles (por ejemplo, la fila 9 recorre unos 110 px/s hacia la izquierda).
- [ ] Tocar un vehículo baja VIDAS en uno, se ve una explosión de unos 800 ms y el saltador reaparece en la orilla de salida, columna 10, con la barra de TIEMPO llena.
- [ ] Saltar al río sin paquete debajo, o dejarse arrastrar por un paquete fuera del tablero, baja VIDAS en uno.
- [ ] Sobre un paquete, el saltador se mueve con él a la velocidad de su carril.
- [ ] Cada fila nueva alcanzada en el viaje sube la PUNTUACIÓN 10 × racha. Volver atrás y avanzar otra vez por la misma fila no suma. Tras perder una vida, las filas ya puntuadas de ese viaje no vuelven a sumar.
- [ ] Saltar cuando un vehículo que se acerca está a 16 px o menos (sin tocar) muestra "ROZÓN x2", suma 100 por el rozón y la RACHA de la franja pasa a x2. Un segundo rozón antes de 3 s la pasa a x3 y suma 150. Si el salto además alcanza una fila nueva, se suman también sus 10 × racha (con la racha ya subida).
- [ ] Saltar con un vehículo cercano que se aleja no es rozón.
- [ ] La RACHA no pasa de x5. Si pasan 3 s sin rozón, o se pierde una vida, vuelve a x1.
- [ ] Al llegar a la orilla norte en el viaje 1 con 30 s restantes y racha x1, el último salto sube la PUNTUACIÓN 410 (10 de la fila 13 + 100 × 1 + 10 × 30), el tablero se voltea en unos 600 ms y NIVEL pasa a 02.
- [ ] Tras el volteo, todos los carriles van en sentido contrario, el saltador está en la orilla norte en su posición reflejada, la franja muestra "▼ VUELTA" y la barra de TIEMPO está llena.
- [ ] En el viaje 2 los carriles van un 10 % más rápido que en el viaje 1. En el viaje 11 y siguientes van al doble.
- [ ] Al llegar a la orilla sur en el viaje 2, el tablero se voltea otra vez, NIVEL pasa a 03, la franja muestra "▲ IDA" y los carriles recuperan el sentido del viaje 1.
- [ ] Durante el volteo, las teclas de salto no mueven al saltador y la barra de TIEMPO no baja.
- [ ] Si la barra de TIEMPO llega a 0, VIDAS baja en uno. Con 10 s o menos la barra cambia de color.
- [ ] Pulsar las flechas en `/games/vaiven/play` no hace scroll en la página.
- [ ] PAUSA congela el canvas y muestra "EN PAUSA". REANUDAR continúa sin saltos. `P` y `Escape` hacen lo mismo.
- [ ] Pausar durante el volteo o la explosión y reanudar: la animación sigue donde estaba.
- [ ] Durante la pausa, las flechas y WASD no mueven al saltador. Al reanudar no se ejecuta ningún salto pendiente.
- [ ] Cambiar de pestaña y volver: el juego está en pausa, los vehículos no han avanzado de golpe y la barra de TIEMPO y la de RACHA no han corrido.
- [ ] Al perder la tercera vida, VIDAS pasa a "—" y se abre "FIN DEL JUEGO" con la puntuación final. FIN hace lo mismo con la puntuación actual.
- [ ] Con el modal abierto se pueden escribir iniciales con W, A, S, D, flechas y espacios, y el saltador no se mueve.
- [ ] GUARDAR PUNTUACIÓN muestra "GUARDANDO…" y luego "▸ PUNTUACIÓN GUARDADA_", y aparece una fila nueva en `scores` con `game_id = 'vaiven'`.
- [ ] Una puntuación que entra en el TOP 10 aparece en `/games/vaiven` y en la pestaña VAIVÉN de `/salon` sin recargar la caché, y coincide con `leaderboard('vaiven', 10)`.
- [ ] JUGAR DE NUEVO cierra el modal y empieza una partida nueva: PUNTUACIÓN 0, VIDAS ♥ ♥ ♥, NIVEL 01, RACHA x1, "▲ IDA", carriles del viaje 1 y fase de espera con "PULSA ↑ PARA SALIR".
- [ ] Al navegar de `/games/vaiven/play` a otra página, pulsar flechas o WASD no lanza errores, la página hace scroll con normalidad y no queda ningún loop activo.
- [ ] Con emulación táctil en Playwright, `/games/vaiven/play` muestra "REQUIERE TECLADO" y no hay `<canvas>`.
- [ ] El saltador, los vehículos, los paquetes, el destello del rozón y la franja de estado usan los colores de `PALETTE`, y el canvas se ve nítido con `devicePixelRatio` 2.
- [ ] No se pide ninguna imagen ni audio en la red al abrir `/games/vaiven/play`.
- [ ] `select * from games where id = 'vaiven'` devuelve la fila con `cat = 'ARCADE'`, `color = 'green'`, `cover = 'cover-vaiven'` y `sort_order = 9`.
- [ ] `/games` muestra VAIVÉN en la posición 9 y con el filtro ARCADE. La home sigue mostrando los mismos 6 juegos.
- [ ] La cover `.cover-vaiven` se ve en la tarjeta de `/games` y en la ficha `/games/vaiven`, y se distingue de `.cover-rana`.
- [ ] `/games/vaiven` y la pestaña VAIVÉN de `/salon` muestran "SIN PUNTUACIONES TODAVÍA" antes de la primera partida guardada, y `/salon` muestra 9 pestañas.
- [ ] Sin las variables de Supabase, VAIVÉN sale del respaldo de `GAMES` con MEJOR PUNTUACIÓN 0.
- [ ] `list_migrations` muestra `game_vaiven`.

## Decisiones

- **Sí:** juego original diseñado en esta spec a partir de la idea de cezapx16: ida y vuelta, volteo del tablero, carriles más rápidos por viaje y rozón con multiplicador. **No:** copiar elementos reconocibles de un juego comercial del género (ranas, troncos, tortugas, nenúfares, casillas de llegada). Pedido en el tema.
- **Sí:** juego nuevo `vaiven` en `sort_order` 9. **No:** sustituir el simulado `ranaria`, que es del mismo género pero tiene otro título, otra cover y otra propuesta en el TODO. Tomado de las recomendaciones (pendiente de confirmar).
- **Sí:** título VAIVÉN, id `vaiven` (sin tilde, por el `check` del id), categoría ARCADE y color green. Pedido en el tema (pendiente de confirmar el color, porque green ya lo usan 3 juegos).
- **Sí:** `short` "Cruza, voltea y vuelve más rápido." y un `long` que menciona la autopista, el río de datos, el volteo y la racha. Tomado de las recomendaciones.
- **Sí:** ranking vacío, sin seed. **No:** 12 puntuaciones inventadas. Tomado de las recomendaciones (pendiente de confirmar).
- **Sí:** el volteo es un espejo horizontal de 600 ms que invierte el sentido de todos los carriles, y se vuelve bajando. **No:** un giro de 180°, que dejaría la meta otra vez arriba. Pedido en el tema (interpretación pendiente de confirmar).
- **Sí:** cualquier celda de la orilla de enfrente completa el viaje. **No:** casillas de llegada que haya que rellenar, por originalidad y porque la ida y vuelta ya da el objetivo. Tomado de las recomendaciones.
- **Sí:** rozón con un hueco de 1 a 16 px, solo con vehículos que se acercan, en la fila de origen o de destino, uno por salto. **No:** rozones con paquetes del río. Pedido en el tema (umbral pendiente de confirmar).
- **Sí:** racha x1–x5 que caduca a los 3 s sin rozón y se pierde al morir. Tomado de las recomendaciones (pendiente de confirmar).
- **Sí:** 45 s por viaje, con una vida perdida al agotarse. Evita esperar indefinidamente a que pase el vehículo perfecto. Tomado de las recomendaciones (pendiente de confirmar).
- **Sí:** puntos de avance solo por filas nuevas del viaje, que se conservan al morir. **No:** puntos por cualquier salto hacia delante, que permitiría farmear yendo y viniendo. Tomado de las recomendaciones.
- **Sí:** velocidad `min(2.0, 1 + 0.1 × (viaje − 1))`. Pedido en el tema ("los carriles más rápidos en cada viaje"); los números son de las recomendaciones.
- **Sí:** NIVEL = número de viaje y 3 vidas. El juego encaja en las tres métricas de `GameShell` sin ampliarlo. Tomado de las recomendaciones.
- **Sí:** TIEMPO, sentido del viaje y RACHA en una franja de estado de 40 px dibujada en el canvas, porque son jugabilidad. **No:** ampliar `GameShell` con una métrica RACHA. Tomado de las recomendaciones (pendiente de confirmar).
- **Sí:** tablero de 20 × 14 celdas de 40 px más la franja, en 800×600. Encaja en el 4:3 sin franjas vacías. Tomado de las recomendaciones.
- **Sí:** flechas y WASD, leídas por `e.code`, con `preventDefault` solo en las flechas. Un salto por pulsación, sin autorrepetición, con búfer de 1. Tomado de las recomendaciones (pendiente de confirmar).
- **Sí:** arranque en espera con "PULSA ↑ PARA SALIR" y el tiempo parado hasta el primer salto, como SERPENTINA. **No:** espera tras cada vida, porque la orilla ya es segura. Tomado de las recomendaciones.
- **Sí:** sin victoria; los viajes se repiten sin fin. Tomado de las recomendaciones.
- **Sí:** todo dibujado en canvas, sin assets ni sprites de terceros. Tomado de las recomendaciones.
- **Sí:** sin sonido, igual que los otros cuatro juegos. Tomado de las recomendaciones.
- **Sí:** aviso "REQUIERE TECLADO" en táctil con `CanvasScreen`. **No:** controles táctiles en esta spec. Tomado de las recomendaciones.
- **Sí:** usar `useCanvasGame` y `CanvasScreen` de la SPEC 07 sin cambios. **No:** extraer ni duplicar nada, porque el hook ya existe.
- **Sí:** el leaderboard se hereda de `GameShell` + `submitScore` + `getLeaderboard`. **No:** código de ranking propio del juego.
- **Sí:** ruta estática `app/games/vaiven/play/page.tsx`. **No:** un `if` en la ruta genérica.
- **Sí:** motor en `lib/games/hopper/` y componente `components/games/hopper-game.tsx`, con nombre de género en inglés como `asteroids`, `tetris`, `arkanoid` y `snake`. `lanes.ts` va aparte porque es la tabla que se equilibra y la que amplía la GJ-vaiven-02. Tomado de las recomendaciones (pendiente de confirmar).
- **Sí:** paleta neón con glow y cover diseñadas con `/frontend-design`. Exigido por `CLAUDE.md`.
- **Sí:** los callbacks solo se emiten cuando cambia el valor, para no provocar un render de React en cada frame.

## Riesgos

| Riesgo                                                                                    | Mitigación                                                                                                                                                      |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Listeners o `requestAnimationFrame` que sobreviven al desmontar                           | `destroy` idempotente y criterio de navegación sin errores. StrictMode lo prueba en desarrollo.                                                                 |
| `preventDefault` en las flechas impide moverse por el input de iniciales del modal        | No se aplica con foco en `input`/`textarea`, ni en pausa ni en `gameover`. Hay un criterio específico.                                                          |
| Salto de `dt` al reanudar o al volver de otra pestaña (un vehículo atraviesa al saltador) | `resume` reinicia `lastTime` y el `dt` se limita a 50 ms. A ×2.0 el carril más rápido avanza 11 px por frame, menos que la caja de 26 px.                       |
| El volteo descoloca al jugador o deja al saltador encima de un vehículo                   | Solo se voltea con el saltador en una orilla, que es zona segura. El reflejo es exacto (`x' = 800 − x − ancho`) y el estado se congela durante los 600 ms.      |
| El reflejo del volteo no coincide con el estado final y se ve un salto en el último frame | Se dibuja el estado previo con `scaleX = cos(π × t)` y al terminar se aplica `mirrorLanes`, que da la misma imagen. Hay un criterio visual.                     |
| El rozón se puede farmear quedándose en un carril                                         | Solo cuenta con vehículos que se acercan, uno por salto, y la racha caduca a los 3 s. El tiempo de 45 s obliga a avanzar.                                       |
| Carriles imposibles en viajes altos (huecos más estrechos que un salto a ×2.0)            | La velocidad se limita a ×2.0 y el espaciado no cambia con el viaje: los huecos son iguales, solo pasan más deprisa. Se revisa en la partida manual del paso 6. |
| El búfer de salto ejecuta un salto no deseado tras la pausa o el volteo                   | `pause` vacía el búfer y en `flipping` y `dying` las pulsaciones se ignoran.                                                                                    |
| Renders de React a 60 fps                                                                 | Callbacks solo cuando cambia el valor. La racha y el tiempo viven solo en el canvas.                                                                            |
| `create` inestable en el hook recrea el motor en cada render                              | `createHopperGame` es una función de módulo, nunca una lambda inline.                                                                                           |
| `shadowBlur` en 24 vehículos y 15 paquetes baja los FPS                                   | Glow en el saltador, los vehículos, el destello y las orillas. Los paquetes solo lo llevan si se mantiene a 60 fps (se decide en el paso 5).                    |
| El catálogo cacheado no muestra VAIVÉN tras la migración                                  | Reiniciar `next dev`; en producción entra con el build.                                                                                                         |
| Dos juegos de cruce de carriles en el catálogo confunden (VAIVÉN real y RANARIA simulado) | Pregunta abierta 1 del README. La cover y los textos de VAIVÉN se diferencian de RANARIA.                                                                       |

## Lo que **no** entra en esta spec

- Novedades por viaje (SPEC GJ-vaiven-02).
- Controles táctiles.
- Sonido, música o mute.
- Vidas extra, power-ups, casillas de llegada o rozones con paquetes.
- RACHA o TIEMPO en el HUD de React (ampliar `GameShell`).
- Cambios en `useCanvasGame`, `CanvasScreen` o `GameShell`.
- Hacer real RANARIA o cambiar los demás juegos simulados.
- Auth, antitrampas y test runner.

Cada una de estas cosas, si llega, irá en su propia spec.

# SPEC GJ-vaiven-02 — Amenazas y ayudas por viaje en VAIVÉN

> **Estado:** Draft
> **Depende de:** SPEC 05, SPEC 06, SPEC 07, SPEC GJ-vaiven-01
> **Fecha:** 2026-10-30
> **Objetivo:** Añadir a VAIVÉN cuatro novedades que se desbloquean en los viajes 3, 4, 5 y 6 (paquetes que se comprimen, ráfagas de carril, ralentí y mediana electrificada), anunciadas durante el volteo, para que cada ida y vuelta se juegue distinto además de ir más rápido.

## Por qué existe esta spec

Tras la SPEC GJ-vaiven-01, VAIVÉN es jugable de principio a fin, pero todos los viajes son el mismo tablero, reflejado y algo más rápido. A partir del viaje 6 o 7 la única novedad es la velocidad, y la partida se vuelve monótona justo cuando la racha y la puntuación empiezan a importar.

El tema del jam es cruzar carriles a saltos, y la idea del usuario es que cada viaje sea más difícil que el anterior. Esta spec convierte esa progresión en un calendario: cada viaje del 3 al 6 desbloquea una novedad que se queda para el resto de la partida, y el volteo la anuncia. Tres son amenazas (en el río, en la autopista y en la mediana) y una es una ayuda, para que el jugador tenga algo que buscar cuando la velocidad aprieta.

Las cuatro se diseñaron para no recordar a ningún juego comercial del género: no hay plataformas que se hunden, casillas de llegada ni pasajeros que rescatar. No cambia el catálogo ni el ranking, y no toca nada compartido.

## Alcance

**Entra:**

- Calendario de novedades por viaje. Una novedad desbloqueada se queda activa en todos los viajes siguientes:

  | Viaje | Novedad                   | Tipo    | Dónde            |
  | ----- | ------------------------- | ------- | ---------------- |
  | 1–2   | Ninguna (igual que la 01) | —       | —                |
  | ≥ 3   | Paquetes que se comprimen | Amenaza | Río, filas 2 y 4 |
  | ≥ 4   | Ráfagas de carril         | Amenaza | Autopista, 7–12  |
  | ≥ 5   | Ralentí                   | Ayuda   | Mediana, fila 6  |
  | ≥ 6   | Mediana electrificada     | Amenaza | Mediana, fila 6  |

- **Paquetes que se comprimen** (viaje ≥ 3):
  - En las filas 2 y 4 del río, el primer paquete de cada carril (índice 0) es **comprimible** y se dibuja con rayas diagonales.
  - Ciclo de **4000 ms**: 2400 ms a su largo completo, 600 ms encogiendo hasta el **35 %**, 400 ms al 35 % y 600 ms creciendo de nuevo. Se encoge y crece desde su centro.
  - El soporte de la SPEC GJ-vaiven-01 usa el largo actual: si el centro del saltador queda fuera del paquete comprimido, se pierde una vida.
  - Cada paquete comprimible empieza su ciclo desfasado 2000 ms respecto al del otro carril.
- **Ráfagas de carril** (viaje ≥ 4):
  - Cada **7000 ms** de `playing`, un carril de la autopista elegido al azar recibe una ráfaga. Nunca hay dos a la vez y nunca repite el carril de la ráfaga anterior.
  - **Aviso de 800 ms:** tres chevrones (`›››` o `‹‹‹` según el sentido) parpadean a 4 Hz en el borde del tablero por el que entran los vehículos de ese carril.
  - **Ráfaga de 1500 ms:** el carril va a **×1.8** su velocidad del viaje. Después vuelve a su velocidad normal.
  - Un rozón con un vehículo de un carril en ráfaga vale **el doble** (100 × racha en lugar de 50 × racha). La racha sube igual, en 1.
- **Ralentí** (viaje ≥ 5):
  - Una vez por viaje, **3000 ms** después de empezar el viaje (contando solo `playing`), aparece un reloj de arena de luz en una celda al azar de la mediana, entre las columnas 2 y 17. Dura **8000 ms** y parpadea los últimos 1500 ms.
  - Si el saltador entra en su celda, lo recoge: **+50 puntos** (sin racha) y todos los carriles, río incluido, van a **×0.6** durante **4000 ms**.
  - Mientras dura, la franja de estado muestra "RALENTÍ" con una barra de 80×4 que se vacía en 4 s, en lugar del sentido del viaje.
  - Si se pierde una vida, el reloj de arena que no se haya recogido desaparece y no vuelve en ese viaje. Un ralentí ya activo sigue hasta que acabe.
  - El ralentí se aplica después de la ráfaga: un carril en ráfaga con ralentí va a ×1.8 × 0.6 = ×1.08 su velocidad del viaje.
- **Mediana electrificada** (viaje ≥ 6):
  - Dos grupos de 4 celdas de la mediana se alternan: **A** = columnas 3, 7, 12 y 16, y **B** = columnas 1, 5, 14 y 18. Los dos grupos son simétricos respecto al centro (`col` y `19 − col`), así que el volteo no los mueve. El resto de la mediana es siempre segura.
  - Cada grupo está **encendido 2000 ms** y luego le toca al otro. Los **400 ms** antes de encenderse, sus celdas parpadean.
  - Estar en una celda encendida o aterrizar en ella cuesta una vida. Una celda que parpadea todavía es segura.
  - El reloj de arena del ralentí nunca aparece en una celda de A ni de B.
- **Anuncio en el volteo:** en los volteos que llevan a los viajes 3, 4, 5 y 6, el canvas muestra en el centro del tablero "VIAJE 03 · PAQUETES COMPRIMIBLES", "VIAJE 04 · RÁFAGAS", "VIAJE 05 · RALENTÍ" y "VIAJE 06 · MEDIANA ELECTRIFICADA". Aparece en la segunda mitad del volteo (300 ms) y se mantiene 1200 ms más, sin bloquear la partida. Los demás volteos no muestran nada.
- **Reflejo en el volteo:** los paquetes comprimibles se reflejan con su carril, las ráfagas en curso se cancelan y el reloj de arena se refleja (`col' = 19 − col`). Los grupos A y B no cambian porque son simétricos, y el ciclo de la mediana sigue donde estaba.
- **Pausa, volteo y explosión** congelan todos los temporizadores nuevos: ciclo de compresión, ráfagas, ralentí, reloj de arena y mediana.
- `restart()` vuelve al viaje 1 sin ninguna novedad activa.
- Lo nuevo se dibuja con la paleta de la GJ-vaiven-01 y glow, con los detalles visuales fijados por `/frontend-design`.

**Fuera de alcance (specs futuras):**

- Más novedades a partir del viaje 7 o novedades aleatorias.
- Otras ayudas (vida extra, escudo, salto doble).
- Cambiar las reglas base de la SPEC GJ-vaiven-01: saltos, rozón, racha, tiempo, puntos de avance y de llegada, volteo y velocidad por viaje.
- Ampliar `GameShell` o mostrar las novedades fuera del canvas.
- Un selector de viaje inicial o cualquier forma de saltar viajes.
- Cambios en el catálogo, la cover o el ranking.
- Controles táctiles, sonido y mute.
- Auth real, antitrampas y test runner.

## Modelo de datos

No cambia el esquema ni el catálogo, y no hay migraciones. La API pública del motor (`HopperCallbacks`, `HopperGame`, `createHopperGame`) no cambia. Lo nuevo es estado interno del motor y un archivo de novedades.

### Estado nuevo (`lib/games/hopper/engine.ts`)

```ts
type Hazards = {
  squeeze: { row: 2 | 4; phaseMs: number }[]; // ciclo de 4000 ms de cada paquete comprimible
  gust: {
    row: number; // carril de la autopista
    stage: "warn" | "burst"; // aviso 800 ms o ráfaga 1500 ms
    ms: number; // ms restantes de la etapa
  } | null;
  gustCooldown: number; // ms hasta la siguiente ráfaga (7000)
  lastGustRow: number | null;
  hourglass: { col: number; ms: number } | null; // reloj de arena en la mediana, 8000 ms
  hourglassSpawnMs: number; // ms hasta que aparece en este viaje (3000), −1 si ya salió
  slowMs: number; // ms de ralentí restantes (0 = inactivo)
  grid: { on: "A" | "B"; ms: number }; // grupo encendido y ms hasta el cambio (2000)
  banner: { text: string; ms: number } | null; // anuncio del volteo
};

// Se añade a `state`:
// hazards: Hazards
```

- `unlocked(trip)` devuelve qué novedades están activas: compresión si `trip ≥ 3`, ráfagas si `trip ≥ 4`, ralentí si `trip ≥ 5` y mediana si `trip ≥ 6`.
- La velocidad de un carril pasa a ser `base × speedFor(trip) × (ráfaga ? 1.8 : 1) × (slowMs > 0 ? 0.6 : 1)`.
- `supportOf` de la GJ-vaiven-01 recibe el largo actual de cada paquete: `len × squeezeFactor(phaseMs)` para los comprimibles y `len` para el resto.
- `rozonOf` devuelve también si el vehículo era de un carril en ráfaga, para doblar los puntos.
- Al empezar cada viaje (tras el volteo o al empezar la partida): `hourglassSpawnMs = 3000`, `hourglass = null`, `gust = null`, `gustCooldown = 7000`. `slowMs` y el ciclo de la mediana siguen donde estaban.
- Al perder una vida: `hourglass = null` y `hourglassSpawnMs = −1` hasta el siguiente viaje.
- La muerte en la mediana electrificada usa la misma explosión y reaparición de la GJ-vaiven-01.

### Novedades (`lib/games/hopper/hazards.ts`)

```ts
export const SQUEEZE_ROWS = [2, 4] as const;
export const SQUEEZE_CYCLE = { full: 2400, shrink: 600, small: 400, grow: 600 }; // 4000 ms
export const SQUEEZE_MIN = 0.35;
export const SQUEEZE_OFFSET = 2000;
export const GUST_EVERY = 7000;
export const GUST_WARN = 800;
export const GUST_MS = 1500;
export const GUST_FACTOR = 1.8;
export const GUST_ROZON_FACTOR = 2;
export const HOURGLASS_DELAY = 3000;
export const HOURGLASS_MS = 8000;
export const HOURGLASS_BLINK = 1500;
export const HOURGLASS_COLS = [2, 17] as const; // rango de columnas
export const SLOW_MS = 4000;
export const SLOW_FACTOR = 0.6;
export const POINTS_HOURGLASS = 50;
export const GRID_A = [3, 7, 12, 16];
export const GRID_B = [1, 5, 14, 18];
export const GRID_ON_MS = 2000;
export const GRID_WARN_MS = 400;
export const UNLOCK = { squeeze: 3, gust: 4, slow: 5, grid: 6 } as const;
export const BANNERS: Record<number, string>; // 3–6 → texto del anuncio
export const BANNER_MS = 1200;

export function unlocked(trip: number): {
  squeeze: boolean;
  gust: boolean;
  slow: boolean;
  grid: boolean;
};
export function squeezeFactor(phaseMs: number): number; // 1 → 0.35 → 1 en 4000 ms
export function pickGustRow(last: number | null): number; // 7–12 al azar, distinto de last
export function pickHourglassCol(): number; // 2–17, fuera de GRID_A y GRID_B
export function mirrorCol(col: number): number; // 19 − col
export function createHazards(): Hazards;
export function stepHazards(h: Hazards, dt: number, trip: number): void;
export function drawSqueezeStripes(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; w: number; h: number },
): void;
export function drawGustWarning(
  ctx: CanvasRenderingContext2D,
  row: number,
  dir: 1 | -1,
  ms: number,
): void;
export function drawHourglass(
  ctx: CanvasRenderingContext2D,
  col: number,
  ms: number,
): void;
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  grid: { on: "A" | "B"; ms: number },
): void;
export function drawBanner(
  ctx: CanvasRenderingContext2D,
  text: string,
  ms: number,
): void;
```

- `hazards.ts` va aparte de `entities.ts` para que las reglas de la 01 no cambien de archivo y para poder desactivar todas las novedades con `unlocked`.
- `GRID_A` y `GRID_B` son simétricos (`mirrorCol` de cada columna está en el mismo grupo) y no tienen columnas contiguas entre sí. Las columnas 0, 2, 4, 6, 8, 9, 10, 11, 13, 15, 17 y 19 son siempre seguras.
- `pickHourglassCol` excluye las columnas de `GRID_A` y `GRID_B` también antes del viaje 6, para que el reloj de arena siempre aparezca en una columna que nunca se electrifica. Como esas columnas también son simétricas, su reflejo en el volteo es otra columna segura.

### Pantalla 800×600 (añadidos)

| Elemento              | Posición (px lógicos)                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Paquete comprimible   | Mismo alto (30 px) y fila que los demás, con rayas diagonales de 6 px. El largo cambia desde el centro                                |
| Aviso de ráfaga       | `›››` o `‹‹‹` de 24 px de alto, en `x = 4–40` o `x = 760–796` según el borde de entrada, centrado en el carril                        |
| Carril en ráfaga      | Línea de 2 px en el borde inferior del carril, en el color del aviso, mientras dura la ráfaga                                         |
| Reloj de arena        | Dos triángulos de 24×14 unidos por el vértice, centrados en su celda de la mediana                                                    |
| Mediana electrificada | Celdas de A y B con borde de 2 px. Encendidas: relleno con arco eléctrico. Parpadeando: borde que alterna a 8 Hz. Apagadas: sin borde |
| Anuncio               | Texto centrado en `x = 400`, `y = 260`, en `monospace` de 20 px, con fondo semitransparente de 520×44                                 |
| RALENTÍ en la franja  | "RALENTÍ" en `x = 440`, `y = 586`, y barra de 80×4 en `x = 520`, `y = 584`, en lugar de "▲ IDA" / "▼ VUELTA"                          |

### Archivos del motor

| Archivo                         | Cambio                                                                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/games/hopper/hazards.ts`   | Nuevo: constantes, reglas puras y dibujo de las cuatro novedades y del anuncio                                                         |
| `lib/games/hopper/engine.ts`    | Estado `hazards`, avance de sus temporizadores, velocidad efectiva, muertes en la mediana, recogida del ralentí y anuncio en el volteo |
| `lib/games/hopper/entities.ts`  | `supportOf` recibe el largo actual de cada paquete. `rozonOf` devuelve si el carril estaba en ráfaga. `drawStatus` muestra RALENTÍ     |
| `lib/games/hopper/constants.ts` | `PALETTE` y `GLOW` con los colores nuevos                                                                                              |
| `lib/games/hopper/lanes.ts`     | Sin cambios                                                                                                                            |

### Paleta (añadidos)

```ts
export const PALETTE = {
  // …igual que en la SPEC GJ-vaiven-01
  squeeze: "#00f5ff", // --cyan, rayas con menos alpha
  gust: "#ff006e", // --magenta (aviso y línea del carril)
  hourglass: "#ffcf3a", // --gold
  slow: "#c7d0e0", // --silver (barra de RALENTÍ)
  gridWarn: "#f5ff00", // --yellow (celdas que van a encenderse)
  gridOn: "#ff006e", // --magenta (celdas encendidas)
  banner: "#e6e9ff", // --ink
  bannerBg: "rgba(10,10,15,0.8)", // --bg con alpha
} as const;
```

### Estructura final

```
lib/games/hopper/hazards.ts      (nuevo)
lib/games/hopper/engine.ts       (modificado: estado y reglas de las novedades)
lib/games/hopper/entities.ts     (modificado: soporte, rozón y franja)
lib/games/hopper/constants.ts    (modificado: PALETTE y GLOW)
```

## Plan de implementación

1. **Base de novedades sin efectos.**
   - Crear `lib/games/hopper/hazards.ts` con las constantes, `unlocked`, `squeezeFactor`, `pickGustRow`, `pickHourglassCol`, `mirrorCol`, `createHazards` y `stepHazards`.
   - Añadir `hazards` al estado del motor y congelar sus temporizadores en pausa, volteo y explosión. Todavía no cambian nada del juego.
   - Resultado: `npm run build` y `npm run lint` pasan, y `/games/vaiven/play` se juega igual que con la GJ-vaiven-01.
2. **Paquetes que se comprimen.**
   - Aplicar `squeezeFactor` al largo de los paquetes comprimibles de las filas 2 y 4 desde el viaje 3, en el soporte y en el dibujo (con colores planos).
   - Reflejarlos en el volteo con su carril.
   - Resultado: en el viaje 3 los dos paquetes se encogen y crecen, y quedarse fuera de uno comprimido cuesta una vida.
3. **Ráfagas de carril.**
   - Aviso, ráfaga a ×1.8, cancelación en el volteo y rozón doble en un carril en ráfaga, desde el viaje 4.
   - Resultado: en el viaje 4 hay una ráfaga cada 7 s, siempre avisada 800 ms antes.
4. **Ralentí.**
   - Reloj de arena una vez por viaje desde el viaje 5, recogida con +50 y ×0.6 durante 4 s, RALENTÍ en la franja y desaparición al perder una vida.
   - Resultado: en el viaje 5 aparece el reloj de arena a los 3 s y recogerlo frena todos los carriles.
5. **Mediana electrificada y anuncio.**
   - Grupos A y B alternos con aviso de 400 ms desde el viaje 6, muerte en celda encendida y reflejo en el volteo.
   - Anuncio de los viajes 3, 4, 5 y 6 durante el volteo.
   - Resultado: el calendario completo funciona del viaje 1 al 6.
6. **Paleta neón.**
   - Usar `/frontend-design` para fijar los colores y el glow de las rayas de compresión, los chevrones y la línea de la ráfaga, el reloj de arena, los arcos de la mediana, el anuncio y la barra de RALENTÍ, y aplicarlos en `hazards.ts`, `entities.ts` y `constants.ts`.
7. **Verificación final.**
   - `npm run build` y `npm run lint`.
   - Recorrer los criterios de aceptación con el MCP de Playwright. Para llegar rápido a los viajes 3–6 se cambia `trip` inicial en local de forma temporal y ese cambio no se versiona.
   - Partida manual completa hasta el viaje 6 o más (el usuario).

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `app/games/[id]/play/page.tsx`, `components/games/game-shell.tsx`, `components/games/use-canvas-game.tsx`, `components/games/hopper-game.tsx`, `app/data/games.ts`, `app/globals.css` y `lib/games/hopper/lanes.ts` no aparecen en `git diff`.
- [ ] No hay migraciones nuevas en `supabase/migrations/`.
- [ ] Los demás juegos (reales y simulados) funcionan igual que antes.
- [ ] Todos los criterios de la SPEC GJ-vaiven-01 siguen cumpliéndose. En los viajes 1 y 2 no aparece ninguna novedad.
- [ ] El HUD de React sigue mostrando solo PUNTUACIÓN, VIDAS y NIVEL. Nada de lo nuevo se dibuja fuera del canvas.
- [ ] En el volteo que lleva al viaje 3 aparece "VIAJE 03 · PAQUETES COMPRIMIBLES" y desaparece unos 1,5 s después. Los anuncios de los viajes 4, 5 y 6 dicen "VIAJE 04 · RÁFAGAS", "VIAJE 05 · RALENTÍ" y "VIAJE 06 · MEDIANA ELECTRIFICADA". El volteo al viaje 7 no muestra anuncio.
- [ ] Desde el viaje 3, un paquete de la fila 2 y otro de la fila 4 tienen rayas diagonales y cada 4 s se encogen hasta un 35 % de su largo y vuelven a crecer, sin moverse de su centro.
- [ ] Quedarse sobre un paquete comprimible con el centro del saltador fuera de su largo actual baja VIDAS en uno. Quedarse en su centro mientras se encoge no cuesta vida.
- [ ] Desde el viaje 4, cada unos 7 s parpadean tres chevrones en el borde de entrada de un carril de la autopista y, 800 ms después, ese carril va a ×1.8 durante 1,5 s. Nunca hay dos ráfagas a la vez ni dos seguidas en el mismo carril.
- [ ] Un rozón con un vehículo de un carril en ráfaga suma el doble: 200 en lugar de 100 con racha x2.
- [ ] Desde el viaje 5, 3 s después de empezar el viaje aparece un reloj de arena en la mediana, entre las columnas 2 y 17. Si no se recoge, desaparece a los 8 s tras parpadear el último 1,5 s, y no vuelve en ese viaje.
- [ ] Recoger el reloj de arena suma 50 puntos, todos los carriles van a ×0.6 durante 4 s y la franja muestra "RALENTÍ" con su barra en lugar del sentido del viaje. Al acabar, vuelve "▲ IDA" o "▼ VUELTA".
- [ ] Perder una vida con el reloj de arena en pantalla lo hace desaparecer, y no vuelve hasta el viaje siguiente.
- [ ] Desde el viaje 6, las columnas 3, 7, 12 y 16 de la mediana se encienden 2 s y luego las 1, 5, 14 y 18 otros 2 s, en bucle. Las que van a encenderse parpadean 400 ms antes.
- [ ] Estar o aterrizar en una celda encendida baja VIDAS en uno. Una celda que parpadea todavía no quita vida. Las demás columnas de la mediana son siempre seguras.
- [ ] El reloj de arena nunca aparece en las columnas 1, 3, 5, 7, 12, 14, 16 ni 18.
- [ ] Tras el volteo, los paquetes comprimibles, el reloj de arena y las celdas electrificadas están en su posición reflejada, y la ráfaga en curso se ha cancelado.
- [ ] Pausar durante una ráfaga, un ralentí o con la mediana encendida y reanudar: cada temporizador sigue donde estaba. Cambiar de pestaña y volver tampoco los adelanta.
- [ ] JUGAR DE NUEVO empieza en el viaje 1 sin ninguna novedad activa ni anuncio.
- [ ] Las rayas de compresión, los chevrones, el reloj de arena, la mediana electrificada, el anuncio y la barra de RALENTÍ usan los colores de `PALETTE`, y el canvas se ve nítido con `devicePixelRatio` 2.
- [ ] Con todas las novedades activas (viaje 6 o más) el juego se mantiene a 60 fps en el navegador de escritorio de referencia.

## Decisiones

- **Sí:** cuatro novedades fijas que se desbloquean en los viajes 3, 4, 5 y 6 y se quedan activas. **No:** novedades aleatorias por viaje, que harían el ranking más dependiente de la suerte. Pedido en el tema ("cada viaje más difícil"); el calendario es de las recomendaciones (pendiente de confirmar).
- **Sí:** los viajes 1 y 2 son exactamente los de la GJ-vaiven-01, para que la primera ida y vuelta enseñe las reglas base. Tomado de las recomendaciones.
- **Sí:** paquetes que se comprimen desde su centro al 35 %. **No:** paquetes que desaparecen o se hunden, porque es una mecánica reconocible de un juego comercial del género. Tomado de las recomendaciones.
- **Sí:** ráfagas avisadas 800 ms antes y rozón doble en un carril en ráfaga. Liga la nueva amenaza con el giro del tema (el rozón). **No:** ráfagas sin aviso, que serían injustas a ×2.0. Tomado de las recomendaciones.
- **Sí:** el ralentí como única ayuda, en la mediana y una vez por viaje. Da algo que buscar cuando la velocidad aprieta y obliga a pasar por la mediana. **No:** vida extra, que alargaría las partidas sin cambiar la forma de jugar. Tomado de las recomendaciones (pendiente de confirmar).
- **Sí:** la mediana electrificada con dos grupos alternos y aviso de 400 ms, que deja 12 de 20 columnas siempre seguras. **No:** electrificar la mediana entera a intervalos, que eliminaría la única zona de descanso entre río y autopista. Tomado de las recomendaciones.
- **Sí:** anunciar cada novedad en el volteo con un texto en el canvas, porque es información de juego y el volteo ya es una pausa natural. **No:** ampliar `GameShell` con avisos. Tomado de las recomendaciones.
- **Sí:** las novedades se reflejan en el volteo y la ráfaga en curso se cancela, para que el viaje empiece limpio. Tomado de las recomendaciones.
- **Sí:** el ralentí se multiplica después de la ráfaga (×1.08 si coinciden). **No:** que el ralentí anule la ráfaga, que sería una regla más que recordar. Tomado de las recomendaciones.
- **Sí:** `hazards.ts` aparte, con `unlocked(trip)` como único interruptor, para no mezclar estas reglas con las de la 01. Tomado de las recomendaciones.
- **Sí:** sin migración ni cambios de catálogo, cover o textos. El `long` de la 01 sigue describiendo el juego. Tomado de las recomendaciones.
- **Sí:** para verificar los viajes 3–6 se cambia el viaje inicial en local y ese cambio no se versiona. **No:** un selector de viaje en la UI, que rompería el ranking. Tomado de las recomendaciones.
- **Sí:** el leaderboard se sigue heredando de `GameShell` + `submitScore` + `getLeaderboard`, sin cambios.
- **Sí:** paleta neón con glow, diseñada con `/frontend-design`. Exigido por `CLAUDE.md`.

## Riesgos

| Riesgo                                                                                       | Mitigación                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Combinaciones imposibles: ráfaga a ×2.0 × 1.8 = ×3.6 en el carril más rápido (396 px/s)      | A 50 ms de `dt` son 19,8 px por frame, menos que la caja del saltador (26 px), así que no hay atravesados. La ráfaga dura 1,5 s y se avisa. Se revisa en la partida manual. |
| El jugador muere en la mediana por una celda que se enciende sin que lo vea                  | Aviso de 400 ms con borde que parpadea en otro color, y 12 columnas siempre seguras. Hay un criterio de que la celda que parpadea no mata.                                  |
| Un paquete comprimible deja una fila del río sin camino durante la compresión                | Solo es comprimible un paquete por carril y solo en las filas 2 y 4. Los demás paquetes del carril mantienen su largo.                                                      |
| Los temporizadores nuevos corren durante la pausa, el volteo o la explosión                  | `stepHazards` solo se llama en `playing`. Hay criterios de pausa y de cambio de pestaña.                                                                                    |
| El volteo descoloca la mediana electrificada o deja el reloj de arena en una celda peligrosa | `GRID_A`, `GRID_B` y las columnas seguras son simétricos, así que el reflejo no cambia qué celdas se encienden. Se comprueba en el paso 5.                                  |
| Llegar al viaje 6 para probar lleva demasiado tiempo                                         | Cambio temporal y no versionado del viaje inicial durante la verificación. El usuario hace además una partida real.                                                         |
| La 02 rompe algo de la 01 (soporte, rozón, puntos de llegada)                                | Paso 1 sin efectos y criterio de que todos los de la GJ-vaiven-01 siguen cumpliéndose. Los viajes 1 y 2 no activan nada.                                                    |
| `shadowBlur` en los arcos de la mediana y las rayas de compresión baja los FPS               | Glow solo en las celdas encendidas, el reloj de arena y el aviso de ráfaga. Hay un criterio de 60 fps con todas las novedades activas.                                      |
| Alguna novedad recuerda demasiado a un juego comercial del género                            | Pregunta abierta 12 del README. Cada novedad está aislada en `hazards.ts` y se puede cambiar sin tocar las demás.                                                           |

## Lo que **no** entra en esta spec

- Novedades a partir del viaje 7 o aleatorias.
- Vida extra, escudo, salto doble u otras ayudas.
- Cambios en las reglas base de la SPEC GJ-vaiven-01.
- Cambios en `GameShell`, `useCanvasGame`, `CanvasScreen` o el componente del juego.
- Selector de viaje inicial.
- Catálogo, cover, textos o ranking.
- Controles táctiles, sonido y mute.
- Auth, antitrampas y test runner.

Cada una de estas cosas, si llega, irá en su propia spec.

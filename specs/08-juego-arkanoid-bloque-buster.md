# SPEC 08 — Juego Arkanoid real en BLOQUE BUSTER

> **Estado:** Implementado
> **Depende de:** SPEC 05, SPEC 06, SPEC 07
> **Fecha:** 2026-10-28
> **Objetivo:** Portar el Arkanoid de `references/started-games/04-arkanoid/` a TypeScript y hacerlo jugable en `/games/bloque-buster/play`, integrado con el HUD, la pausa, el modal de fin y el ranking de la plataforma.

## Por qué existe esta spec

Hoy `/games/bloque-buster/play` muestra la partida simulada de `GamePlayer`: un contador que suma puntos al azar sobre una animación CSS. BLOQUE BUSTER ya tiene ficha, cover (`cover-bricks`) y un ranking con 12 puntuaciones aleatorias del seed de la SPEC 06, que van de 4.146 a 275.088.

`references/started-games/04-arkanoid/` tiene un Arkanoid completo en canvas puro (`index.html`, `game.js` de 268 líneas, `levels.js` y `assets/spritesheet.js`), pero no se puede usar tal cual:

- Es un script global que busca el canvas de 800×600 con `getElementById('game')`.
- Registra `keydown`/`keyup` en `document` y `click`/`mousemove` en el canvas sin quitarlos nunca.
- El `dt` del bucle no tiene límite.
- Dibuja su propio HUD (`Score`, `Nivel`, vidas como pelotas) y los overlays GAME OVER y "¡Completaste el juego!".
- Su pausa con `P`/`Escape` pinta un selector de nivel 1–5 que se pulsa con el ratón.
- Depende de un spritesheet PNG y de dos sonidos mp3.
- Tras el nivel 5 pasa a un estado `win`, y la puntuación máxima posible es 2.080 (208 bloques × 10).

Esta spec lo convierte en el tercer juego real de Arcade Vault. Usa el hook `useCanvasGame` y el componente `CanvasScreen` que extrajo la SPEC 07, sin cambiarlos. El leaderboard se hereda de la SPEC 06 sin código nuevo.

## Alcance

**Entra:**

- Port 1:1 de `game.js` y `levels.js` a TypeScript en `lib/games/arkanoid/`, sin React, con estas reglas:
  - Paleta de 81×14 en `y = 560`, centrada al empezar, que se mueve a `PADDLE_SPEED = 400` px/s con ← → y sigue al ratón.
  - Pelota de 16×16 que sale de encima de la paleta con `vx = 200 × velocidad` y `vy = −300 × velocidad`.
  - Rebote en las paredes izquierda, derecha y superior.
  - Rebote en la paleta: solo invierte `vy` (`vy = −|vy|`), sin cambiar el ángulo. La pelota cuenta como en contacto hasta 8 px por debajo del borde superior de la paleta.
  - Choque con un bloque (AABB): el bloque se rompe, se suman **10 puntos** y se invierte `vy`. Como máximo se rompe un bloque por frame.
  - **3 vidas**. Si la pelota pasa de `y = 600`, se resta una vida y la pelota vuelve encima de la paleta y sale sola, sin esperar un lanzamiento. Con 0 vidas se acaba la partida.
  - Bloques de 64×24 en una rejilla de 10 × 6 que empieza en `x = 80`, `y = 80`.
  - **5 patrones** de `levels.js`:

    | Nivel | Patrón           | Bloques | Velocidad |
    | ----- | ---------------- | ------- | --------- |
    | 1     | Parrilla 10×6    | 60      | ×1.00     |
    | 2     | Pirámide         | 40      | ×1.10     |
    | 3     | Ajedrez          | 30      | ×1.21     |
    | 4     | Filas con huecos | 39      | ×1.33     |
    | 5     | Marco + cruz     | 39      | ×1.46     |

  - Al romper el último bloque se carga el nivel siguiente, y la pelota vuelve encima de la paleta.
  - **Sin victoria:** tras el nivel 5 se repiten los patrones en bucle. El nivel `n` usa el patrón `((n − 1) mod 5) + 1`. Del 1 al 5 la velocidad es la de la tabla, y del 6 en adelante es `min(2.0, 1.46 × 1.1^(n − 5))`: ×1.61 en el 6, ×1.77 en el 7, ×1.94 en el 8 y ×2.0 del 9 en adelante.
- El `dt` del frame se limita a 50 ms. Es el único cambio sobre la física del original.
- API del motor `createArkanoidGame(canvas, callbacks)`, que devuelve `pause / resume / restart / end / destroy`. `destroy` cancela el `requestAnimationFrame` y quita todos los listeners.
- El motor avisa a React solo cuando cambian `score`, `lives` o `level`, y una vez en game over.
- Del canvas y del motor se quitan:
  - El HUD de `Score`, `Nivel` y las vidas como pelotas.
  - Los overlays GAME OVER y "¡Completaste el juego!", y el estado `win`.
  - La pausa con `P`/`Escape` del propio motor, que pasa al hook.
  - El overlay de pausa con el selector de nivel 1–5 y su listener de `click`.
  - El spritesheet (`spritesheet.js`, `spritesheet-breakout.png`) y los sonidos.
- Se mantiene lo que es jugabilidad: la animación de explosión de 150 ms al romper un bloque, redibujada en canvas. Es solo visual: el bloque deja de colisionar en cuanto se rompe.
- `preventDefault` en `ArrowLeft` y `ArrowRight` mientras se juega, para que la página no haga scroll. Nunca se aplica con el foco en un `input` o `textarea`. Espacio y ↑ ↓ no son teclas de juego y no se tocan.
- Ratón: `mousemove` sobre el canvas centra la paleta en el cursor, limitada a `[0, 800 − 81]`. La coordenada se escala con `W / rect.width`, no con `canvas.width`, que va multiplicado por `devicePixelRatio`. En pausa y en game over el ratón no mueve la paleta.
- Al pausar se limpian las teclas pulsadas, y durante la pausa el motor ignora teclado y ratón.
- Resolución lógica fija de 800×600 (4:3, igual que la referencia), escalada con CSS al `.crt-screen`, con el buffer multiplicado por `devicePixelRatio`.
- Gráficos redibujados en canvas con la paleta neón de la plataforma y glow (`shadowBlur`), diseñados con `/frontend-design`. Bloques como rectángulos con borde, paleta con glow y pelota como círculo brillante.
- Componente cliente `components/games/arkanoid-game.tsx`, que usa `useCanvasGame` y `CanvasScreen` y conecta el motor con `GameShell`.
- Ruta estática `app/games/bloque-buster/play/page.tsx`, que tiene prioridad sobre `app/games/[id]/play/page.tsx`. La ruta genérica no se toca.
- Pausa por tres vías con un único estado de React (la del hook): botón PAUSA/REANUDAR, teclas `P`/`Escape` y `visibilitychange`.
- Fin de partida: `onLives(0)` y luego `onGameOver(score)`, que abre el modal "FIN DEL JUEGO". FIN llama a `end()` y JUGAR DE NUEVO a `restart()`.
- GUARDAR PUNTUACIÓN usa `submitScore` (heredado de `GameShell`). La puntuación aparece en el TOP 10 de `/games/bloque-buster` y en la pestaña BLOQUE BUSTER de `/salon`.
- En dispositivos sin teclado (`(hover: none) and (pointer: coarse)`), el CRT muestra "REQUIERE TECLADO" y el motor no se crea. Viene de `CanvasScreen`.
- El juego ocupa la entrada `bloque-buster` del catálogo:
  - Se vacían las 12 puntuaciones aleatorias del seed con una migración.
  - Título, `short`, `long`, categoría, cover, color y posición se quedan igual.

**Fuera de alcance (specs futuras):**

- Controles táctiles.
- Sonido, música o botón de mute. Los mp3 se quedan en la referencia.
- Copiar el spritesheet a `public/`.
- Mecánicas que no están en `game.js`: ángulo de rebote según el punto de impacto, lanzamiento con tecla, power-ups, bloques con varios golpes, enemigos.
- Selector de nivel o cualquier forma de saltar niveles.
- Cambios en `useCanvasGame`, `CanvasScreen` o `GameShell`.
- Cambios en los demás juegos simulados.
- Auth real y antitrampas (siguen como en la SPEC 06).
- Instalar un test runner o escribir tests del motor.

## Modelo de datos

No cambia el esquema. Las puntuaciones van a la tabla `scores` de la SPEC 06. Lo nuevo es la API del motor y una migración de datos que vacía las puntuaciones de `bloque-buster`.

### Motor (`lib/games/arkanoid/engine.ts`)

```ts
export type ArkanoidCallbacks = {
  onScore: (score: number) => void; // solo cuando cambia
  onLives: (lives: number) => void; // solo cuando cambia
  onLevel: (level: number) => void; // solo cuando cambia
  onGameOver: (score: number) => void; // una vez por partida
};

export type ArkanoidGame = {
  pause: () => void; // detiene el loop, limpia las teclas e ignora teclado y ratón
  resume: () => void; // reanuda sin salto de dt (reinicia lastTime)
  restart: () => void; // paleta centrada, nivel 1, 3 vidas, 0 puntos; reemite los valores iniciales
  end: () => void; // fuerza game over con la puntuación actual → onLives(0) + onGameOver
  destroy: () => void; // cancela rAF y quita listeners; idempotente
};

export function createArkanoidGame(
  canvas: HTMLCanvasElement,
  callbacks: ArkanoidCallbacks,
): ArkanoidGame;
```

- Estado interno: `state: "playing" | "paused" | "gameover"`. Desaparecen `win` e `isPaused`. En `gameover` el motor sigue animando las explosiones que queden, pero ignora la entrada y no aplica `preventDefault`.
- Variables del original: `paddle`, `ball`, `blocks`, `explosions`, `lives`, `score`, `currentLevel` y `keys`.
- `dt` limitado a 50 ms.
- Al crearse emite `onScore(0)`, `onLives(3)` y `onLevel(1)`.
- Al perder la última vida, el motor hace `lives = 0`, emite `onLives(0)` y `onGameOver(score)`. `end()` hace lo mismo con la puntuación actual.
- Al vaciar un nivel, `loadLevel(currentLevel + 1)` y `onLevel`, sin límite superior.
- El movimiento con teclado es continuo mientras se mantiene la tecla (`keys.ArrowLeft`/`keys.ArrowRight`), como en el original.

### Niveles y velocidad

```ts
// lib/games/arkanoid/levels.ts — los 5 patrones de levels.js, 1:1
export type BlockColor =
  "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";
export type LevelDef = {
  speed: number;
  blocks: { col: number; row: number; color: BlockColor }[];
};
export const LEVELS: LevelDef[]; // speed: 1.00, 1.10, 1.21, 1.33, 1.46

// Nivel n (1, 2, 3…): patrón LEVELS[(n - 1) % 5]
// velocidad n ≤ 5: LEVELS[n - 1].speed
// velocidad n > 5: Math.min(MAX_SPEED, LEVELS[4].speed * SPEED_STEP ** (n - 5))
```

- Una pasada completa por los 5 patrones da 208 bloques, es decir, 2.080 puntos.
- La puntuación crece sin tope, pero llegar a 9.999.999 exigiría unas 4.800 pasadas, así que el límite de `scores` no se alcanza en la práctica.

### Archivos del motor

| Archivo                           | Contenido                                                                                                                                                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/games/arkanoid/constants.ts` | `W`, `H`, `PADDLE_SPEED`, `PADDLE` (`y`, `w`, `h`), `BALL_SIZE`, `BASE_BALL_VX`, `BASE_BALL_VY`, `BLOCK_W`, `BLOCK_H`, `BLOCKS_ORIGIN_X`, `BLOCKS_ORIGIN_Y`, `POINTS_PER_BLOCK`, `START_LIVES`, `SPEED_STEP = 1.1`, `MAX_SPEED = 2.0`, `EXPLOSION_DURATION = 150`, `PALETTE` y `GLOW` |
| `lib/games/arkanoid/levels.ts`    | `LEVELS`, `patternFor(n)` y `speedFor(n)`                                                                                                                                                                                                                                             |
| `lib/games/arkanoid/entities.ts`  | Funciones puras: `collideAABB`, y `drawBlock`, `drawPaddle`, `drawBall` y `drawExplosion`, que reciben `ctx`. Sustituyen a `drawSprite`/`drawFrame`                                                                                                                                   |
| `lib/games/arkanoid/engine.ts`    | Estado, entrada (teclado y ratón), `update`, `draw`, loop y `createArkanoidGame`                                                                                                                                                                                                      |

`levels.ts` es un archivo más que en ROCAS y CAÍDA porque la referencia ya separa los niveles en `levels.js`.

### Explosión

- Dura `EXPLOSION_DURATION = 150` ms y tiene 4 fases (`Math.min(floor(elapsed / 150 × 4), 3)`), igual que el original.
- En lugar de los frames del spritesheet, cada fase dibuja el rectángulo del bloque más grande y más transparente, con el color del bloque. El tamaño y la opacidad de cada fase los fija `/frontend-design`.

### Paleta

`PALETTE` usa los hex de los tokens de `app/globals.css`, porque el canvas no lee variables CSS. Los colores finales los decide `/frontend-design`, partiendo de esta propuesta:

```ts
export const PALETTE = {
  bg: "#000",
  paddle: "#00f5ff", // --cyan (color de BLOQUE BUSTER)
  ball: "#e6e9ff", // --ink
  blocks: {
    red: "#d97a3a", // --bronze
    yellow: "#f5ff00", // --yellow
    cyan: "#00f5ff", // --cyan
    magenta: "#ff006e", // --magenta
    hotpink: "#ffcf3a", // --gold
    green: "#00ff88", // --green
    gray: "#c7d0e0", // --silver
  },
} as const;
```

Los nombres de color del original se conservan en `levels.ts` para no tocar los patrones. Solo cambia el hex al que apuntan.

### Reset de puntuaciones (`supabase/migrations/20261028100000_reset_scores_bloque_buster.sql`)

```sql
delete from public.scores where game_id = 'bloque-buster';
```

- No cambia ningún texto del catálogo, así que `app/data/games.ts` no se toca.
- No cambia el esquema: `lib/supabase/database.types.ts` no se regenera.

### Estructura final

```
app/games/bloque-buster/play/page.tsx                          (nuevo)
components/games/arkanoid-game.tsx                             (nuevo)
lib/games/arkanoid/constants.ts                                (nuevo)
lib/games/arkanoid/levels.ts                                   (nuevo)
lib/games/arkanoid/entities.ts                                 (nuevo)
lib/games/arkanoid/engine.ts                                   (nuevo)
supabase/migrations/20261028100000_reset_scores_bloque_buster.sql (nuevo)
```

## Plan de implementación

1. **Vaciar las puntuaciones en Supabase.**
   - Crear `supabase/migrations/20261028100000_reset_scores_bloque_buster.sql`, aplicarla con `apply_migration` (nombre `reset_scores_bloque_buster`) y revisar `get_advisors`.
   - Comprobar con `execute_sql` que `scores` no tiene filas de `bloque-buster`.
   - Resultado: `/games/bloque-buster` y su pestaña de `/salon` muestran "SIN PUNTUACIONES TODAVÍA". La partida sigue siendo la simulada.
2. **Portar el motor a TypeScript.**
   - Crear `constants.ts`, `levels.ts`, `entities.ts` y `engine.ts` con las reglas 1:1 de `game.js` y `levels.js`, más el bucle de niveles y `speedFor(n)`.
   - En este paso se dibujan rectángulos planos con los nombres de color del original (`red`, `yellow`…) en lugar de los sprites.
   - Entrada con `keydown`/`keyup` en `window` y `mousemove` en el canvas, registrados en `createArkanoidGame` y quitados en `destroy`. `preventDefault` y escalado del ratón según el alcance.
   - Quitar el HUD, los overlays, el estado `win`, la pausa con `P`/`Escape`, el selector de nivel, el spritesheet y los sonidos.
   - Implementar `pause / resume / restart / end / destroy`, los callbacks (con `lives` 3 → 0), el límite de `dt` y el escalado HiDPI.
   - Todavía no lo usa nadie. Resultado: `npm run build` y `npm run lint` pasan.
3. **Componente y ruta.**
   - Crear `components/games/arkanoid-game.tsx` (`"use client"`) con `useCanvasGame(createArkanoidGame, { score: 0, lives: 3, level: 1 })`, `<GameShell>` y `<CanvasScreen>`, igual que `tetris-game.tsx`.
   - Crear `app/games/bloque-buster/play/page.tsx` con `getGame("bloque-buster")`, igual que la ruta de CAÍDA.
   - Resultado: BLOQUE BUSTER es jugable de principio a fin y GUARDAR PUNTUACIÓN crea una fila en `scores`.
4. **Paleta neón y explosión.**
   - Usar `/frontend-design` para fijar `PALETTE`, `GLOW` y las 4 fases de la explosión, y aplicarlos en `entities.ts` y `engine.ts`.
   - El glow va en la paleta, la pelota y las explosiones. Los bloques vivos solo lo llevan si el rendimiento lo permite (ver Riesgos).
5. **Verificación final.**
   - `npm run build` y `npm run lint`.
   - Recorrer los criterios de aceptación con el MCP de Playwright y el de Supabase.
   - Partida manual completa (el usuario).

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `app/games/[id]/play/page.tsx`, `components/games/game-shell.tsx`, `components/games/use-canvas-game.tsx` y `app/data/games.ts` no aparecen en `git diff`.
- [ ] `/games/serpentina/play` se ve y se comporta igual que antes (partida simulada).
- [ ] `/games/rocas/play` y `/games/caida/play` funcionan igual que antes.
- [ ] `/games/bloque-buster/play` muestra un `<canvas>` dentro de `.crt-screen` que ocupa todo el ancho manteniendo 4:3, sin errores en consola.
- [ ] Al iniciar, el HUD de React muestra PUNTUACIÓN 0, VIDAS ♥ ♥ ♥ y NIVEL 01. El canvas no dibuja `Score`, `Nivel` ni vidas como pelotas.
- [ ] El nivel 1 muestra 60 bloques en una rejilla de 10 × 6 que empieza en `x = 80`, `y = 80`.
- [ ] Al romper un bloque, la PUNTUACIÓN sube 10 y se ve la explosión durante unos 150 ms.
- [ ] La pelota rebota en las paredes izquierda, derecha y superior, y en la paleta sube sin cambiar de ángulo.
- [ ] Si la pelota cae por debajo de la paleta, VIDAS baja en uno y la pelota sale otra vez desde encima de la paleta sin pulsar nada.
- [ ] Al vaciar el nivel 1, NIVEL pasa a 02 y aparece la pirámide de 40 bloques. Los niveles 3, 4 y 5 muestran 30, 39 y 39 bloques.
- [ ] Al vaciar el nivel 5, NIVEL pasa a 06, vuelve la parrilla de 60 bloques y no aparece "¡Completaste el juego!".
- [ ] `speedFor(n)` devuelve 1.00, 1.10, 1.21, 1.33 y 1.46 del nivel 1 al 5, unos 1.61 en el 6, y 2.0 en el 9 y siguientes.
- [ ] ← → mueven la paleta, que no sale de los bordes del canvas.
- [ ] Mover el ratón sobre el canvas centra la paleta en el cursor, también con el CRT escalado y con `devicePixelRatio` 2.
- [ ] Pulsar ← → en `/games/bloque-buster/play` no hace scroll en la página.
- [ ] PAUSA congela el canvas y muestra "EN PAUSA", sin el selector de nivel 1–5. REANUDAR continúa sin saltos. `P` y `Escape` hacen lo mismo.
- [ ] Durante la pausa, ni las flechas ni el ratón mueven la paleta.
- [ ] Mantener `ArrowLeft` pulsada, pausar, soltarla y reanudar: la paleta no sigue moviéndose.
- [ ] Cambiar de pestaña y volver: el juego está en pausa y la pelota no ha atravesado bloques ni la paleta.
- [ ] Al perder la tercera vida, VIDAS pasa a "—" y se abre "FIN DEL JUEGO" con la puntuación final, sin el overlay GAME OVER del original. FIN hace lo mismo con la puntuación actual.
- [ ] Con el modal abierto se pueden escribir iniciales con espacios, y ← → no mueven la paleta.
- [ ] GUARDAR PUNTUACIÓN muestra "GUARDANDO…" y luego "▸ PUNTUACIÓN GUARDADA_", y aparece una fila nueva en `scores` con `game_id = 'bloque-buster'`.
- [ ] Una puntuación que entra en el TOP 10 aparece en `/games/bloque-buster` y en la pestaña BLOQUE BUSTER de `/salon` sin recargar la caché, y coincide con `leaderboard('bloque-buster', 10)`.
- [ ] JUGAR DE NUEVO cierra el modal y empieza una partida nueva: PUNTUACIÓN 0, VIDAS ♥ ♥ ♥, NIVEL 01, parrilla de 60 bloques y paleta centrada.
- [ ] Al navegar de `/games/bloque-buster/play` a otra página, pulsar flechas o mover el ratón no lanza errores, y la página hace scroll con normalidad.
- [ ] Con emulación táctil en Playwright, `/games/bloque-buster/play` muestra "REQUIERE TECLADO" y no hay `<canvas>`.
- [ ] La paleta, la pelota, los bloques y las explosiones usan los colores de `PALETTE`, y el canvas se ve nítido con `devicePixelRatio` 2.
- [ ] No se carga ningún PNG ni mp3 en la red al abrir `/games/bloque-buster/play`.
- [ ] Tras la migración, `select count(*) from scores where game_id = 'bloque-buster'` devuelve 0 antes de jugar, y `/games/bloque-buster` y su pestaña de `/salon` muestran "SIN PUNTUACIONES TODAVÍA".
- [ ] `list_migrations` muestra `reset_scores_bloque_buster`.

## Decisiones

- **Sí:** port 1:1 de `references/started-games/04-arkanoid/`, con las mismas constantes, 10 puntos por bloque, 3 vidas, rebote sin ángulo y relanzamiento automático. El único cambio de física es el límite de 50 ms en el `dt`. Elegido por el usuario.
- **Sí:** sustituir la partida simulada de `bloque-buster`. **No:** un juego nuevo `arkanoid`, que necesitaría fila, entrada en `GAMES` y cover nuevas para un género que el catálogo ya tiene. Elegido por el usuario.
- **Sí:** título BLOQUE BUSTER, `short`, `long`, categoría ARCADE, `cover-bricks`, color cyan y posición 1 sin cambios. **No:** "ARKANOID" como título, porque es una marca y el catálogo usa nombres propios en español. El `long` actual ya describe el juego real. Elegido por el usuario.
- **Sí:** vaciar las 12 puntuaciones aleatorias de `bloque-buster`. **No:** conservarlas, porque casi todas superan con mucho lo que se puede conseguir. Elegido por el usuario.
- **Sí:** una migración solo de reset (`reset_scores_bloque_buster`), porque no cambia ningún texto del catálogo.
- **Sí:** sin estado de victoria. Tras el nivel 5 se repiten los patrones con NIVEL creciente y velocidad `min(2.0, 1.46 × 1.1^(n − 5))`. **No:** `onGameOver` al terminar el nivel 5, porque con un máximo de 2.080 el ranking acabaría lleno de empates. Elegido por el usuario.
- **Sí:** quitar el selector de nivel de la pausa. Saltar niveles rompería el ranking, y la pausa la pinta `GameShell`. Elegido por el usuario.
- **Sí:** ← → con `preventDefault` y el ratón, que se mantiene con la coordenada escalada a la resolución lógica. Espacio y ↑ ↓ no se tocan porque el juego no los usa. Elegido por el usuario.
- **Sí:** `P`/`Escape` pasan al hook, y en pausa el motor ignora teclado y ratón. Elegido por el usuario.
- **Sí:** HUD de `GameShell` sin cambios (PUNTUACIÓN, VIDAS, NIVEL). El juego encaja en las tres métricas. Elegido por el usuario.
- **Sí:** 800×600, la resolución de la referencia, que ya es 4:3. No hay que recolocar nada.
- **Sí:** redibujar en canvas con la paleta neón. **No:** copiar el spritesheet a `public/games/bloque-buster/`, porque sus colores no son los de la plataforma y obligaría a esperar la carga. Elegido por el usuario.
- **Sí:** mantener la explosión de 150 ms en 4 fases, redibujada sin sprites. Elegido por el usuario.
- **Sí:** sin sonido, igual que ROCAS y CAÍDA. **No:** copiar los mp3 con un botón de mute, porque obligaría a ampliar `GameShell`. Irá en una spec de sonido. Elegido por el usuario.
- **Sí:** aviso "REQUIERE TECLADO" en táctil con `CanvasScreen`. **No:** controles táctiles en esta spec. Elegido por el usuario.
- **Sí:** usar `useCanvasGame` y `CanvasScreen` de la SPEC 07 sin cambios. **No:** extraer ni duplicar nada, porque el hook ya existe.
- **Sí:** `levels.ts` aparte en `lib/games/arkanoid/`, porque la referencia ya separa los niveles. `entities.ts` contiene funciones puras, porque el original no tiene clases.
- **Sí:** el leaderboard se hereda de `GameShell` + `submitScore` + `getLeaderboard`. **No:** código de ranking propio del juego.
- **Sí:** ruta estática `app/games/bloque-buster/play/page.tsx`. **No:** un `if` en la ruta genérica.
- **Sí:** motor en `lib/games/arkanoid/` y componente en `components/games/`, como ROCAS y CAÍDA.
- **Sí:** paleta neón con glow, diseñada con `/frontend-design`. Exigido por `CLAUDE.md`.
- **Sí:** los callbacks solo se emiten cuando cambia el valor, para no provocar un render de React en cada frame.

## Riesgos

| Riesgo                                                                                             | Mitigación                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Listeners o `requestAnimationFrame` que sobreviven al desmontar (el original deja cuatro colgados) | `destroy` idempotente y criterio de navegación sin errores. StrictMode lo prueba en desarrollo.                                                             |
| `preventDefault` en las flechas impide moverse por el input de iniciales del modal                 | No se aplica con foco en `input`/`textarea` ni en `gameover`. Hay un criterio específico.                                                                   |
| Salto de `dt` al reanudar o al volver de otra pestaña (la pelota atraviesa bloques o la paleta)    | `resume` reinicia `lastTime` y el `dt` se limita a 50 ms.                                                                                                   |
| A ×2.0 un frame lento de 50 ms mueve la pelota 30 px, más que el alto de un bloque (24 px)         | A 60 fps son 10 px por frame. Se acepta en frames lentos aislados para no cambiar la física; si se nota en la partida manual, va en otra spec con subpasos. |
| El ratón mueve mal la paleta si se escala con `canvas.width` (que incluye el `devicePixelRatio`)   | Se escala con `W / rect.width`. Hay un criterio con `devicePixelRatio` 2.                                                                                   |
| Renders de React a 60 fps                                                                          | Callbacks solo cuando cambia el valor.                                                                                                                      |
| `create` inestable en el hook recrea el motor en cada render                                       | `createArkanoidGame` es una función de módulo, nunca una lambda inline.                                                                                     |
| `shadowBlur` en 60 bloques vivos baja los FPS                                                      | Glow en la paleta, la pelota y las explosiones. Los bloques vivos solo lo llevan si se mantiene a 60 fps (se decide en el paso 4).                          |
| La caché del ranking sigue mostrando las puntuaciones viejas tras la migración                     | Reiniciar `next dev`; en producción entra con el build.                                                                                                     |

## Lo que **no** entra en esta spec

- Controles táctiles.
- Sonido, música o mute.
- Spritesheet en `public/`.
- Ángulo de rebote, lanzamiento con tecla, power-ups o cualquier mecánica que no esté en `game.js`.
- Selector de nivel.
- Cambios en `useCanvasGame`, `CanvasScreen` o `GameShell`.
- Cambios en los demás juegos simulados.
- Auth, antitrampas y test runner.

Cada una de estas cosas, si llega, irá en su propia spec.

# SPEC 05 — Juego Asteroids real en ROCAS

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-10-26
> **Objetivo:** Portar el Asteroids de `references/02-asteroids/` a TypeScript y hacerlo jugable en `/games/rocas/play`, integrado con el HUD, la pausa y el modal de fin de partida de la plataforma.

## Por qué existe esta spec

Hasta ahora `/games/[id]/play` muestra una partida simulada: un contador que suma puntos al azar sobre una animación CSS. `references/02-asteroids/` tiene un Asteroids completo en canvas puro (`game.js`, 510 líneas), pero está escrito como script global. Busca el canvas con `getElementById`, registra teclado en `window` sin quitarlo nunca, dibuja su propio HUD y se reinicia con Espacio.

Esta spec lo convierte en el primer juego real de Arcade Vault. Su motor se puede montar y desmontar, React lo controla y usa la interfaz de la plataforma. De paso, separa esa interfaz (HUD, CRT y modal) de la partida simulada, para que el resto de juegos sigan igual y los próximos tengan dónde engancharse.

## Alcance

**Entra:**

- Port 1:1 de `game.js` a TypeScript en `lib/games/asteroids/`, sin React. Mismas clases (`Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`), mismas constantes y mismas reglas: físicas, puntos 20/50/100, 3 vidas con invencibilidad, niveles con `3 + nivel` asteroides y power-up de triple disparo.
- API del motor `createAsteroidsGame(canvas, callbacks)`, que devuelve `pause / resume / restart / end / destroy`. `destroy` cancela el `requestAnimationFrame` y quita todos los listeners.
- El motor avisa a React solo cuando cambian `score`, `lives` o `level`, y cuando hay game over.
- Del canvas se quitan el HUD (`SCORE`, `NIVEL`, iconos de vidas), el overlay "GAME OVER" y el reinicio con Espacio. Se mantiene el indicador `3x  N.Ns` del triple disparo, porque es parte de la jugabilidad.
- `preventDefault` en `ArrowLeft`, `ArrowRight`, `ArrowUp` y `Space` mientras se juega, para que la página no haga scroll. Nunca se aplica cuando el foco está en un `input` o `textarea`.
- Al pausar se limpian las teclas pulsadas, para que la nave no siga girando o propulsando al reanudar.
- Resolución lógica fija de 800×600, escalada con CSS al `.crt-screen` (que ya es 4:3), con el buffer multiplicado por `devicePixelRatio`.
- Paleta neón de la plataforma con el mismo trazo vectorial y un glow suave (`shadowBlur`), diseñada con `/frontend-design`.
- Extraer de `components/game-player.tsx` un shell de presentación, `components/games/game-shell.tsx`, con HUD, CRT, overlay de pausa, modal de fin y botones. `GamePlayer` (partida simulada) pasa a usarlo sin cambiar nada visible.
- Componente cliente `components/games/asteroids-game.tsx`, que monta el canvas, crea y destruye el motor y conecta su estado con el shell.
- Ruta estática `app/games/rocas/play/page.tsx`, que tiene prioridad sobre `app/games/[id]/play/page.tsx`. La ruta genérica no se toca.
- Pausa por tres vías que comparten un único estado de React: botón PAUSA/REANUDAR, teclas `P`/`Escape`, y pausa automática cuando la pestaña se oculta (`visibilitychange`).
- Fin de partida: `onGameOver(score)` abre el modal "FIN DEL JUEGO". El botón FIN llama a `end()`, que fuerza el game over con la puntuación actual. JUGAR DE NUEVO llama a `restart()`.
- Guardar la puntuación igual que ahora, con `saveScore({ game: "rocas", score, name })` de `lib/session.ts` (localStorage).
- En dispositivos sin teclado, detectados con `(hover: none) and (pointer: coarse)`, el CRT muestra el aviso "REQUIERE TECLADO" y el motor no se crea.

**Fuera de alcance (specs futuras):**

- Controles táctiles.
- Sonido, música o botón de mute.
- OVNIs o cualquier mecánica que no esté en `game.js`. La frase "Cuidado con los OVNIs" de la ficha de ROCAS se deja como está y `app/data/games.ts` no se toca.
- Guardar puntuaciones en Supabase (tablas `scores`, RLS, Auth).
- Que el Salón de la Fama, las portadas o el campo `best` reflejen puntuaciones reales.
- Un componente genérico `CanvasGame` o un registro de motores. Se extraerá cuando llegue el segundo juego de canvas.
- Portar Tetris (`references/03-tetris`) o Arkanoid (`references/04-arkanoid`).
- Cambios en los otros 7 juegos, que siguen con la partida simulada.
- Instalar un test runner o escribir tests unitarios del motor.

## Modelo de datos

No se persiste nada nuevo. Las estructuras nuevas son la API del motor y las props del shell.

### Motor (`lib/games/asteroids/engine.ts`)

```ts
export type AsteroidsCallbacks = {
  onScore: (score: number) => void; // solo cuando cambia
  onLives: (lives: number) => void; // solo cuando cambia
  onLevel: (level: number) => void; // solo cuando cambia
  onGameOver: (score: number) => void; // una vez por partida
};

export type AsteroidsGame = {
  pause: () => void; // detiene el loop y limpia las teclas pulsadas
  resume: () => void; // reanuda sin salto de dt (reinicia lastTime)
  restart: () => void; // initGame() y vuelve a emitir score/lives/level iniciales
  end: () => void; // fuerza game over con la puntuación actual → onGameOver
  destroy: () => void; // cancela rAF y quita listeners; idempotente
};

export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsGame;
```

- El estado interno sigue el original: `state: "playing" | "dead" | "gameover"`. En `gameover`, el motor sigue animando las partículas, ignora la entrada y no aplica `preventDefault`.
- `dt` sigue limitado a 50 ms.
- Al crearse, el motor emite los valores iniciales `onScore(0)`, `onLives(3)` y `onLevel(1)`.

### Archivos del motor

| Archivo                            | Contenido                                                                                                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/games/asteroids/constants.ts` | `W`, `H`, `RADII`, `SPEEDS`, `POINTS`, constantes del power-up y de la nave, y `PALETTE`                                                                              |
| `lib/games/asteroids/entities.ts`  | Clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle` y utilidades `wrap`, `dist`, `rand`, `randInt`. `draw(ctx)` recibe el contexto en lugar de usar uno global |
| `lib/games/asteroids/engine.ts`    | Estado, entrada, `update`, `draw`, loop y `createAsteroidsGame`                                                                                                       |

`PALETTE` usa los hex de los tokens de `app/globals.css`, porque el canvas no lee variables CSS. Los colores finales los decide `/frontend-design`, partiendo de esta propuesta:

```ts
export const PALETTE = {
  bg: "#000",
  ship: "#f5ff00", // --yellow (color de ROCAS)
  flame: "#ff006e", // --magenta
  asteroid: "#00f5ff", // --cyan
  bullet: "#e6e9ff", // --ink
  powerUp: "#ff006e", // --magenta
  particle: "0,245,255", // rgb de --cyan, para rgba con alpha
} as const;
```

### Shell (`components/games/game-shell.tsx`)

```ts
type GameShellProps = {
  game: Game;
  hud: { score: number; lives: number; level: number };
  paused: boolean;
  over: boolean;
  onTogglePause: () => void;
  onEnd: () => void; // botón FIN
  onRestart: () => void; // botón JUGAR DE NUEVO del modal
  children: React.ReactNode; // contenido de .crt-screen
};
```

- El shell se encarga del nombre del jugador (`useUser`, iniciales escritas) y de `saveScore`, igual que hoy `GamePlayer`.
- Cuando `over` es `true`, el botón PAUSA queda deshabilitado.
- `children` va dentro de `.crt-screen`, y el overlay "EN PAUSA" se pinta por encima.

### Estructura final

```
app/games/rocas/play/page.tsx        (nuevo)
components/game-player.tsx           (modificado: usa GameShell)
components/games/game-shell.tsx      (nuevo)
components/games/asteroids-game.tsx  (nuevo)
lib/games/asteroids/constants.ts     (nuevo)
lib/games/asteroids/entities.ts      (nuevo)
lib/games/asteroids/engine.ts        (nuevo)
app/globals.css                      (estilos del canvas y del aviso REQUIERE TECLADO)
```

## Plan de implementación

1. **Extraer el shell.**
   - Crear `components/games/game-shell.tsx` con el JSX de HUD, CRT, overlay de pausa, modal y botones que hoy está en `game-player.tsx`.
   - `GamePlayer` conserva su lógica simulada (intervalo, pausa, fin, reinicio) y renderiza `<GameShell>` con la `game-arena` falsa como `children`.
   - Resultado: todas las rutas `/games/[id]/play` se ven y funcionan exactamente igual.
2. **Portar el motor a TypeScript.**
   - Crear `lib/games/asteroids/constants.ts`, `entities.ts` y `engine.ts` copiando las reglas de `game.js` 1:1. Las clases reciben `ctx` en `draw`, y en este paso se mantiene la paleta blanca original.
   - Entrada con listeners en `window` registrados en `createAsteroidsGame` y quitados en `destroy`. Aplicar `preventDefault` según las reglas del alcance.
   - Quitar del canvas el HUD, el overlay de game over y el reinicio con Espacio, y mantener el indicador `3x`.
   - Implementar `pause/resume/restart/end/destroy` y los callbacks.
   - Escalado HiDPI: `canvas.width = 800 * dpr`, `canvas.height = 600 * dpr` y `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`.
   - Todavía no lo usa nadie. Resultado: `npm run build` y `npm run lint` pasan.
3. **Componente y ruta de ROCAS.**
   - Crear `components/games/asteroids-game.tsx` (`"use client"`), que crea el motor en un `useEffect` con el `<canvas>` por ref y llama a `destroy` en la limpieza. Debe funcionar con el doble montaje de StrictMode.
   - Conectar los callbacks con el estado `hud` y `over`, y `paused` con `pause()`/`resume()`.
   - Pausa con `P`/`Escape` (ignoradas con `over` o con el foco en un `input`) y con `visibilitychange` cuando `document.hidden`.
   - FIN llama a `end()` y JUGAR DE NUEVO a `restart()`, que además resetea `over` y `paused`.
   - Crear `app/games/rocas/play/page.tsx`, que obtiene `getGame("rocas")` y renderiza `<AsteroidsGame game={game} />`, con `<Suspense fallback={<ScreenLoading />}>` si hace falta por `cacheComponents`. Leer antes la sección de rutas dinámicas y prioridad de segmentos en `node_modules/next/dist/docs/01-app/`.
   - CSS en `app/globals.css` para que el canvas ocupe `.crt-screen` (`position: absolute; inset: 0; width: 100%; height: 100%`).
   - Resultado: ROCAS es jugable de principio a fin con la paleta blanca.
4. **Paleta neón.**
   - Usar `/frontend-design` para fijar `PALETTE` y el glow (`shadowBlur`, `shadowColor`) de nave, asteroides, balas, power-up, llama y partículas, y aplicarlos en `entities.ts` y `engine.ts`.
   - El glow no se aplica a las partículas si baja el rendimiento (ver Riesgos).
5. **Aviso de dispositivo sin teclado.**
   - En `asteroids-game.tsx`, detectar `(hover: none) and (pointer: coarse)` con `useSyncExternalStore` sobre `matchMedia`, con snapshot de servidor `false`.
   - Si coincide, mostrar en `.crt-content` el aviso "REQUIERE TECLADO" con un subtítulo ("JUEGA DESDE UN ORDENADOR") y no crear el motor.
6. **Verificación final.**
   - Ejecutar `npm run build` y `npm run lint`.
   - Recorrer los criterios de aceptación con el MCP de Playwright.
   - Hacer una partida manual completa (el usuario).

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` termina sin errores.
- [ ] `app/games/[id]/play/page.tsx` y `app/data/games.ts` no aparecen en `git diff`.
- [ ] `/games/bloque-buster/play` (y cualquier otro id que no sea `rocas`) se ve y se comporta igual que antes: contador simulado, PAUSA, FIN, modal y guardado.
- [ ] `/games/rocas/play` muestra un `<canvas>` dentro de `.crt-screen` que ocupa todo el ancho manteniendo 4:3, sin errores en consola.
- [ ] En `/games/rocas/play`, el canvas no dibuja `SCORE`, `NIVEL` ni iconos de vidas. Al iniciar, el HUD de React muestra PUNTUACIÓN 0, VIDAS ♥ ♥ ♥ y NIVEL 01.
- [ ] Al destruir un asteroide grande, la PUNTUACIÓN del HUD sube 20; uno mediano, 50; uno pequeño, 100.
- [ ] Al chocar con un asteroide, VIDAS baja en uno. Al vaciar el nivel, NIVEL sube y aparecen `3 + nivel` asteroides grandes.
- [ ] Al recoger el power-up aparece en el canvas el indicador `3x  N.Ns` y se disparan 3 balas.
- [ ] Pulsar flechas o Espacio en `/games/rocas/play` no hace scroll en la página.
- [ ] PAUSA congela el canvas y muestra "EN PAUSA"; REANUDAR continúa sin saltos. `P` y `Escape` hacen lo mismo.
- [ ] Mantener `ArrowLeft` pulsada, pausar, soltarla y reanudar: la nave no sigue girando.
- [ ] Cambiar de pestaña y volver: el juego está en pausa.
- [ ] Al perder la última vida se abre el modal "FIN DEL JUEGO" con la puntuación final, y el canvas no muestra el overlay "GAME OVER" del original.
- [ ] FIN abre el modal con la puntuación actual.
- [ ] Con el modal abierto se pueden escribir iniciales con espacios en el input, y Espacio no reinicia el juego.
- [ ] GUARDAR PUNTUACIÓN añade a `localStorage.av_scores` una entrada con `game: "rocas"` y la puntuación final.
- [ ] JUGAR DE NUEVO cierra el modal y empieza una partida nueva: PUNTUACIÓN 0, VIDAS 3, NIVEL 01.
- [ ] Al navegar de `/games/rocas/play` a otra página, pulsar flechas o Espacio no lanza errores y la página puede hacer scroll con normalidad (no quedan listeners ni loop activos).
- [ ] Con emulación táctil en Playwright (`hasTouch`, `isMobile`), `/games/rocas/play` muestra "REQUIERE TECLADO" y no hay `<canvas>`.
- [ ] Nave, asteroides, balas y power-up usan los colores de `PALETTE`, y el canvas se ve nítido en una pantalla con `devicePixelRatio` 2.

## Decisiones

- **Sí:** reutilizar la entrada `rocas` del catálogo, sin crear un juego `asteroids` nuevo. Elegido por el usuario.
- **Sí:** portar a un módulo TypeScript independiente de React con API `create…/destroy`. **No:** iframe con `postMessage` ni reescritura en React. Elegido por el usuario.
- **Sí:** componente específico `AsteroidsGame`. **No:** `CanvasGame` genérico por ahora (YAGNI; se extraerá con el segundo juego de canvas). Elegido por el usuario.
- **Sí:** ruta estática `app/games/rocas/play/page.tsx`. **No:** un `if (id === "rocas")` en la ruta genérica. Elegido por el usuario.
- **Sí:** solo el HUD de React; el canvas conserva únicamente el indicador `3x`. **No:** doble HUD ni HUD solo en canvas. Elegido por el usuario.
- **Sí:** pausa por botón, `P`/`Escape` y `visibilitychange`, todas con el mismo estado. Elegido por el usuario.
- **Sí:** el motor avisa del game over con `onGameOver` y React muestra el modal. **No:** reinicio con Espacio dentro del canvas. Elegido por el usuario.
- **Sí:** extraer `GameShell` de `GamePlayer` como capa de presentación compartida. **No:** duplicar el JSX ni añadir un slot a `GamePlayer`. Elegido por el usuario.
- **Sí:** paleta neón de la plataforma con glow, diseñada con `/frontend-design`. Elegido por el usuario y exigido por `CLAUDE.md`.
- **Sí:** resolución lógica fija de 800×600 escalada por CSS con HiDPI. **No:** un mundo que crezca con la pantalla, porque la dificultad y las puntuaciones no serían comparables. Elegido por el usuario.
- **Sí:** aviso "REQUIERE TECLADO" en dispositivos táctiles. **No:** controles táctiles en esta spec. Elegido por el usuario.
- **Sí:** puntuación en localStorage con `saveScore`. **No:** tabla `scores` en Supabase todavía. Elegido por el usuario.
- **Sí:** port 1:1 de la jugabilidad. **No:** sonido ni OVNIs. Elegido por el usuario.
- **Sí:** motor en `lib/games/asteroids/` (constants, entities, engine) y componentes en `components/games/`. Elegido por el usuario.
- **Sí:** verificación con build, lint, Playwright y una partida manual. **No:** instalar Vitest en esta spec. Elegido por el usuario.
- **Sí:** los callbacks solo se emiten cuando cambia el valor, para no provocar un render de React en cada frame.

## Riesgos

| Riesgo                                                                                                | Mitigación                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Listeners o `requestAnimationFrame` que sobreviven al desmontar (el original los deja colgados)       | `destroy` idempotente, que cancela rAF y quita listeners. Hay un criterio de navegación sin errores, y el doble montaje de StrictMode lo pone a prueba en desarrollo.                   |
| `preventDefault` en Espacio impide escribir en el input de iniciales del modal                        | No se aplica con el foco en `input`/`textarea` ni en estado `gameover`. Hay un criterio específico.                                                                                     |
| Un salto de `dt` al reanudar o al volver de otra pestaña hace que los objetos "teletransporten"       | `resume` reinicia `lastTime` y `dt` se mantiene limitado a 50 ms.                                                                                                                       |
| Renders de React a 60 fps si el motor emite en cada frame                                             | Los callbacks solo se emiten cuando cambia el valor.                                                                                                                                    |
| `shadowBlur` en muchas partículas baja los FPS                                                        | El glow se aplica a nave, asteroides, balas y power-up. Las partículas solo lo usan si el rendimiento lo permite (se decide en el paso 4).                                              |
| La ruta estática `rocas/play` choca con `generateStaticParams` de `[id]/play` o con `cacheComponents` | Leer los docs de Next antes del paso 3. `generateStaticParams` de la ruta genérica puede seguir generando `rocas`; si da conflicto en el build, se documenta y se resuelve en ese paso. |
| `matchMedia` en SSR provoca un hydration mismatch                                                     | `useSyncExternalStore` con snapshot de servidor `false`.                                                                                                                                |
| Extraer `GameShell` cambia sin querer el aspecto de los otros juegos                                  | El paso 1 es puramente estructural y hay un criterio de que `bloque-buster` funciona igual.                                                                                             |

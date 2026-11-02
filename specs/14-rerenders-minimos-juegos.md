# SPEC 14 — Re-renders mínimos en los juegos de canvas

> **Estado:** Draft
> **Depende de:** SPEC 07, SPEC 10, SPEC 12
> **Fecha:** 2026-11-02
> **Objetivo:** Que durante una partida de cualquier juego real React no haga ningún render, sacando el HUD del estado con refs y dejando el mínimo de `useState` en `useCanvasGame` y `GameShell`.

## Por qué existe esta spec

El canvas de los juegos va fuera de React, pero el HUD no. `useCanvasGame` guarda `hud` (puntuación, vidas y nivel) en un `useState`, y el motor avisa con `onScore`, `onLives` y `onLevel` cada vez que cambian. Cada aviso hace un commit de React. En ese commit se vuelven a renderizar el componente del juego, todo `GameShell` (HUD, selector de skins, CRT y modal) y el `TouchPad`.

En VAIVÉN la puntuación sube en cada salto hacia delante y en cada rozón. En BLOQUE BUSTER, en cada ladrillo. En ROCAS, en cada roca. Pasa en los cinco juegos, porque todos usan el mismo hook.

Además, `input`, `togglePause`, `end` y `restart` se crean de nuevo en cada render. Por eso el efecto `setEmit` del `TouchPad` se repite en cada commit. No hay React Compiler que lo memoice solo.

Esta spec es la parte de React del problema de rendimiento. La parte del canvas de VAIVÉN es la SPEC 13. Son independientes y pueden implementarse en cualquier orden.

## Alcance

**Entra:**

- **HUD con refs:** `useCanvasGame` crea una ref por valor (`score`, `lives`, `level`). Las callbacks del motor escriben `textContent` en esos nodos, igual que el `TouchPad` marca `data-pressed`. React pinta el valor inicial y no vuelve a cambiar esos nodos.
- **Formato del HUD compartido:** el formato que hoy está en línea en `GameShell` pasa a un módulo propio. Lo usan el render inicial y la escritura por ref, para que el texto sea idéntico.
- **`over` pasa a `finalScore`:** `over: boolean` se sustituye por `finalScore: number | null`, con la puntuación que ya llega en `onGameOver(score)`. El modal de fin la muestra y la guarda desde ahí, no desde el HUD.
- **`paused` sigue siendo estado.** Cambia el texto del botón, el overlay "EN PAUSA" y el `disabled` del mando, y solo cambia cuando el jugador lo pide.
- **Estado del guardado en un solo `useState`:** `saved`, `saving` y `saveError` de `GameShell` se unen en `save`. `typedName` se queda como está.
- **Callbacks estables:** `input`, `togglePause`, `end` y `restart` se crean una sola vez (`useCallback` sin dependencias) y leen el motor desde `engineRef`.
- **`TouchPad` con `React.memo`:** con props estables, pausar o cambiar de skin no lo renderiza mientras `disabled` no cambie.
- **Los cinco componentes de juego** (`asteroids-`, `tetris-`, `arkanoid-`, `snake-` y `hopper-game.tsx`) se adaptan a la nueva interfaz del hook.
- **La partida simulada** (`components/game-player.tsx`) sigue funcionando con `GameShell`. Solo cambia `over` por `finalScore`.
- **El contrato** de `.claude/skills/add-game/integracion.md` (sección del componente) se actualiza al patrón nuevo, para que los juegos futuros nazcan así.
- **Verificación con Playwright** contando los commits de React, sin código nuevo en la app.

**Fuera de alcance (para otras specs):**

- El canvas de VAIVÉN (`drawImage`, caché y glow), que es la SPEC 13.
- Los re-renders de la partida simulada (`GamePlayer` sube la puntuación con `setRun` cada 220 ms). No es un juego real y será sustituida.
- Activar React Compiler (`reactCompiler` en `next.config.ts`), porque es un cambio global de build.
- Cambios en los motores (`lib/games/*`). El contrato `onScore`/`onLives`/`onLevel`/`onGameOver` no cambia.
- Re-renders fuera del player: home, biblioteca, ficha y Salón de la Fama.
- Anunciar los cambios del HUD a lectores de pantalla (`aria-live`). Hoy no se anuncian y no cambia.
- El selector de skins, `useSkin` y `useUser`.

## Modelo de datos

No hay datos persistentes nuevos: ni tablas, ni `localStorage`.

### HUD (`components/games/hud.ts`, nuevo)

```ts
export type Hud = { score: number; lives: number; level: number };
export type HudKey = keyof Hud;
export type HudRefs = Record<HudKey, React.RefObject<HTMLDivElement | null>>;
// Mismo texto en el render inicial y en la escritura por ref.
export const formatHud: Record<HudKey, (n: number) => string> = {
  score: (n) => n.toLocaleString("es-ES"),
  lives: (n) => "♥ ".repeat(n).trim() || "—",
  level: (n) => String(n).padStart(2, "0"),
};
```

### `useCanvasGame` (`components/games/use-canvas-game.tsx`)

Estado que queda: `paused`, `finalScore` y el skin (de `useSkin`), más `touch` (`useSyncExternalStore`). `hud` desaparece.

```ts
// Devuelve:
{
  canvasRef,
  hudRefs,                 // HudRefs: las escribe el motor, nunca React
  paused,                  // boolean (estado)
  finalScore,              // number | null (estado): null = partida en curso
  touch,
  togglePause, end, input, restart, // estables durante toda la vida del componente
  skin, setSkin,
}
```

- `onScore`, `onLives` y `onLevel` hacen `ref.current.textContent = formatHud[k](n)`, si el nodo existe.
- `onGameOver(score)` hace `setFinalScore(score)`.
- `restart` llama a `engine.restart()` (el motor vuelve a emitir 0 / 3 / 1, que se escriben por ref) y hace `setFinalScore(null)` y `setPaused(false)`.
- El efecto de `P`/`Escape` y `visibilitychange` depende de `finalScore !== null` en lugar de `over`.

### `GameShell` (`components/games/game-shell.tsx`)

```ts
type GameShellProps = {
  game: Game;
  hud: Hud; // valores que pinta React; en los juegos reales, el HUD inicial (constante)
  hudRefs?: HudRefs; // si llegan, se enganchan a los <div className="v"> de PUNTUACIÓN, VIDAS y NIVEL
  paused: boolean;
  finalScore: number | null; // sustituye a `over`; el modal se abre con != null y muestra este valor
  // … onTogglePause, onEnd, onRestart, skin, onSkinChange, controls, children sin cambios
};
// Guardado: un solo estado en lugar de saved/saving/saveError.
type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved" }
  | { status: "error"; error: string };
```

Por qué React no pisa lo que escribe la ref: en los juegos reales `hud` es siempre la constante `INITIAL_HUD`. React compara con su último render, no con el DOM, así que en cada re-render (pausa, skin, modal) el texto del HUD "no ha cambiado" y React no lo toca. El texto escrito por el motor se conserva.

### Estructura final

```
components/games/hud.ts                (nuevo: Hud, HudRefs, formatHud)
components/games/use-canvas-game.tsx   (modificado: refs del HUD, finalScore, callbacks estables)
components/games/game-shell.tsx        (modificado: hudRefs, finalScore, SaveState)
components/games/touch-pad.tsx         (modificado: React.memo)
components/games/asteroids-game.tsx    (modificado: nueva interfaz del hook)
components/games/tetris-game.tsx       (modificado)
components/games/arkanoid-game.tsx     (modificado)
components/games/snake-game.tsx        (modificado)
components/games/hopper-game.tsx       (modificado)
components/game-player.tsx             (modificado: finalScore en lugar de over)
.claude/skills/add-game/integracion.md (modificado: patrón del componente)
specs/14-rerenders-minimos-juegos.md   (modificado: tabla de commits)
```

## Mediciones

### Método

Se mide con el MCP de Playwright (`browser_run_code_unsafe`) en el servidor de desarrollo:

- **Contador de commits:** antes de cargar la página, `page.addInitScript` define un `window.__REACT_DEVTOOLS_GLOBAL_HOOK__` mínimo (`supportsFiber: true`, `inject` y `checkDCE` vacíos). Su `onCommitFiberRoot` incrementa `window.__commits`.
- **Ventana:** tras la carga y el primer frame se pone `__commits = 0`. Se juega con la secuencia del juego hasta que la puntuación del HUD cambie al menos dos veces, con un máximo de 30 s. Se anotan los commits.
- **Secuencias:**
  - ROCAS: mantener `Space` y `ArrowLeft`.
  - CAÍDA: caída rápida de la pieza cada 500 ms.
  - BLOQUE BUSTER: lanzar la bola y alternar `←` y `→` cada 400 ms.
  - SERPENTINA: flechas hacia la fruta.
  - VAIVÉN: `↑` cada 300 ms.
- **Si la partida termina** dentro de la ventana, se espera exactamente 1 commit, el del modal.
- **Eventos permitidos:** pulsar PAUSA, cambiar de skin y la game over hacen commits. Se miden aparte, para comprobar que los demás valores no cambian.

### Resultados

Se rellena en el paso 1 (antes) y en el último paso (después).

| Juego         | Antes: commits | Antes: cambios de puntuación | Después: commits | Después: cambios de puntuación |
| ------------- | -------------- | ---------------------------- | ---------------- | ------------------------------ |
| ROCAS         |                |                              |                  |                                |
| CAÍDA         |                |                              |                  |                                |
| BLOQUE BUSTER |                |                              |                  |                                |
| SERPENTINA    |                |                              |                  |                                |
| VAIVÉN        |                |                              |                  |                                |

## Plan de implementación

1. **Medición base.**
   - Sin tocar código: contar los commits en los cinco juegos con el método de [Mediciones](#mediciones) y anotar la columna "Antes".
   - Resultado: hay una línea base (se espera aproximadamente un commit por cada cambio de puntuación, vidas o nivel).
2. **Formato del HUD y refs en `GameShell`.**
   - Crear `components/games/hud.ts`.
   - `GameShell` usa `formatHud` y acepta `hudRefs` opcional.
   - Todavía no cambia nada más.
   - Resultado: los cinco juegos y la partida simulada se ven igual.
3. **HUD por refs y `finalScore` en `useCanvasGame`.**
   - El hook crea `hudRefs`, escribe `textContent` en las callbacks del motor y sustituye `over` por `finalScore`.
   - `GameShell` cambia `over` por `finalScore` y muestra ese valor en el modal y al guardar.
   - Se adaptan los cinco componentes de juego (`hud={INITIAL_HUD}`, `hudRefs`, `finalScore`) y `GamePlayer` (`finalScore={over ? run.score : null}`).
   - Resultado: el HUD se actualiza sin commits, y FIN, game over, guardar y JUGAR DE NUEVO funcionan igual.
4. **Callbacks estables y `TouchPad` memoizado.**
   - `useCallback` sin dependencias en `input`, `togglePause`, `end` y `restart`.
   - `export const TouchPad = memo(function TouchPad…)`.
   - Resultado: pausar no renderiza el mando, y `setEmit` solo se ejecuta al montar.
5. **Guardado en un solo estado.**
   - `SaveState` sustituye a `saved`, `saving` y `saveError` en `GameShell`.
   - Resultado: el modal muestra GUARDANDO…, PUNTUACIÓN GUARDADA y los errores igual que antes.
6. **Contrato y medición final.**
   - Actualizar la sección del componente en `integracion.md` (estado `paused` + `finalScore`, `hudRefs`, callbacks estables, `disabled={paused || finalScore !== null}`).
   - Repetir la medición, anotar la columna "Después", y ejecutar `npm run build` y `npm run lint`.

## Criterios de aceptación

**Sin re-renders en partida (tabla de [Mediciones](#mediciones) rellena):**

- [ ] La tabla tiene las columnas "Antes" y "Después" completas en los cinco juegos.
- [ ] En los cinco juegos, la ventana de medición tiene 0 commits de React con al menos dos cambios de puntuación (1 commit si la partida termina dentro de la ventana).
- [ ] Perder una vida o subir de nivel no produce ningún commit.
- [ ] Pulsar PAUSA produce commits, pero con el mando táctil visible (390×844, táctil) el `TouchPad` no se renderiza al pausar. Se comprueba quitando el `data-pressed="true"` a mano: el atributo no vuelve.

**HUD correcto:**

- [ ] PUNTUACIÓN, VIDAS y NIVEL muestran el mismo texto que antes de la spec: puntuación con separador `es-ES`, `♥ ♥ ♥` o `—`, y nivel con dos cifras.
- [ ] Tras pausar, reanudar y cambiar de skin, el HUD conserva los valores de la partida (no vuelve a 0 / 3 / 01).
- [ ] JUGAR DE NUEVO deja el HUD en 0, `♥ ♥ ♥` y 01.
- [ ] La puntuación del modal de fin es igual a la del HUD en el momento de la game over, tanto por muerte como por el botón FIN.

**Estado mínimo:**

- [ ] `useCanvasGame` solo tiene `useState` para `paused` y `finalScore`.
- [ ] `GameShell` solo tiene `useState` para `typedName` y `save`.
- [ ] `togglePause`, `end`, `input` y `restart` mantienen la misma identidad entre renders.

**Sin regresiones:**

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] Guardar la puntuación sigue insertando en `scores` y la nueva entrada aparece en el TOP 10 de la ficha.
- [ ] Un error al guardar sigue mostrando el aviso y permite reintentar.
- [ ] `P`/`Escape` pausan y reanudan, y quedan ignoradas con el modal abierto o con foco en el input. Cambiar de pestaña pausa.
- [ ] La partida simulada (`/games/gloton/play`) sigue funcionando: puntuación que sube, PAUSA, FIN y modal.
- [ ] El mando táctil de los cinco juegos funciona igual en 390×844 y 844×390, y se desactiva en pausa y en game over.
- [ ] La consola del navegador no muestra errores ni avisos de React en los cinco juegos.

## Decisiones

- **Spec aparte de la 13.** La 13 es el canvas de un juego. Esta toca el hook y el shell que comparten todos. Mezclarlas tocaría tres áreas a la vez.
- **Refs + `textContent` para el HUD.** Durante la partida no hay ningún render. Es el mismo patrón que ya usa el `TouchPad` con `data-pressed`.
- **No:** un store externo con `useSyncExternalStore` en un `<GameHud>` aparte. Aislaría el render, pero seguiría renderizando el HUD en cada punto.
- **`finalScore` en lugar de `over`.** Un solo estado da las dos cosas: si se acabó la partida y con qué puntuación. El modal ya no depende del HUD, que ahora vive fuera de React.
- **`paused` se queda en estado.** Controla el texto del botón, el overlay y el mando. Cambia solo a petición del jugador, así que pasarlo a ref no ahorra nada que importe y complica el render.
- **`SaveState` como unión discriminada.** Tres `useState` que siempre cambian juntos son un solo estado. La unión impide combinaciones imposibles, como `saving` y `saved` a la vez.
- **`useCallback` sin dependencias + `engineRef`.** Las callbacks no necesitan más que el motor actual y los setters, que ya son estables.
- **`React.memo` solo en `TouchPad`.** Es el único hijo con props estables y trabajo por render (handlers y mapa de botones). `GameShell` se renderiza en pausa y en el modal de todas formas.
- **No:** React Compiler. Lo resolvería en todo el proyecto, pero es un cambio de build global que merece su propia spec.
- **`hud` se mantiene como prop de `GameShell`.** Así la partida simulada sigue funcionando con estado y sin refs, y los juegos reales le pasan la constante inicial.
- **Contar commits con un hook de DevTools inyectado desde Playwright.** No añade código a la app y mide exactamente lo que se quiere evitar.

## Riesgos

| Riesgo                                                                          | Mitigación                                                                                                                                                 |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React pisa el texto escrito por la ref en un re-render                          | En los juegos reales `hud` es una constante: el diff de React no cambia y no toca el nodo. Hay un criterio que lo comprueba tras pausar y cambiar de skin. |
| Con el doble montaje de StrictMode el motor emite antes de que existan las refs | El motor se crea en un `useEffect`, cuando el DOM ya está montado. La escritura comprueba que `ref.current` exista.                                        |
| Un juego futuro copia el patrón viejo (`hud` en estado)                         | `integracion.md` se actualiza en el paso 6.                                                                                                                |
| El hook falso de DevTools rompe la carga o choca con la extensión real          | Se usa un contexto de Playwright sin extensiones. Si React no lo acepta, se usa `<Profiler>` en una rama de medición que no se mergea.                     |
| La medición en dev (StrictMode) da números distintos a producción               | "Antes" y "después" se miden en el mismo modo. El criterio es 0 commits, que no depende del modo.                                                          |

## Qué **no** entra en esta spec

- El canvas de VAIVÉN (SPEC 13).
- Los re-renders de la partida simulada y de las páginas fuera del player.
- React Compiler.
- Cambios en los motores o en su contrato de callbacks.
- `aria-live` en el HUD.

Cada una de estas, si llega, irá en su propia spec.

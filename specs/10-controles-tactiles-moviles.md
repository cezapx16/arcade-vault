# SPEC 10 — Controles táctiles para jugar en el móvil

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 07, SPEC 08, SPEC 09
> **Fecha:** 2026-10-31
> **Objetivo:** Hacer jugables los cuatro juegos reales (ROCAS, CAÍDA, BLOQUE BUSTER y SERPENTINA) en móviles y tablets táctiles con un mando virtual en pantalla, sin cambiar cómo se juega con teclado.

## Por qué existe esta spec

Hoy ningún juego real se puede jugar en un móvil:

- `useCanvasGame` (`components/games/use-canvas-game.tsx`) detecta `(hover: none) and (pointer: coarse)`, no crea el motor y `CanvasScreen` muestra "REQUIERE TECLADO · JUEGA DESDE UN ORDENADOR".
- Aunque se quitara ese bloqueo, los motores solo escuchan `keydown`/`keyup` en `window`, y BLOQUE BUSTER además `mousemove` en el canvas. No hay ningún listener táctil.
- El layout del player (`.av-player`, `.player-hud`, `.crt`) es responsive en ancho, pero no deja sitio para controles ni contempla un móvil en horizontal.

Cada juego tiene controles distintos:

| Juego         | Teclado hoy                                                    | Tipo de entrada                    |
| ------------- | -------------------------------------------------------------- | ---------------------------------- |
| ROCAS         | ← → giran, ↑ impulsa, Espacio dispara                          | Teclas mantenidas, varias a la vez |
| CAÍDA         | ← → mueven, ↓ baja, ↑/X rota, Espacio deja caer                | Pulsaciones con autorrepetición    |
| BLOQUE BUSTER | ← → mantenidas y ratón sobre el canvas                         | Mantenidas + puntero               |
| SERPENTINA    | W A S D (búfer de 2 giros, arranque en espera "PULSA W A S D") | Pulsaciones sueltas                |

Esta spec añade una entrada abstracta (`input(action, pressed)`) al contrato de los motores, un mando virtual compartido (`TouchPad`) que se configura por juego y un layout de player para móvil en vertical y horizontal.

## Alcance

**Entra:**

- **Acciones abstractas** en `lib/games/input.ts`: `up`, `down`, `left`, `right`, `a`, `b`. Son la única forma en que el mando habla con los motores.
- **Contrato del motor ampliado:** los cuatro motores exponen `input(action, pressed)`. Internamente, cada motor traduce la acción a su código de tecla (`ArrowLeft`, `Space`, `KeyW`…) y pasa por la misma función que el teclado, así que las reglas (búfer de giros, disparo por pulsación, `clearKeys` al pausar, ignorar en pausa y en gameover) son idénticas con teclado y con el dedo. No se simulan `KeyboardEvent`.
- **Mapeo por juego:**

  | Juego         | Cruceta                 | Botón A           | Botón B          | Autorrepetición      |
  | ------------- | ----------------------- | ----------------- | ---------------- | -------------------- |
  | ROCAS         | ← (girar) ↑ (impulso) → | FUEGO (`Space`)   | —                | No (se mantiene)     |
  | CAÍDA         | ← ↓ →                   | ROTAR (`ArrowUp`) | SOLTAR (`Space`) | ← ↓ →: 170 ms, 50 ms |
  | BLOQUE BUSTER | ← →                     | —                 | —                | No (se mantiene)     |
  | SERPENTINA    | ↑ ← ↓ → (`KeyW/A/S/D`)  | —                 | —                | No                   |

- **BLOQUE BUSTER con el dedo:** además de la cruceta, arrastrar el dedo sobre el canvas centra la paleta en él, igual que el ratón. `mousemove` se sustituye por `pointerdown` + `pointermove` (cubren ratón y táctil) con la misma escala `W / rect.width`. El motor pone `canvas.style.touchAction = "none"` al crearse y lo quita en `destroy`.
- **SERPENTINA:** el aviso de arranque dice "PULSA W A S D" con teclado y "TOCA UNA FLECHA" en táctil. El motor lo decide una vez al crearse con `matchMedia("(pointer: coarse)")`.
- **Componente `TouchPad`** (`components/games/touch-pad.tsx`, cliente):
  - Recibe un `TouchLayout` (qué flechas y botones hay, etiquetas y autorrepetición), `onInput(action, pressed)` y `disabled`.
  - Una cruceta a la izquierda y los botones de acción a la derecha. Las flechas que el juego no usa no se pintan.
  - Pointer Events por botón: `pointerdown` → `setPointerCapture` + `onInput(a, true)`; `pointerup`, `pointercancel` y `lostpointercapture` → `onInput(a, false)`. Varios dedos a la vez funcionan (girar + impulsar + disparar en ROCAS) porque cada botón sigue su propio puntero.
  - Autorrepetición solo en las acciones de `repeat`: tras 170 ms mantenidas, reenvía `onInput(a, true)` cada 50 ms hasta soltar.
  - Con `disabled` (pausa o fin de partida) suelta todo lo pulsado, cancela las autorrepeticiones e ignora toques. Al desmontarse, lo mismo.
  - `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none` y `contextmenu` bloqueado en el mando: tocarlo no hace scroll, zoom, selección ni menú de pulsación larga.
  - Botones de al menos 56×56 px, con `aria-label` en español ("Izquierda", "Fuego"…), estado pulsado visible (glow) y diseño con `/frontend-design`.
- **Hook `useCanvasGame`:**
  - El motor se crea siempre, también en táctil. Desaparece el bloqueo y el aviso "REQUIERE TECLADO".
  - `noKeyboard` se sustituye por `touch`: `(pointer: coarse)` con `useSyncExternalStore` y snapshot de servidor `false` (el mando aparece tras la hidratación, sin mismatch).
  - Expone `input(action, pressed)`, que llama a `engineRef.current?.input`.
  - El teclado sigue funcionando siempre, también en una tablet con teclado.
- **`CanvasScreen`** pierde la prop `noKeyboard` y solo pinta el `<canvas>`.
- **`GameShell`:** nueva prop opcional `controls?: ReactNode`, que se pinta justo debajo del `.crt`. La partida simulada no la pasa y se ve igual que hoy.
- **Componentes de juego** (`asteroids-game.tsx`, `tetris-game.tsx`, `arkanoid-game.tsx`, `snake-game.tsx`): definen su `TouchLayout` como constante de módulo y pasan `controls={touch && <TouchPad … />}`.
- **Layout del player en táctil** (`app/globals.css`, diseñado con `/frontend-design`):
  - **Vertical:** HUD compacto, selector de skin, CRT a todo el ancho y el mando debajo. En 390×844 caben HUD, CRT y mando sin scroll una vez la página está desplazada hasta el HUD.
  - **Horizontal** (`(pointer: coarse) and (orientation: landscape)`): cruceta a la izquierda del CRT y botones a la derecha. El ancho del CRT se limita por la altura (`dvh`) para que la pantalla entera quepa en vertical. `.crt-bottom` se oculta y el padding del `.crt` se reduce.
  - Sin bloquear la orientación y sin pantalla completa.
- **Documentación del contrato:** `.claude/skills/add-game/integracion.md`, `.claude/skills/add-game/SKILL.md`, `.claude/skills/add-game/template.md`, `.claude/agents/game-jam.md` y `CLAUDE.md` pasan de "REQUIERE TECLADO" a "`input(action, pressed)` + `TouchLayout` obligatorios". Así los juegos nuevos nacen jugables en el móvil.

**Fuera de alcance (specs futuras):**

- Gestos (deslizar, tocar el canvas) en ROCAS, CAÍDA y SERPENTINA.
- Pantalla completa (Fullscreen API), bloqueo de orientación o PWA instalable.
- Vibración (`navigator.vibrate`) y sonido.
- Configurar el mando (tamaño, posición, mano izquierda) o mostrarlo y ocultarlo a mano.
- Soporte de mandos físicos (Gamepad API).
- Cambiar las reglas, la velocidad o la dificultad de los juegos para el móvil.
- Las partidas simuladas (`app/games/[id]/play/page.tsx` y `GamePlayer`).
- Revisar el responsive de las demás páginas (home, biblioteca, ficha, salón, login, about).
- Los juegos del game jam en Draft (`specs/game-jam/vaiven/`): cuando se aprueben, ya nacerán con el contrato nuevo.

## Modelo de datos

No cambia el esquema de Supabase ni hay migraciones. Lo nuevo son tipos de TypeScript y un método más en los motores.

### Acciones (`lib/games/input.ts`)

```ts
export type Dir = "up" | "down" | "left" | "right";
export type GameAction = Dir | "a" | "b";

export type TouchLayout = {
  dpad: Dir[]; // flechas que se pintan; las demás no aparecen
  buttons: { action: "a" | "b"; label: string }[]; // de 0 a 2, A a la derecha
  repeat?: GameAction[]; // autorrepetición al mantener (170 ms de espera, 50 ms entre repeticiones)
};

export const DIR_LABELS: Record<Dir, string> = {
  up: "Arriba",
  down: "Abajo",
  left: "Izquierda",
  right: "Derecha",
};
export const REPEAT_DELAY = 170;
export const REPEAT_INTERVAL = 50;
```

### Contrato del motor

```ts
export type CanvasEngine = {
  pause: () => void;
  resume: () => void;
  restart: () => void;
  end: () => void;
  destroy: () => void;
  setSkin: (id: SkinId) => void;
  input: (action: GameAction, pressed: boolean) => void; // nuevo: mando virtual
};
```

Cada motor añade un mapa de acción a tecla y una función interna que comparten teclado y mando:

| Motor       | Mapa `GameAction → code`                                                                 | Función compartida                                                                   |
| ----------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `asteroids` | `left → ArrowLeft`, `right → ArrowRight`, `up → ArrowUp`, `a → Space`                    | `press(code)` / `release(code)`: `keys` y `justPressed`, como en `onKeyDown/onKeyUp` |
| `tetris`    | `left → ArrowLeft`, `right → ArrowRight`, `down → ArrowDown`, `a → ArrowUp`, `b → Space` | `act(code)`: el `switch` de `onKeyDown`. `pressed = false` no hace nada              |
| `arkanoid`  | `left → ArrowLeft`, `right → ArrowRight`                                                 | `setKey(code, pressed)`                                                              |
| `snake`     | `up → KeyW`, `left → KeyA`, `down → KeyS`, `right → KeyD`                                | `turn(dir)`: la lógica de `ready` y del búfer. `pressed = false` no hace nada        |

- `input` respeta las mismas guardas que el teclado: ignora en pausa, en carga y en gameover, y tras `destroy`.
- Las acciones que un juego no usa se ignoran sin error.
- Los listeners de teclado no cambian de comportamiento: solo pasan a llamar a la función compartida.

### Hook (`components/games/use-canvas-game.tsx`)

```ts
const TOUCH_QUERY = "(pointer: coarse)";

// Devuelve, además de lo actual:
{
  touch: boolean, // sustituye a noKeyboard
  input: (action: GameAction, pressed: boolean) => void,
}
```

### Componentes

```tsx
// components/games/touch-pad.tsx
export function TouchPad(props: {
  layout: TouchLayout;
  onInput: (action: GameAction, pressed: boolean) => void;
  disabled: boolean; // paused || over
}): JSX.Element;

// components/games/game-shell.tsx: prop nueva
controls?: ReactNode; // se pinta bajo .crt; sin ella el shell es igual que hoy

// components/games/use-canvas-game.tsx
export function CanvasScreen(props: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  label: string;
}): JSX.Element; // sin noKeyboard
```

Layouts por juego (constantes de módulo en cada componente):

```ts
// asteroids-game.tsx
const TOUCH: TouchLayout = {
  dpad: ["left", "up", "right"],
  buttons: [{ action: "a", label: "FUEGO" }],
};
// tetris-game.tsx
const TOUCH: TouchLayout = {
  dpad: ["left", "down", "right"],
  buttons: [
    { action: "b", label: "SOLTAR" },
    { action: "a", label: "ROTAR" },
  ],
  repeat: ["left", "right", "down"],
};
// arkanoid-game.tsx
const TOUCH: TouchLayout = { dpad: ["left", "right"], buttons: [] };
// snake-game.tsx
const TOUCH: TouchLayout = {
  dpad: ["up", "left", "down", "right"],
  buttons: [],
};
```

### CSS (`app/globals.css`)

Clases nuevas: `.touch-pad`, `.touch-dpad`, `.touch-actions`, `.touch-btn` (con `[data-pressed="true"]`) y `.touch-btn.action`. Media queries nuevas para `(pointer: coarse)` en vertical y `(pointer: coarse) and (orientation: landscape)`. Colores con los tokens existentes (`--cyan`, `--magenta`, `--yellow`, `--bg-2`, `--line`); los valores exactos los fija `/frontend-design`.

### Estructura final

```
lib/games/input.ts                          (nuevo)
components/games/touch-pad.tsx              (nuevo)
components/games/use-canvas-game.tsx        (modificado: touch, input, sin REQUIERE TECLADO)
components/games/game-shell.tsx             (modificado: prop controls)
components/games/asteroids-game.tsx         (modificado: TouchLayout + controls)
components/games/tetris-game.tsx            (modificado)
components/games/arkanoid-game.tsx          (modificado)
components/games/snake-game.tsx             (modificado)
lib/games/asteroids/engine.ts               (modificado: input)
lib/games/tetris/engine.ts                  (modificado: input)
lib/games/arkanoid/engine.ts                (modificado: input, pointer events, touchAction)
lib/games/snake/engine.ts                   (modificado: input, aviso según puntero)
lib/games/snake/constants.ts                (modificado: textos del aviso)
app/globals.css                             (modificado: mando y layout táctil)
.claude/skills/add-game/integracion.md      (modificado)
.claude/skills/add-game/SKILL.md            (modificado)
.claude/skills/add-game/template.md         (modificado)
.claude/agents/game-jam.md                  (modificado)
CLAUDE.md                                   (modificado)
```

## Plan de implementación

1. **Acciones y mando sin conectar.**
   - Crear `lib/games/input.ts` con `Dir`, `GameAction`, `TouchLayout`, `DIR_LABELS`, `REPEAT_DELAY` y `REPEAT_INTERVAL`.
   - Crear `components/games/touch-pad.tsx` con Pointer Events, captura por botón, autorrepetición, `disabled` y limpieza al desmontar.
   - Diseñar con `/frontend-design` las clases `.touch-*` en `app/globals.css` (cruceta, botones de acción, estado pulsado con glow).
   - Todavía no lo usa nadie. Resultado: `npm run build` y `npm run lint` pasan.
2. **`input` en los cuatro motores.**
   - Extraer en cada motor la función compartida de la tabla del modelo de datos y hacer que los listeners de teclado la llamen.
   - Añadir `input(action, pressed)` a la API de cada motor y a `CanvasEngine`.
   - BLOQUE BUSTER: `mousemove` → `pointerdown` + `pointermove`, y `touchAction = "none"` en el canvas (quitado en `destroy`).
   - SERPENTINA: aviso "PULSA W A S D" o "TOCA UNA FLECHA" según `(pointer: coarse)` al crearse.
   - Resultado: con teclado y ratón los cuatro juegos se comportan exactamente igual que antes.
3. **Conectar el mando.**
   - `useCanvasGame`: quitar el bloqueo, cambiar `noKeyboard` por `touch` y exponer `input`.
   - `CanvasScreen`: quitar el aviso y la prop `noKeyboard`.
   - `GameShell`: prop opcional `controls` bajo el `.crt`.
   - Los cuatro componentes de juego: constante `TOUCH` y `controls={touch && <TouchPad layout={TOUCH} onInput={input} disabled={paused || over} />}`.
   - Resultado: los cuatro juegos se juegan en un móvil en vertical.
4. **Layout táctil vertical y horizontal.**
   - Con `/frontend-design`: HUD compacto en táctil, CRT + mando en vertical, cruceta | CRT | botones en horizontal con el ancho del CRT limitado por `dvh`, `.crt-bottom` oculto en horizontal.
   - Resultado: en 390×844 y en 844×390 el CRT y el mando caben enteros en pantalla.
5. **Documentación del contrato.**
   - Actualizar `integracion.md` (sección 2: `input` obligatorio con mapa a la función compartida; sección 3: `TouchLayout` + `controls`, sin "REQUIERE TECLADO"; sección 6: verificación táctil nueva).
   - Actualizar `add-game/SKILL.md`, `add-game/template.md`, `agents/game-jam.md` y `CLAUDE.md` en el mismo sentido.
6. **Verificación final.**
   - `npm run build` y `npm run lint`.
   - Recorrer los criterios con el MCP de Playwright: escritorio normal y un contexto móvil con `hasTouch`/`isMobile` (iPhone 13 en vertical y en horizontal) creado con `browser_run_code_unsafe`.
   - Prueba manual del usuario en un móvil real: `npm run build && npx next start -H 0.0.0.0` y abrir `http://<IP-del-PC>:3000/games/<id>/play` desde la misma red.
7. **Ampliación (2026-10-31): player a pantalla completa en táctil.**
   - En la pantalla de un juego real con mando (`body:has(.touch-pad)` en `(pointer: coarse)`), la barra de navegación (`.av-nav`) y su panel móvil (`.av-mobile-panel`) se ocultan del todo (`display: none`). En escritorio y en las demás páginas no cambia nada. En horizontal, `--nav-h` pasa a `0px`.
   - Separación entre el CRT y el mando en vertical: `margin-top` del `.touch-pad` de 16 px a 32 px. En horizontal no cambia (el mando va a los lados).
   - Botón **REGRESAR** en `GameShell`, como cuarto botón de la fila PAUSA · FIN · SALIR, solo cuando hay mando (`controls`). Vuelve a la página anterior (`router.back()`) y, si no hay historial (`history.length <= 1`), va a `/games`. En escritorio no aparece.
   - Resultado: en táctil el player ocupa la pantalla sin barra de navegación, y se puede volver atrás con REGRESAR.

## Criterios de aceptación

**Escritorio (sin regresiones):**

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `app/games/[id]/play/page.tsx` no aparece en `git diff`, y `/games/gloton/play` (simulado) se ve igual que antes, sin mando.
- [ ] En escritorio (`pointer: fine`) no se pinta `.touch-pad` en ninguno de los cuatro juegos.
- [ ] ROCAS, CAÍDA, BLOQUE BUSTER y SERPENTINA se juegan con teclado igual que antes: mismas teclas, sin scroll con las teclas de juego, `P`/`Escape` pausan, no quedan teclas pegadas al reanudar.
- [ ] En BLOQUE BUSTER el ratón sigue moviendo la paleta sin hacer clic.
- [ ] En SERPENTINA con teclado el aviso sigue siendo "PULSA W A S D".

**Móvil en vertical (contexto Playwright con `hasTouch`, 390×844):**

- [ ] En los cuatro juegos hay un `<canvas>` en `.crt-screen`, no aparece "REQUIERE TECLADO" y no hay errores en consola.
- [ ] Bajo el CRT aparece el mando con exactamente las flechas y botones de la tabla de mapeo, cada uno con su `aria-label`.
- [ ] Con la página desplazada hasta el HUD, el HUD, el CRT completo y el mando caben en el viewport sin scroll.
- [ ] ROCAS: mantener ← gira la nave; mantener ↑ y FUEGO a la vez impulsa y dispara; soltar los detiene. Cada toque de FUEGO dispara una vez.
- [ ] CAÍDA: un toque en ← mueve la pieza una columna; mantener ← la lleva hasta la pared; ROTAR rota; SOLTAR la deja caer; mantener ↓ la baja rápido.
- [ ] BLOQUE BUSTER: mantener ← o → mueve la paleta; arrastrar el dedo sobre el canvas la centra en el dedo, y la página no hace scroll mientras se arrastra.
- [ ] SERPENTINA: el aviso dice "TOCA UNA FLECHA"; tocar → arranca la serpiente; ← en espera no la arranca; dos toques rápidos (↑ y ←) en el mismo tick hacen los dos giros.
- [ ] Tocar o mantener cualquier botón del mando no hace scroll, zoom, selección de texto ni abre menú contextual.
- [ ] PAUSA congela el juego y el mando deja de responder; un botón mantenido al pausar no sigue activo al reanudar.
- [ ] Al abrir "FIN DEL JUEGO", el mando deja de responder y se pueden escribir las iniciales con el teclado del móvil; GUARDAR PUNTUACIÓN crea la fila en `scores`.
- [ ] JUGAR DE NUEVO reinicia y el mando vuelve a responder.
- [ ] Al salir de la ruta no quedan loops, listeners ni autorrepeticiones activas (sin errores en consola al seguir tocando la página).

**Móvil en horizontal (844×390):**

- [ ] La cruceta queda a la izquierda del CRT y los botones a la derecha (en BLOQUE BUSTER y SERPENTINA, sin botones, solo la cruceta).
- [ ] El CRT completo cabe en la altura del viewport y mantiene el 4:3.
- [ ] Girar el dispositivo durante la partida no reinicia el motor ni pierde la puntuación.

**Ampliación (paso 7):**

- [ ] En táctil, `/games/<id>/play` de los cuatro juegos no muestra la barra de navegación ni deja hueco arriba. En escritorio, en `/games/gloton/play` y en el resto de páginas la barra sigue igual.
- [ ] En vertical hay 32 px entre el borde inferior del CRT y el panel del mando, y HUD, CRT y mando siguen cabiendo en 390×844 sin scroll.
- [ ] En horizontal (844×390) la página no se reduce: el ancho del documento es el del viewport.
- [ ] En táctil, la fila del HUD muestra PAUSA · FIN · SALIR · REGRESAR en una línea; en escritorio no aparece REGRESAR.
- [ ] REGRESAR vuelve a la página desde la que se entró al juego (por ejemplo, la ficha o la biblioteca); abierto el juego directamente en una pestaña nueva, lleva a `/games`.

**Documentación:**

- [ ] `rg "REQUIERE TECLADO" -g "!specs/**"` no devuelve resultados.
- [ ] `integracion.md` describe `input(action, pressed)`, `TouchLayout`, la prop `controls` y la verificación táctil.

**Prueba real:**

- [ ] El usuario juega una partida de cada juego en un móvil real y la puede guardar.

## Decisiones

- **Definición rápida:** tras el primer bloque de preguntas, el usuario pidió "arreglarlo todo y crear el plan". Se tomaron todas las recomendaciones del Bloque A sin más rondas de preguntas.
- **Sí:** los cuatro juegos en una sola spec, porque la infraestructura es compartida y cada motor solo necesita un mapa de acciones. **No:** un juego piloto y otra spec para el resto. Tomado de las recomendaciones.
- **Sí:** mando virtual con botones en HTML, común para los cuatro juegos. **No:** gestos sobre el canvas, que serían distintos en cada juego y más difíciles de verificar. **Excepción:** arrastrar la paleta en BLOQUE BUSTER, porque replica el control de ratón que ya existe. Tomado de las recomendaciones.
- **Sí:** método `input(action, pressed)` en el contrato del motor, con una función interna compartida con el teclado. **No:** disparar `KeyboardEvent` sintéticos en `window`, que dependen de `isTrusted`, del foco y de `e.code` y son frágiles. Tomado de las recomendaciones.
- **Sí:** acciones abstractas (`up/down/left/right/a/b`), no códigos de tecla, para que el mando no sepa nada de cada juego.
- **Sí:** autorrepetición en el mando (solo CAÍDA), porque en teclado la da el sistema operativo y en un botón táctil no existe. 170 ms y 50 ms, valores habituales de DAS/ARR.
- **Sí:** quitar "REQUIERE TECLADO" y detectar táctil con `(pointer: coarse)`, mostrando el mando y manteniendo el teclado. **No:** `(hover: none) and (pointer: coarse)`, que no cambia nada útil aquí. **No:** botón para mostrar u ocultar el mando. Tomado de las recomendaciones.
- **Sí:** vertical y horizontal, sin bloquear la orientación ni forzar pantalla completa. Tomado de las recomendaciones.
- **Sí:** `controls` como prop opcional de `GameShell` (un hueco), no lógica táctil dentro del shell. La partida simulada no cambia.
- **Sí:** un `TouchLayout` por juego como constante de módulo en su componente, no dentro del motor: el motor no conoce el DOM del mando.
- **Sí:** Pointer Events con captura por botón. **No:** `touchstart`/`touchend`, que obligan a duplicar el código para ratón. Deslizar el dedo de una flecha a otra no cambia de flecha: se acepta por simplicidad.
- **Sí:** SERPENTINA lee `(pointer: coarse)` una vez al crearse para el texto del aviso. Es la única excepción a "el motor no mira el entorno", y solo afecta a un texto.
- **Sí:** actualizar ya `integracion.md`, `/add-game` y `game-jam` para que los juegos nuevos nazcan con controles táctiles.
- **Sí:** prueba en móvil real con `next start` (build de producción) en la red local, que no necesita tocar `next.config.ts`.
- **Ampliación (paso 7), pedida por el usuario tras la verificación, con las recomendaciones aceptadas ("OK a todo"):**
  - **Sí:** añadirla a esta spec y a esta rama. **No:** una spec 11, porque es el mismo layout táctil del player.
  - **Sí:** ocultar la barra de navegación solo en el player de un juego real con mando. **No:** ocultarla en escritorio o en otras páginas. De paso desaparece el desbordamiento de la barra a 844 px que hacía que el móvil redujera la página.
  - **Sí:** 16 px más de separación entre CRT y mando en vertical (32 px en total).
  - **Sí:** REGRESAR como cuarto botón del HUD, con `router.back()` y `/games` si no hay historial. **No:** en la fila de skins. **No:** renombrar SALIR, que sigue llevando a la ficha del juego.
  - **Sí:** REGRESAR solo en táctil, porque sustituye a la barra de navegación oculta; en escritorio la barra sigue ahí. Decidido al implementar (la pregunta quedó sin respuesta explícita).

## Riesgos

| Riesgo                                                                                       | Mitigación                                                                                                                                                   |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Un botón queda "pegado" si se pierde el `pointerup` (notificación, gesto del sistema, girar) | `pointercancel` y `lostpointercapture` sueltan la acción; `disabled` y el desmontaje sueltan todo; los motores ya limpian las teclas al pausar.              |
| Scroll, zoom por doble toque o menú de pulsación larga al jugar                              | `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none` y `contextmenu` bloqueado en el mando; `touchAction` en el canvas de BLOQUE BUSTER. |
| Regresión del teclado al extraer la función compartida                                       | Paso 2 deja el teclado idéntico y se verifica antes de conectar el mando; criterios de escritorio específicos.                                               |
| En horizontal el CRT no cabe con el HUD y la barra de navegación del sitio                   | Ancho del CRT limitado por `dvh`, `.crt-bottom` oculto y padding reducido; criterio con 844×390.                                                             |
| Portátiles con pantalla táctil o tablets con ratón: `(pointer: coarse)` se equivoca          | El teclado y el ratón siguen funcionando siempre; en el peor caso sobra o falta el mando, nunca se bloquea el juego.                                         |
| Playwright no reproduce bien los toques multitáctiles                                        | Multitáctil (ROCAS) en la prueba manual en móvil real; Playwright cubre un toque cada vez con `dispatchEvent` de Pointer Events.                             |
| La autorrepetición sigue tras soltar o al desmontar                                          | Los temporizadores viven en el `TouchPad` y se cancelan al soltar, con `disabled` y en la limpieza del efecto.                                               |
| ROCAS y CAÍDA son difíciles con botones (no hay respuesta táctil física)                     | Se acepta en esta spec. Ajustes de tamaño, vibración o gestos van en specs futuras.                                                                          |

## Lo que **no** entra en esta spec

- Gestos en ROCAS, CAÍDA y SERPENTINA.
- Pantalla completa, bloqueo de orientación y PWA.
- Vibración y sonido.
- Configurar o esconder el mando.
- Gamepad API.
- Cambios de reglas o dificultad para el móvil.
- Partidas simuladas y responsive de las demás páginas.
- Specs del game jam en Draft.

Cada una de estas cosas, si llega, irá en su propia spec.

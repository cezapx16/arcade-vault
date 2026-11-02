# SPEC 13 — Rendimiento del canvas de VAIVÉN

> **Estado:** implementado
> **Depende de:** SPEC 12 (y SPEC 05, 07, 08, 09 por el límite de `devicePixelRatio`)
> **Fecha:** 2026-11-02
> **Objetivo:** Que VAIVÉN vaya a 60 FPS estables sin cambiar su aspecto en ningún skin, cacheando el tablero y el glow, y que los cinco juegos reales limiten el `devicePixelRatio` a 2.

## Por qué existe esta spec

VAIVÉN (`lib/games/hopper/`) da FPS bajos y tirones durante la partida. Al leer el motor se ven estas causas probables, que se confirman midiendo en el paso 1:

- **Glow en cada frame.** En neón se dibuja con `shadowBlur` en cada frame:
  - 3 franjas de 800 px en las orillas y la mediana (`drawBoard`), que nunca cambian.
  - El contorno y los dos faros de cada vehículo (`drawLane`).
  - Las partículas al morir.
  - El saltador, el texto ROZÓN y las barras de estado.
- **Degradados nuevos.** Cada vehículo crea un `createLinearGradient` para el haz del faro en cada frame.
- **Tablero estático repintado.** El fondo de los carriles, las líneas discontinuas y las zonas seguras se repintan en cada frame.
- **Búfer sin límite.** `canvas.width = 800 × devicePixelRatio`. En un móvil con dpr 3 el búfer es de 2400×1800 (4,3 Mpx) y todo el `shadowBlur` se calcula a esa resolución. Pasa en los cinco motores.
- **Arrays por frame.** `particles.filter` y `rozonFx.filter` crean arrays nuevos en cada frame (efecto menor: basura para el GC).

## Alcance

**Entra:**

- **Medición antes y después** con el MCP de Playwright, sin código nuevo en la app. Los números se anotan en la sección [Mediciones](#mediciones) de esta spec.
- **Límite de `devicePixelRatio` a 2** en los cinco motores reales (`asteroids`, `tetris`, `arkanoid`, `snake`, `hopper`), con un helper común.
- **Tablero de VAIVÉN en caché:** el fondo de los carriles, las líneas discontinuas y las zonas seguras con su glow se pintan una vez en un canvas fuera de pantalla y se copian con `drawImage` en cada frame. Se regenera al cambiar de skin.
- **Sprites con el glow ya horneado** en VAIVÉN, para cada vehículo (con su haz y sus faros), cada paquete y una partícula. El frame solo hace `drawImage`, sin `shadowBlur` ni `createLinearGradient`. Se regeneran al cambiar de skin.
- **Sin arrays nuevos por frame** en VAIVÉN: las partículas y los ROZÓN caducados se compactan en el mismo array.
- **El mismo aspecto** en los cuatro skins (`clasico`, `neon`, `retro`, `pastel`): el glow del sprite se hornea con los mismos valores de `shadowBlur` y en la misma escala que hoy.

**Fuera de alcance (para otras specs):**

- Optimizar a fondo ROCAS, CAÍDA, BLOQUE BUSTER y SERPENTINA (cachés y sprites). Aquí solo reciben el límite de dpr. Su auditoría irá en otra spec, partiendo de las mediciones y la técnica de esta.
- Animaciones CSS de la home, la biblioteca o la ficha (`gridscroll`, `flicker`, `float`…) y la tarjeta del juego en la biblioteca.
- Un contador de FPS dentro de la app (`?fps=1` o similar).
- Un modo "rendimiento" que recorte el glow en móvil.
- Cambiar reglas, velocidades, tiempos o colores de VAIVÉN.
- Cambiar `useCanvasGame`, `GameShell`, `TouchPad` o el contrato de `integracion.md`. Los re-renders de React (HUD en estado, callbacks inestables) van en la SPEC 14.
- Mover el render a `OffscreenCanvas` en un Worker o a WebGL.

## Modelo de datos

No hay datos persistentes nuevos: ni tablas, ni `localStorage`. Aparecen dos módulos de código.

### Helper de dpr (`lib/games/dpr.ts`)

```ts
export const MAX_DPR = 2;
// devicePixelRatio limitado: el búfer nunca pasa de 1600×1200.
export const pixelRatio = () => Math.min(window.devicePixelRatio || 1, MAX_DPR);
```

Los cinco motores sustituyen `const dpr = window.devicePixelRatio || 1` por `const dpr = pixelRatio()`. El `glow()` de ROCAS, CAÍDA y BLOQUE BUSTER escala el blur con la matriz del contexto, así que sigue siendo coherente.

### Caché de render de VAIVÉN (`lib/games/hopper/render-cache.ts`)

```ts
// Imagen pre-renderizada a resolución física; se dibuja en px lógicos.
// Recuadro ajustado: solo lo que se pinta (cuerpo, haz del faro y glow), sin margen vacío.
export type Sprite = {
  canvas: HTMLCanvasElement; // w × dpr por h × dpr
  ox: number; // esquina del recuadro respecto al origen de la entidad
  oy: number; // (x del vehículo/paquete e y de su fila, o centro de la partícula)
  w: number; // ancho lógico del recuadro, glow y haz incluidos
  h: number; // alto lógico del recuadro, glow incluido
  pad: number; // margen lógico del glow incluido en el recuadro
};
export type RenderCache = {
  dpr: number;
  board: HTMLCanvasElement; // 800×560 lógicos: carriles, líneas y zonas seguras con glow
  vehicles: Map<string, Sprite>; // clave `${vehicle}:${len}:${dir}`
  packets: Map<number, Sprite>; // clave: len
  particle: Sprite; // cuadrado de 6×6 con su glow
};
export function createRenderCache(
  skin: Skin,
  lanes: Lane[],
  dpr: number,
): RenderCache;
```

Convenciones:

- Cada canvas de la caché se crea con `document.createElement("canvas")`, a `tamaño lógico × dpr`, y se dibuja con `setTransform(dpr, 0, 0, dpr, 0, 0)` y los mismos valores de `shadowBlur` que hoy. Así el glow horneado es igual que el actual, que tampoco escala el blur por dpr.
- Un sprite se dibuja con `blit(ctx, cache, s, x, y)`, que hace `ctx.drawImage(s.canvas, x + s.ox, y + s.oy, s.w, s.h)` con la esquina ajustada a la rejilla de píxeles físicos, para copiar 1:1 sin remuestrear. En el volteo funciona igual bajo la transformación `scale(cos(πt), 1)`.
- El recuadro es ajustado (paso 4): el haz solo ocupa margen por delante del vehículo y el glow `pad = ⌈1,5 · shadowBlur⌉ + 2` px alrededor. Un coche de 60×28 en neón queda en ~150×66 px en lugar de 192×160 con un `pad` simétrico de 66.
- La clave del vehículo lleva `dir` porque el haz y los faros van en el frente. Tras el volteo se usa el sprite del sentido contrario. Las combinaciones salen de `LANES` × 2 sentidos y se crean todas al construir la caché, no en mitad de un frame.
- Las rayas de flujo del río se mueven con los paquetes. Siguen pintándose en cada frame encima del tablero cacheado, con `fillRect` y sin glow.
- El saltador, el texto ROZÓN y la franja de estado conservan su `shadowBlur`: son pocos dibujos por frame, y el saltador cambia de forma al saltar.
- `setSkin(id)` reconstruye la caché antes del siguiente frame (y repinta si está en pausa, como hoy).

### Estructura final

```
lib/games/dpr.ts                       (nuevo: MAX_DPR y pixelRatio)
lib/games/hopper/render-cache.ts       (nuevo: tablero y sprites)
lib/games/hopper/entities.ts           (modificado: drawBoard/drawLane/drawParticles usan la caché)
lib/games/hopper/engine.ts             (modificado: crea y regenera la caché, compacta arrays, pixelRatio)
lib/games/asteroids/engine.ts          (modificado: pixelRatio)
lib/games/tetris/engine.ts             (modificado: pixelRatio)
lib/games/arkanoid/engine.ts           (modificado: pixelRatio)
lib/games/snake/engine.ts              (modificado: pixelRatio)
specs/13-rendimiento-vaiven.md         (modificado: tabla de mediciones)
specs/13-rendimiento-vaiven/           (nuevo: capturas antes/después por skin)
```

## Mediciones

### Método

Se mide con el MCP de Playwright (`browser_run_code_unsafe`) en `/games/vaiven/play`, a 1280×800:

- **Muestra:** se registran 600 deltas consecutivos de `requestAnimationFrame` en la página (unos 10 s). Se calculan la media de FPS, el p95 del frame en ms y el número de frames de más de 33 ms.
- **Ralentización:** la CPU se ralentiza ×4 con CDP (`Emulation.setCPUThrottlingRate`, `rate: 4`) en las filas marcadas "CPU ×4".
- **Skin:** `neon`, el más caro, fijado con `localStorage` `av_skin_vaiven = "neon"` antes de cargar.
- **Escenario A, espera:** la fase `ready`, con todos los carriles en movimiento y sin tocar nada.
- **Escenario B, partida:** se pulsa ↑ cada 300 ms durante la muestra. Hay saltos, rozones, muertes con partículas y algún volteo.
- **Viaje:** el coste de dibujo no depende del viaje, porque el número de entidades es fijo y solo cambia su velocidad. Por eso no hace falta llegar al viaje 5.
- **Límite de dpr:** se comprueba en un contexto nuevo con `deviceScaleFactor: 3`, `isMobile` y `hasTouch` a 390×844.

### Resultados

Se rellena en el paso 1 (antes) y en el último paso (después).

| Escenario         | Antes: FPS medios | Antes: p95 ms | Antes: frames > 33 ms | Después: FPS medios | Después: p95 ms | Después: frames > 33 ms |
| ----------------- | ----------------- | ------------- | --------------------- | ------------------- | --------------- | ----------------------- |
| A espera          | 59,9              | 16,8          | 0                     | 59,9                | 16,8            | 0                       |
| B partida         | 59,9              | 16,8          | 0                     | 59,8                | 16,8            | 1                       |
| A espera, CPU ×4  | 59,9              | 16,8          | 0                     | 59,9                | 16,8            | 0                       |
| B partida, CPU ×4 | 59,6              | 16,8          | 1                     | 59,6                | 16,8            | 1                       |

Coste del callback de `requestAnimationFrame` (`update` + `draw`), medido envolviendo `requestAnimationFrame` desde un `addInitScript`, escenario B, skin neón:

| dpr (canvas)  | CPU | Antes: FPS | Antes: frames > 33 ms (de 400) | Antes: callback mediana / p95 ms | Después: FPS | Después: frames > 33 ms | Después: callback mediana / p95 ms |
| ------------- | --- | ---------- | ------------------------------ | -------------------------------- | ------------ | ----------------------- | ---------------------------------- |
| 1 (800×600)   | ×1  | 59,8       | 1                              | 0,4 / 0,7                        | 59,9         | 0                       | 0,3 / 1,7                          |
| 1 (800×600)   | ×4  | 59,9       | 0                              | 0,7 / 2,5                        | 59,9         | 0                       | 0,4 / 2,5                          |
| 2 (1600×1200) | ×4  | 59,9       | 0                              | 0,5 / 2,7                        | 59,9         | 0                       | 0,4 / 1,9                          |
| 3 (2400×1800) | ×4  | 59,9       | 0                              | 0,6 / 2,5                        | 59,6         | 2                       | 0,3 / 2,0                          |
| 3 (2400×1800) | ×6  | 59,1       | 6                              | 0,5 / 4,3                        | 59,8         | 1                       | 0,3 / 2,8                          |

Con el límite del paso 2, en las filas de dpr 3 el canvas "después" mide 1600×1200.

#### Notas de la medición final (paso 6, 2026-11-02)

Mismo entorno y método que la base.

- **Umbrales cumplidos:** A y B sin ralentizar a 59,8–59,9 FPS con p95 de 16,8 ms (≥ 58 y ≤ 20). Con CPU ×4, 59,6–59,9 FPS (≥ 50).
- **Frames > 33 ms:** "B partida" pasa de 0 a 1, y dpr 3 con CPU ×4 de 0 a 2, mientras que dpr 3 con CPU ×6 baja de 6 a 1. Son frames sueltos de 33–67 ms (un vsync perdido). Al repetir B tres veces salen 2, 0 y 0 frames lentos sin ralentizar, y 1, 1 y 3 con CPU ×4: es ruido de la medición de una sola muestra, no una tendencia.
- **Coste del frame en el hilo principal:** la mediana baja de 0,4–0,7 ms a 0,3–0,4 ms y el p95 en el peor caso (dpr 3, CPU ×6) de 4,3 a 2,8 ms. El ahorro de GPU (sin `shadowBlur` ni degradados en vehículos, paquetes, partículas y tablero) no se mide aquí.
- **Capturas:** `despues-<skin>.png` y `despues-<skin>-partida.png`, mismas escenas que las de "antes". Coinciden lado a lado en colores, glow, haces, faros, bytes de los paquetes, bordes de las zonas seguras y partículas.

#### Notas de la medición base (paso 1, 2026-11-02)

- **Entorno:** Chrome headless (`channel: "chrome"`) lanzado desde el MCP de Playwright, con la GPU del equipo (ANGLE, AMD Radeon Vega 8, D3D11), contra `npm run dev`.
- **Headless, no ventana visible:** la ventana visible del MCP baja a ~1 FPS cuando queda tapada por otra ventana, en cualquier página (también `/about`). Es el estrangulamiento de `requestAnimationFrame` de Chrome en ventanas ocultas, no el juego. Headless no lo sufre.
- **El síntoma no se reproduce en este entorno:** los umbrales de aceptación ya se cumplen antes de los cambios. El usuario lo nota en Chrome de escritorio en este PC. Se decide seguir con el plan igualmente: los pasos 2–5 reducen el trabajo de la GPU (que esta medición, centrada en el hilo principal, apenas ve) y no cambian el aspecto. Las columnas "Después" deben no empeorar.
- **Capturas:** dos por skin, la fase `ready` (`antes-<skin>.png`) y la partida tras tres saltos (`antes-<skin>-partida.png`), del elemento canvas a 1280×1000 con la barra de navegación oculta.

## Plan de implementación

1. **Medición base y capturas de referencia.**
   - Sin tocar código: medir los cuatro escenarios con el método de [Mediciones](#mediciones) y anotar la columna "Antes".
   - Guardar una captura del canvas en la fase `ready`, y otra en partida con algún vehículo con haz visible, para cada skin en `specs/13-rendimiento-vaiven/antes-<skin>.png`.
   - Resultado: hay una línea base con números y una referencia visual.
2. **Límite de dpr en los cinco motores.**
   - Crear `lib/games/dpr.ts` y usar `pixelRatio()` en los cinco `engine.ts`.
   - Resultado: con `deviceScaleFactor: 3`, el canvas de cada juego real mide 1600×1200. Con dpr 1 o 2 no cambia nada.
3. **Tablero cacheado de VAIVÉN.**
   - Crear `render-cache.ts` con `board`. `drawBoard` pasa a copiar la caché y pintar solo las rayas de flujo.
   - El motor crea la caché en `createHopperGame` y la regenera en `setSkin`.
   - Resultado: se ve igual en los cuatro skins, también durante el volteo.
4. **Sprites de vehículos, paquetes y partículas.**
   - Añadir a la caché `vehicles`, `packets` y `particle`. `drawLane` y `drawParticles` dibujan con `drawImage`, sin `shadowBlur` ni `createLinearGradient`.
   - Resultado: los vehículos conservan el haz, los faros y el contorno de neón en ambos sentidos y tras el volteo. Los paquetes conservan los bytes en cristal.
5. **Sin arrays nuevos por frame.**
   - Compactar `particles` y `rozonFx` en el mismo array en `updateParticles`.
   - Resultado: las partículas y los ROZÓN se desvanecen igual que antes.
6. **Medición final y comparación.**
   - Repetir los cuatro escenarios y anotar la columna "Después".
   - Guardar `despues-<skin>.png` con las mismas escenas y compararlas lado a lado con las de "antes".
   - Ejecutar `npm run build` y `npm run lint`.

## Criterios de aceptación

**Rendimiento (tabla de [Mediciones](#mediciones) rellena):**

- [ ] La tabla tiene las columnas "Antes" y "Después" completas en los cuatro escenarios.
- [ ] Escenarios A y B sin ralentizar: media ≥ 58 FPS y p95 ≤ 20 ms.
- [ ] Escenarios A y B con CPU ×4: media ≥ 50 FPS.
- [ ] En ningún escenario hay más frames de 33 ms que antes.
- [ ] Con `deviceScaleFactor: 3`, `canvas.width === 1600` y `canvas.height === 1200` en `/games/rocas/play`, `/games/caida/play`, `/games/bloque-buster/play`, `/games/serpentina/play` y `/games/vaiven/play`.

**Código de VAIVÉN:**

- [ ] `drawLane` y `drawParticles` no asignan `shadowBlur` ni llaman a `createLinearGradient`.
- [ ] Durante el loop no se crea ningún canvas ni sprite: solo en `createHopperGame` y en `setSkin`.
- [ ] `updateParticles` no usa `filter` ni crea arrays.

**Aspecto sin cambios:**

- [ ] En cada skin, las capturas `antes-<skin>.png` y `despues-<skin>.png` muestran lado a lado los mismos colores, glow, haces, faros, bytes de los paquetes y bordes de las zonas seguras. Las posiciones de los vehículos pueden variar.
- [ ] El volteo sigue girando el tablero como una carta, y tras él los haces y los faros apuntan en el nuevo sentido.
- [ ] Cambiar de skin en mitad de la partida, o en pausa, aplica los colores al momento, sin reiniciar la partida.
- [ ] Las partículas de la muerte y el texto ROZÓN se ven y se desvanecen como antes.

**Sin regresiones:**

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] La consola del navegador no muestra errores en los cinco juegos reales.
- [ ] Los criterios de juego de la SPEC 12 siguen cumpliéndose: saltos, búfer, arrastre del río, rozón, racha, tiempo, volteo y puntuación.
- [ ] El mando táctil de VAIVÉN sigue funcionando en 390×844 y 844×390.

## Decisiones

- **VAIVÉN a fondo y los demás solo con el límite de dpr.** El síntoma está en VAIVÉN y el límite de dpr es barato y común. Optimizar los cinco juegos a fondo duplicaría el tamaño de la spec. Su auditoría irá aparte, con la técnica probada aquí.
- **Medir con Playwright y no con un contador en la app.** No añade código al producto. Los números quedan en la spec y son repetibles.
- **Escenarios sin llegar al viaje 5.** Se ajusta la propuesta inicial ("viaje 5"): el coste de dibujo no depende del viaje, y llegar al viaje 5 de forma automática no es fiable.
- **Umbrales:** ≥ 58 FPS de media y p95 ≤ 20 ms sin ralentizar; ≥ 50 FPS con CPU ×4. Se acordaron en la fase de preguntas, sin un dispositivo de referencia.
- **Glow horneado en sprites y no recortado.** El aspecto tiene que ser el mismo en los cuatro skins. Hornear el `shadowBlur` en un canvas aparte da el mismo resultado y lo calcula una sola vez.
- **No:** modo "rendimiento" que quite el glow en `pointer: coarse`. Cambia el aspecto. Si la medición final no llega a los umbrales, se decide en otra spec.
- **Límite de dpr a 2.** Por encima de 2 la diferencia no se aprecia en un canvas de 800×600 escalado por CSS, y el coste del búfer crece con el cuadrado.
- **Sprites por (vehículo, largo, sentido), todos al crear la caché.** Son pocas combinaciones. Crearlos bajo demanda en mitad de un frame provocaría tirones justo en el primer volteo.
- **Sprite con recuadro ajustado y no con `pad` simétrico** (decidido en el paso 4). Con un margen simétrico de 66 px (haz + glow) en los cuatro lados, los 18 vehículos mezclarían ~550 000 px transparentes por frame a dpr 1, más que el canvas entero. Se mantienen los campos `w`, `h` y `pad`, y se añaden `ox`/`oy` para la esquina del recuadro.
- **Rayas de flujo fuera de la caché.** Se mueven con los paquetes. Sin glow cuestan poco.
- **El saltador, el texto ROZÓN y la franja de estado conservan `shadowBlur`.** Son pocos dibujos por frame, y el rombo se estira al saltar, lo que obligaría a muchos sprites.
- **No:** `OffscreenCanvas` en un Worker ni WebGL. Es una reescritura del render, desproporcionada para el problema.
- **Capturas en `specs/13-rendimiento-vaiven/`.** Viven junto a la spec, porque `references/` es de solo lectura salvo los documentos vivos listados en `CLAUDE.md`.

## Riesgos

| Riesgo                                                                  | Mitigación                                                                                                                             |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Playwright sin GPU da números peores que un navegador real              | Las columnas "antes" y "después" se miden en el mismo entorno. Lo que importa es la mejora relativa y los umbrales en ese entorno.     |
| El glow horneado se corta en el borde del sprite                        | `pad` = ⌈1,5 · `shadowBlur`⌉ + 2, y el recuadro incluye los 56 px del haz en el frente de los vehículos. Se comprueba en las capturas. |
| El orden de dibujo cambia (rayas de flujo sobre el glow de las orillas) | Las rayas van en el centro de la fila y el glow del borde no llega allí. Se comprueba en las capturas.                                 |
| Con dpr 3 limitado a 2 el canvas se ve algo más suave                   | El canvas ya se escala por CSS. Se revisa en la captura móvil de 390×844.                                                              |
| La caché se queda con el skin viejo                                     | `setSkin` reconstruye la caché antes de asignar el skin y repinta en pausa. Hay un criterio de aceptación para ello.                   |

## Qué **no** entra en esta spec

- Optimización a fondo de ROCAS, CAÍDA, BLOQUE BUSTER y SERPENTINA (solo el límite de dpr).
- Animaciones CSS de las páginas y la tarjeta de la biblioteca.
- Contador de FPS en la app y modo "rendimiento" con menos glow.
- Cambios de reglas, colores o skins de VAIVÉN.
- Worker, `OffscreenCanvas` o WebGL.

Cada una de estas, si llega, irá en su propia spec.

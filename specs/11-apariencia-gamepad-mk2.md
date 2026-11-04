# SPEC 11 — Apariencia del mando táctil como el Gamepad MK-II

> **Estado:** implementado
> **Depende de:** SPEC 10
> **Fecha:** 2026-10-31
> **Objetivo:** Que el mando táctil de los juegos reales tenga el aspecto del Gamepad MK-II de `references/gamepad-assets/` sin cambiar cómo funciona.

## Por qué existe esta spec

La SPEC 10 dejó el mando táctil (`components/games/touch-pad.tsx` y las clases `.touch-*` de `app/globals.css`) funcionando en los cuatro juegos reales, pero su aspecto no es el que queremos. La referencia `references/gamepad-assets/gamepad.html` (captura en `gamepad-neon.png`) define otro diseño:

| Elemento      | Hoy (SPEC 10)                                                 | Gamepad MK-II (referencia)                                                                                                       |
| ------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Chasis        | Degradado negro con un anillo gris (`box-shadow` 6 px + 1 px) | Degradado `#1c1c28 → #0c0c14`, borde cian tenue, segundo borde interior a 4 px, textura de puntos de 8 px y halo cian por debajo |
| Cruceta       | Cruz unida: cuatro brazos pegados a un eje plano con un punto | Cuatro teclas cuadradas separadas (50 px, 3 px de hueco, radio 10 px) con relieve (sombra inferior de 4 px)                      |
| Eje           | Cuadrado `--bg-3` con un círculo oscuro                       | Cuadrado oscuro con borde cian tenue y una gema cian en rombo que late (`pulse-led`, 2 s)                                        |
| Flecha        | Triángulo recortado con `clip-path`                           | Triángulo de 22 px; al pulsar se vuelve cian con doble `drop-shadow`                                                             |
| Tecla pulsada | Fondo `#0b2a30` con glow cian                                 | Baja 3 px, fondo `#08161e → #030a0e`, borde cian, glow interior y exterior                                                       |
| Botón A       | Magenta, cóncavo, sin letra                                   | Esfera magenta con brillo arriba a la izquierda, borde de 2 px, letra `A` en pixel con glow y aro discontinuo                    |
| Botón B       | Amarillo                                                      | Esfera cian, igual que A                                                                                                         |
| Botón pulsado | Baja 4 px y se ilumina el aro                                 | Baja 4 px, escala 0.97, glow de 36 px y el aro discontinuo aparece y crece a 1.08                                                |

Esta spec solo cambia el aspecto. La lógica del mando (punteros, multitáctil, autorrepetición, `disabled`, `TouchLayout`) y los motores no se tocan.

## Alcance

**Entra:**

- **Chasis del mando** (`.touch-pad` en vertical): degradado, borde cian tenue, borde interior (`::before`), textura de puntos (`::after`) y halo cian por debajo, como `.gp` en la referencia. Los pseudoelementos llevan `pointer-events: none` y el contenido queda por encima (`z-index`).
- **Cruceta:** cuatro teclas cuadradas separadas con relieve, en la rejilla 3×3 actual, con un hueco de 3 px entre celdas. Las flechas siguen dibujadas con CSS (el triángulo de `::before`), pero con el tamaño, el color y el glow de la referencia.
- **Eje con gema:** `.touch-hub` con el aspecto de `.dp-hub`, y la gema cian en rombo (`.touch-hub::after`) con la animación `pulse-led`.
- **Botones A/B:** esferas con brillo, borde de 2 px y glow. A es magenta (`--magenta`) y B pasa de amarillo a cian (`--cyan`). Dentro llevan la letra (`A`/`B`) en `var(--pixel)` con glow y un aro discontinuo que aparece al pulsar.
- **Etiqueta del juego:** se mantiene `.touch-label` (`FUEGO`, `ROTAR`, `SOLTAR`) bajo cada botón, en pixel de 8 px.
- **Estado pulsado:** se usa `[data-pressed="true"]`, el equivalente a `.on` en la referencia, en teclas y botones.
- **Flechas no usadas:** se siguen ocultando como en la SPEC 10. Las filas sin flecha se pliegan sin dejar hueco extra y el eje con la gema queda siempre en el centro de la cruz.
- **Horizontal** (`(pointer: coarse) and (orientation: landscape)`): el panel sigue partido en dos mitades a los lados del CRT. Cada mitad (`.touch-dpad` y `.touch-actions`) lleva el chasis MK-II (degradado, bordes, puntos y halo) con padding y halo reducidos, para que el CRT no pierda ancho en 844×390.
- **Tamaños:** teclas de cruceta de 50 px (46 px en `max-width: 380px`), y botones A/B de 64 px en vertical y 58 px en horizontal.
- **Movimiento reducido:** con `prefers-reduced-motion: reduce` se quitan la animación de la gema y los desplazamientos y escalados al pulsar. El cambio de color y glow se mantiene.
- **Markup de `TouchPad`:** dentro de cada botón de acción se añaden `<span className="touch-ring" aria-hidden="true" />` y `<span className="touch-letter" aria-hidden="true">A|B</span>`. La letra sale de `action.toUpperCase()`. Los `aria-label` no cambian.
- El diseño del CSS se hace con `/frontend-design`, partiendo de los valores de `gamepad.html`.

**Fuera de alcance:**

- Cambios en la lógica de `TouchPad` (punteros, autorrepetición, `disabled`, `releaseAll`), en `lib/games/input.ts`, en `useCanvasGame`, en `GameShell` o en los motores.
- Iluminar el mando al pulsar teclas del teclado (el `keydown` de la referencia), porque el mando solo aparece en `pointer: coarse`.
- Estilos `:hover`, que no aplican en táctil.
- Que el mando cambie con el skin del juego (clásico/neón/retro/pastel). Siempre usa la paleta neón de la referencia; si se quiere, irá en otra spec.
- Mostrar el mando en escritorio.
- Copiar a `public/` o importar `gamepad.html` tal cual, o usar sus SVG. Se reescribe sobre las clases `.touch-*` existentes.
- El layout del resto del player (HUD, skins, CRT, REGRESAR) de la SPEC 10.
- Cargar Google Fonts: Press Start 2P ya está en el proyecto (`--pixel`).

## Modelo de datos

No hay datos nuevos: ni tablas, ni tipos, ni `localStorage`. `TouchLayout` y `GameAction` no cambian.

### Markup (`components/games/touch-pad.tsx`)

Solo cambia el contenido del botón de acción:

```tsx
<button type="button" tabIndex={-1} className="touch-btn action" data-action={action} data-pressed="false" aria-label={…} {...handlers(action)}>
  <span className="touch-ring" aria-hidden="true" />
  <span className="touch-letter" aria-hidden="true">{action.toUpperCase()}</span>
</button>
```

La cruceta y el eje mantienen su markup (`.touch-dpad`, `.touch-hub`, `.touch-btn[data-dir]`).

### CSS (`app/globals.css`)

Se reescriben las reglas del bloque `/* ===== mando táctil … */` y las de `.touch-*` dentro de las media queries `(pointer: coarse)` y `(pointer: coarse) and (orientation: landscape)`. Valores de partida, tomados de la referencia:

| Token / regla    | Valor                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| Fondo del chasis | `linear-gradient(180deg, #1c1c28 0%, #0c0c14 100%)`                                                                  |
| Borde del chasis | `1px solid rgba(0,245,255,0.18)` (`--line`), interior `rgba(0,245,255,0.14)` a 4 px                                  |
| Halo del chasis  | `0 30px 80px -30px rgba(0,245,255,0.4)` (reducido en horizontal)                                                     |
| Textura          | `radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)` a 8 px, `opacity: 0.6`                                |
| Tecla de cruceta | `linear-gradient(180deg, #1a1a25, #0a0a12)`, radio 10 px (8 px a 46 px), `box-shadow: 0 4px 0 #050507, …`            |
| Tecla pulsada    | `translateY(3px)`, `linear-gradient(180deg, #08161e, #030a0e)`, borde `--cyan`, glow interior 16 px y exterior 16 px |
| Gema             | 12 px, `--cyan`, `clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%)`, `pulse-led 2s ease-in-out infinite`         |
| Botón A          | `--c: var(--magenta)`, medio `rgba(255,0,110,0.7)`, fondo `rgba(110,0,40,0.95)`, glow `rgba(255,0,110,0.4)`          |
| Botón B          | `--c: var(--cyan)`, medio `rgba(0,200,230,0.7)`, fondo `rgba(0,50,70,0.95)`, glow `rgba(0,245,255,0.4)`              |
| Letra            | `var(--pixel)` 22 px (20 px a 58 px), `#fff`, `text-shadow` con el color del botón                                   |
| Botón pulsado    | `translateY(4px) scale(0.97)`, glow 36 px; `.touch-ring` `opacity: 1; transform: scale(1.08)`                        |

Los valores finales los ajusta `/frontend-design`, pero el resultado tiene que parecerse a `gamepad-neon.png`.

### Estructura final

```
components/games/touch-pad.tsx   (modificado: aro y letra en los botones de acción)
app/globals.css                  (modificado: estilos .touch-* con el aspecto MK-II)
```

## Plan de implementación

1. **Cruceta, eje y chasis en vertical.**
   - Con `/frontend-design`, reescribir `.touch-pad`, `.touch-dpad`, `.touch-hub` y `.touch-btn[data-dir]` en `app/globals.css` con los valores de la referencia: chasis con bordes, puntos y halo; teclas separadas con relieve; eje con gema y `pulse-led`; estado pulsado.
   - Ajustar las reglas de la SPEC 10 que pliegan las filas sin flecha para que funcionen con el hueco entre celdas.
   - Resultado: en 390×844 la cruceta de los cuatro juegos se ve como en la referencia y sigue respondiendo igual.
2. **Botones A/B.**
   - Añadir `.touch-ring` y `.touch-letter` al markup de `TouchPad`.
   - Reescribir `.touch-btn.action` con esferas magenta (A) y cian (B), letra, aro y estado pulsado. Mantener `.touch-label` debajo.
   - Resultado: ROCAS (FUEGO) y CAÍDA (SOLTAR, ROTAR) muestran los botones MK-II con su etiqueta.
3. **Horizontal, pantallas estrechas y movimiento reducido.**
   - Aplicar el chasis MK-II a cada mitad (`.touch-dpad`, `.touch-actions`) en la media query horizontal, con padding y halo reducidos y botones de 58 px.
   - Tamaños de `max-width: 380px` (teclas de 46 px).
   - `prefers-reduced-motion`: sin `pulse-led` ni desplazamientos al pulsar.
   - Resultado: en 844×390 el CRT conserva el ancho que tenía y las dos mitades del mando tienen el aspecto MK-II.
4. **Verificación final.**
   - `npm run build` y `npm run lint`.
   - Con el MCP de Playwright, en un contexto móvil (`hasTouch`/`isMobile`), en 390×844 y 844×390, en los cuatro juegos: captura y comparación con `gamepad-neon.png`, y recorrido de los criterios.

## Criterios de aceptación

**Sin regresiones:**

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `git diff main --stat` solo muestra `components/games/touch-pad.tsx`, `app/globals.css` y esta spec.
- [ ] En escritorio (`pointer: fine`) no se pinta `.touch-pad` en ningún juego, y `/games/gloton/play` (simulado) se ve igual que antes.
- [ ] Los `aria-label` de teclas y botones son los mismos que antes ("Izquierda", "Fuego", "Rotar"…), y la letra y el aro tienen `aria-hidden`.
- [ ] Los criterios de controles de la SPEC 10 siguen cumpliéndose: ROCAS gira, impulsa y dispara a la vez; CAÍDA autorrepite ← ↓ →; BLOQUE BUSTER mueve la paleta con ← → y con el dedo; SERPENTINA arranca con una flecha; pausa y fin de partida desactivan el mando; tocar el mando no hace scroll, zoom, selección ni menú contextual.

**Vertical (390×844, táctil):**

- [ ] El mando tiene un chasis con borde cian tenue, un borde interior, textura de puntos y halo cian por debajo.
- [ ] Las teclas de la cruceta están separadas (hueco visible entre ellas), miden 50×50 px y tienen relieve.
- [ ] El eje muestra una gema cian en rombo que late.
- [ ] Al mantener una flecha, la tecla baja, se vuelve cian con borde y glow, y la flecha brilla. Al soltar vuelve a su estado.
- [ ] SERPENTINA muestra las 4 teclas; CAÍDA, ← ↓ → sin hueco arriba; BLOQUE BUSTER, ← → en una sola fila con el eje en medio; ROCAS, ← ↑ →. En todos el eje queda en el centro de la cruz.
- [ ] Los botones de acción miden 64×64 px; A es magenta y B cian, cada uno con su letra en pixel blanco con glow y la etiqueta del juego debajo (`FUEGO`; `SOLTAR` y `ROTAR`).
- [ ] Al mantener un botón A/B, baja, aumenta el glow y aparece el aro discontinuo.
- [ ] HUD, CRT y mando siguen cabiendo en 390×844 sin scroll con la página desplazada hasta el HUD.
- [ ] La captura del mando se parece a `references/gamepad-assets/gamepad-neon.png` (chasis, cruceta, gema y botones A/B), con la única diferencia de las flechas que cada juego oculta y las etiquetas.

**Horizontal (844×390, táctil):**

- [ ] La cruceta queda a la izquierda del CRT y los botones a la derecha, cada mitad con el chasis MK-II.
- [ ] Los botones de acción miden 58×58 px.
- [ ] El CRT completo cabe en la altura del viewport y su ancho no es menor que antes de esta spec.
- [ ] El documento no es más ancho que el viewport.

**Pantallas estrechas y accesibilidad:**

- [ ] En 360×740 las teclas de la cruceta miden 46×46 px y el mando no se desborda.
- [ ] Con `prefers-reduced-motion: reduce` la gema no se anima y los botones no se desplazan al pulsar, pero sí cambian de color y glow.

## Decisiones

- **Solo aspecto, sin lógica.** La SPEC 10 ya validó punteros, multitáctil y autorrepetición. Tocar solo CSS y dos `span` limita el riesgo de regresiones.
- **Letra dentro y etiqueta debajo.** Con solo la letra (más fiel a la referencia) no se sabría qué hace cada botón en cada juego. Con solo la etiqueta se perdería el aspecto de mando.
- **B cian en lugar de amarillo.** Así lo usa la referencia, y el par magenta/cian es la identidad neón del portal.
- **Ocultar las flechas no usadas** (SPEC 10) en lugar de pintarlas atenuadas. Una tecla que no hace nada confunde, aunque la referencia muestre las cuatro.
- **Panel partido en horizontal**, con el chasis MK-II en cada mitad. Unirlo de nuevo bajo el CRT le quitaría altura a la pantalla.
- **Sin iluminación por teclado.** El mando solo existe en `pointer: coarse`. Iluminarlo desde el teclado solo tendría sentido en una tablet con teclado y añadiría listeners al `TouchPad`.
- **Sin `:hover`.** En táctil no existe y en algunos navegadores se queda pegado tras el toque.
- **El mando no sigue al skin.** Siempre usa la paleta neón. Adaptarlo a cada skin daría para otra spec.
- **Flechas con CSS en lugar de los SVG de la referencia.** El markup de la cruceta no cambia y el triángulo de `::before` da el mismo resultado.
- **Tamaños.** Teclas de 50 px como la referencia (46 px en pantallas ≤ 380 px). Quedan por debajo del mínimo de 56 px de la SPEC 10, que se mantiene en los botones de acción (64/58 px). Así HUD + CRT + mando siguen cabiendo en 390×844.

## Riesgos

- **Espacio vertical.** El halo, el borde interior y la sombra inferior de las teclas pueden añadir altura y romper el "cabe sin scroll" en 390×844. Mitigación: el halo va en `box-shadow`, que no ocupa espacio en el layout, y se verifica con Playwright.
- **Filas plegadas con hueco.** Con `gap` en la rejilla, las filas de 0 px de CAÍDA y BLOQUE BUSTER siguen sumando el hueco y descentran el eje. Mitigación: ajustar `row-gap` o las filas en las reglas `:not(:has([data-dir=…]))`.
- **Pseudoelementos que tapan los toques.** `::before` y `::after` del chasis cubren los botones. Mitigación: `pointer-events: none` y contenido con `position: relative; z-index: 1`.
- **Rendimiento.** Varias sombras y `drop-shadow` animadas en móviles modestos. Mitigación: solo se anima la gema (opacidad y escala). El glow cambia al pulsar, sin animaciones continuas.

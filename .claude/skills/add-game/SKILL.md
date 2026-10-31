---
name: add-game
description: Diseña la spec para añadir un juego jugable a Arcade Vault con su leaderboard en Supabase, partiendo de una carpeta de references/started-games/ o de una descripción del usuario. Decide si el juego sustituye a una partida simulada del catálogo o entra como juego nuevo, hace las preguntas propias de un juego de canvas y escribe specs/NN-juego-<slug>.md en estado Draft, lista para /spec-impl. Úsalo cuando el usuario quiera crear, portar o integrar un juego en la plataforma.
disable-model-invocation: true
argument-hint: "<subcarpeta de references/started-games (ej. 03-tetris) o descripción del juego>"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(wc:*)
---

# /add-game — Spec de un juego integrado en Arcade Vault

## Contexto de la sesión

Fecha de hoy (úsala en la cabecera de la spec, nunca la inventes):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null`

Juegos de referencia disponibles:
!`ls references/started-games/ 2>/dev/null || echo "No hay carpeta references/started-games"`

Motores ya portados:
!`ls lib/games/ 2>/dev/null`

Rutas de juego reales (los ids que no estén aquí usan la partida simulada):
!`ls app/games/ 2>/dev/null`

Migraciones:
!`ls supabase/migrations/ 2>/dev/null`

---

Este skill **no escribe código**. Es una especialización de `/spec` para juegos: sigue su método y su formato, y el patrón que ya funcionó en la SPEC 05 (port de Asteroids a ROCAS) y la SPEC 06 (tablas `games`/`scores`, leaderboard y `submitScore`). La implementación la hace después `/spec-impl`.

Responde siempre en el idioma del usuario (en este proyecto, español).

## Fase 0 — Referencias obligatorias (antes de nada)

Lee estos archivos **enteros** antes de preguntar o escribir nada. Son la referencia para crear el archivo de especificación, y la spec que generes debe ser indistinguible en forma de las que ya hay en `specs/`:

1. **El skill `/spec`:**
   - `.claude/skills/spec/SKILL.md`: el método (fases, cuándo parar de preguntar, cómo numerar y guardar, estado `Draft`, `specs/.spec-config.yml`). `/add-game` sigue esas mismas reglas salvo donde este archivo diga otra cosa.
   - `.claude/skills/spec/template.md`: la estructura y las reglas de cada sección (cabecera, alcance, modelo de datos, plan, criterios, decisiones, riesgos, "lo que no entra").
2. **Las specs del proyecto (`specs/`):**
   - `specs/05-juego-asteroids-rocas.md` y `specs/06-leaderboard-y-tabla-juegos.md` siempre: son el modelo de una spec de juego y del leaderboard.
   - Todas las specs de juego posteriores a la 06 (`specs/NN-juego-*.md`), y como mínimo las dos specs más recientes aunque no sean de juegos. De ellas tomas el idioma, la redacción exacta de la cabecera (`> **Estado:**`, `> **Depende de:**`…), los títulos de sección, el tono, el nivel de detalle y la forma de las tablas y criterios.
   - Si una spec más reciente cambia un contrato (un hook compartido, un HUD ampliado…), manda esa spec sobre `integracion.md`. Avisa al usuario de que conviene actualizar el skill.
3. **`template.md`** (en este directorio): la plantilla de la spec de juego. Es el template de `/spec` aplicado a un juego de Arcade Vault, con las secciones, pasos, criterios, decisiones y riesgos que se repiten en todos los juegos, y bloques **[si …]** para cada caso (sustituir un simulado, juego nuevo, assets, hook compartido, HUD ampliado).
4. **`integracion.md`** (en este directorio): los contratos de la plataforma (motor, componente, ruta, catálogo, leaderboard). Es la fuente de verdad del "cómo".

Si falta alguno de los archivos de los puntos 1 y 2, dilo y sigue con los que haya.

## Fase 1 — Contexto

1. Lee `CLAUDE.md` y `app/data/games.ts` para conocer el catálogo (ids, categorías, colores, covers).
2. Identifica el **origen** del juego a partir de `$ARGUMENTS`:
   - **Referencia:** coincide con una subcarpeta de `references/started-games/` (por número, nombre o juego). Lee su `CLAUDE.md`, `README.md`, `index.html`, `game.js` completo y el resto de `.js`, `.css` y assets. Haz inventario: resolución del canvas, bucle, estado, controles, puntuación, vidas, niveles, HUD dibujado o en el DOM, overlays, reinicio, sonidos, sprites, listeners que nunca se quitan.
   - **Descripción:** no hay carpeta. El juego se diseña en la spec (reglas, controles, puntuación, niveles) con números concretos. Debe ser un diseño original dentro de un género, no la copia de un juego comercial concreto.
   - Si la referencia ya está portada (sale en "Motores ya portados" o tiene ruta real), dilo y pregunta qué se quiere hacer antes de seguir.
3. Identifica el **destino** candidato en el catálogo:
   - **Sustituir una partida simulada:** hay un juego en `app/data/games.ts` del mismo género sin ruta real (por ejemplo, `caida` para un Tetris o `bloque-buster` para un Arkanoid). No hace falta migración de catálogo, y el juego ya tiene ficha, cover y ranking.
   - **Juego nuevo:** necesita fila en `games` (migración), entrada de respaldo en `GAMES`, cover CSS nueva y decidir si lleva seed de puntuaciones.

Si `$ARGUMENTS` está vacío, el primer bloque de preguntas empieza por el origen: subcarpeta de `references/started-games/` o descripción del juego.

## Fase 2 — Preguntas

Usa **siempre `AskUserQuestion`**, con una pestaña por pregunta:

- `header` corto (máximo 12 caracteres): "Destino", "Puntuaciones", "HUD", "CRT", "Assets", "Victoria"…
- De 2 a 3 opciones, cada una con un `label` corto y una `description` de una línea que diga qué pasa si se elige.
- La recomendada va primero, con "(Recomendado)" al final del label.
- `multiSelect: true` solo si las opciones no se excluyen.
- Hasta 4 preguntas por llamada. Espera las respuestas antes de la siguiente llamada y no repitas lo ya respondido. Si una pestaña queda sin respuesta, toma la recomendación y apúntalo en Decisiones.

No preguntes lo que ya fijan `integracion.md` o las specs 05 y 06 (API del motor, `GameShell`, `submitScore`, rangos de nombre y puntuación, cacheo, ruta estática). Pregunta solo lo que cambia de un juego a otro. Temas, según el juego:

- **Destino.** Sustituir a `<id simulado>` o juego nuevo. Si es nuevo, en otra llamada: id, título, textos `short` y `long`, `cat` (`ARCADE`, `PUZZLE`, `SHOOTER`, `VERSUS`), `color` (`cyan`, `magenta`, `yellow`, `green`) y posición. La home solo enseña los 6 primeros (`games.slice(0, 6)`). Para los textos, propón tú una versión en el tono del catálogo y deja que la acepte o la cambie con "Other".
- **Puntuaciones.** Si sustituye: conservar las 12 filas del seed o vaciarlas con una migración (las del simulado son aleatorias). Si es nuevo: seed de 12 filas o ranking vacío ("SIN PUNTUACIONES TODAVÍA").
- **Fidelidad.** Port 1:1 de la referencia (recomendado) o con cambios de reglas.
- **HUD.** `GameShell` solo pinta PUNTUACIÓN, VIDAS y NIVEL. Si el juego no tiene vidas (Tetris) o tiene otra métrica clave (líneas): (a) mapear a lo que hay (vidas a 0 se ve "—"), (b) ampliar `GameShell` con una métrica extra opcional sin cambiar los demás juegos, (c) dibujarla en el canvas.
- **CRT.** `.crt-screen` es 4:3. Si la referencia no lo es (Tetris es 300×600), propone una resolución lógica 4:3 (800×600 por defecto) con el tablero centrado y lo que estaba fuera del canvas (pieza siguiente, panel lateral) dibujado dentro.
- **Overlays.** Qué se quita del canvas (puntuación, vidas, "GAME OVER", "PAUSE", reinicio con tecla) y qué se queda por ser jugabilidad (como el indicador `3x` de ROCAS).
- **Controles.** Teclas con `preventDefault`. Si usa ratón, si se mantiene. Táctil (obligatorio desde la SPEC 10): qué flechas de la cruceta y qué botones A/B usa (con su etiqueta), y si alguna acción se autorrepite al mantenerla. Gestos propios del juego, en otra spec.
- **Assets.** Si hay imágenes o sonidos: copiarlos a `public/games/<id>/`, redibujar en canvas con la paleta neón, o sin sonido en esta spec. Si el sonido se queda, preguntar por mute.
- **Victoria.** Si el original tiene estado `win` (Arkanoid tras el último nivel): `onGameOver(score)` o volver al nivel 1 con más velocidad.
- **Código compartido.** La SPEC 05 dejó el `CanvasGame` genérico "para el segundo juego de canvas". Si este es el segundo, pregunta si se extrae ahora un hook compartido desde `asteroids-game.tsx` (pausa con `P`/`Escape`, `visibilitychange`, detección de teclado, ciclo de vida del motor) en un paso propio con criterio de que ROCAS sigue igual (recomendado), o se duplica y se extrae después.
- **Paleta.** Por defecto, paleta neón de la plataforma con glow, diseñada con `/frontend-design` (lo exige `CLAUDE.md`). Solo pregunta si el usuario quiere conservar los colores originales.

Para de preguntar cuando sepas, sin suponer nada: qué archivos aparecen o cambian, cuál es el primer y el último paso, y cómo se verifica.

## Fase 3 — Escribir la spec

Antes de redactar, vuelve a abrir `template.md` (de este directorio), `.claude/skills/spec/template.md` y `specs/05-juego-asteroids-rocas.md`. Partes de `template.md` de este directorio: rellena cada `<…>` con datos reales, deja solo los bloques **[si …]** que aplican (sin la marca) y no dejes ningún `<…>` en la spec final. Las reglas de cada sección salen del template de `/spec`, y la forma concreta (redacción, tablas, nivel de detalle) sale de la SPEC 05 y de la spec de juego más reciente. No inventes secciones ni cambies los títulos.

Con todo respondido, aplica el "camino rápido" de la Fase 3 de `/spec`: escribe la spec completa de una vez, no sección por sección. Si falta información, vuelve a la Fase 2 en lugar de suponer.

- Mismo idioma, cabecera y títulos de sección que las specs existentes, en el orden del template: cabecera, por qué existe, alcance (entra / fuera de alcance), modelo de datos, plan de implementación, criterios de aceptación, decisiones, riesgos y lo que no entra.
- Toma de la SPEC 05 los pasos, criterios y riesgos que se repiten en todo juego de canvas (motor sin React, componente con `GameShell`, ruta estática, paleta con `/frontend-design`, aviso sin teclado, `destroy` sin fugas, `preventDefault` que respeta el input). Toma de la SPEC 06 los criterios de guardado y ranking (`submitScore`, "GUARDANDO…", fila en `scores`, TOP 10 y `/salon` sin recargar la caché). Adáptalos al juego con sus números; no los copies a ciegas.
- Usa `integracion.md` como lista de comprobación: todo lo que dice se refleja en la spec o se descarta de forma explícita en Decisiones.
- **Depende de:** SPEC 05 y SPEC 06 como mínimo, más la última spec de juego si cambió algún contrato.
- Nombres reales: id del juego, `lib/games/<motor>/`, `create<Motor>Game`, `components/games/<motor>-game.tsx`, `app/games/<id>/play/page.tsx`, y migraciones con timestamp `AAAAMMDDhhmmss` posterior al último de `supabase/migrations/`.
- Reglas del juego con números concretos (constantes, puntos, velocidades, vidas, niveles), sacados de la referencia o acordados en la Fase 2. Nunca "como en el original".
- No incluyas lo que no aplica (migración de catálogo si sustituye a un simulado, assets si no hay, extracción del hook si ya existe), y deja en Decisiones por qué.
- Cada decisión va en Decisiones con "Elegido por el usuario" o "Tomado de las recomendaciones".

## Fase 4 — Guardar

1. Número: el más alto de `specs/` + 1, con dos dígitos. Slug: `juego-<motor>-<id>` (como `05-juego-asteroids-rocas`), o `juego-<id>` si coinciden.
2. Escribe `specs/NN-slug.md` sin pedir permiso. Solo pregunta si el archivo ya existe.
3. Estado `Draft`. Nunca `Approved`.
4. Comprueba que las specs de **Depende de** existen.
5. Si no existe `specs/.spec-config.yml`, créalo con el contenido por defecto que indica `.claude/skills/spec/SKILL.md`. Si existe, no lo toques.
6. Confirma al usuario: la ruta del archivo, que está en `Draft`, las 2–3 decisiones con más impacto, y que el siguiente paso es revisarla, pasarla a `Approved` y ejecutar `/spec-impl NN-slug`.
7. **Para aquí.** No implementes ni propongas implementar.

## Reglas

- Nunca escribas código en este skill. Solo el `.md` de la spec.
- El leaderboard **no se reimplementa**: los juegos lo heredan de `GameShell`, `submitScore` y `getLeaderboard`. Si la spec propone otra vía de guardado o de ranking, algo se ha entendido mal.
- No se toca `app/games/[id]/play/page.tsx`: el juego real entra por una ruta estática con prioridad.
- Si el juego necesita romper un contrato de `integracion.md` (pantalla que no sea 4:3, multijugador en línea, puntuaciones por encima de 9.999.999, varios jugadores por partida en el ranking), dilo y propón una spec previa que cambie ese contrato.
- Un juego por spec. Si piden varios, una spec por juego.

# Game jam — VAIVÉN (`vaiven`)

> **Tema:** cruce de carriles a saltos (género de cruce de carriles, juego original).
> **Idea base:** propuesta por cezapx16 (2026-10-30).
> **Fecha:** 2026-10-30
> **Estado de las specs:** Draft

## Juego elegido

**VAIVÉN** — ARCADE · green · juego nuevo (`sort_order` 9).

- **Concepto:** un saltador de luz cruza a saltos una autopista de neón y un río de datos. Al llegar a la otra orilla, el tablero se voltea como una carta y hay que volver bajando, con los carriles más rápidos en cada viaje.
- **Giro:** el **volteo** (espejo horizontal: todos los carriles invierten su sentido y el objetivo pasa a ser la orilla de la que se salió) y el **rozón**: saltar justo cuando un vehículo está a 16 px o menos sube un multiplicador de racha de x1 a x5.
- **Por qué gana:** es la idea concreta del usuario, se entiende en segundos (cruzar, volver, más rápido), la puntuación crece sin techo práctico viaje a viaje y el rozón premia el riesgo, que es lo que hace repetir partida. Cabe en el contrato sin tocar nada compartido: 800×600, teclado, motor en TypeScript plano y pocas entidades con colisiones AABB en una sola fila.

### Ideas descartadas

- **CRUCE ORBITAL:** carriles concéntricos alrededor de un núcleo y saltos radiales. Colisiones angulares y coste alto para la misma sensación.
- **SEMÁFORO:** el jugador detiene un carril cada pocos segundos en lugar de saltar. Pierde el salto, que es el núcleo del tema.

### Relación con RANARIA

El catálogo ya tiene `ranaria` (RANARIA, simulado, green, `sort_order` 7), del mismo género, y el TODO tiene una propuesta de `game-planner` para hacerla real (carriles que cambian de sentido por nivel y nenúfar dorado). VAIVÉN se diferencia en:

- No hay casillas de llegada ni nada que "rellenar": cualquier celda de la orilla de enfrente completa el viaje, y el juego es una ida y vuelta infinita.
- El tablero se voltea al llegar y se vuelve bajando: el orden de los obstáculos se invierte (río primero en la vuelta).
- La puntuación se basa en el rozón y su racha, no en el tiempo restante ni en bonus de llegada.
- Sin ranas, troncos, tortugas, nenúfares ni cocodrilos: un rombo de luz, vehículos de neón y paquetes de datos.

Las dos ideas compiten por el mismo hueco del catálogo (ver pregunta abierta 1).

## Destino

**Juego nuevo** `vaiven`: migración `supabase/migrations/20261030000000_game_vaiven.sql` con la fila en `games`, entrada de respaldo en `GAMES`, cover `.cover-vaiven` nueva, `sort_order` 9 y ranking vacío ("SIN PUNTUACIONES TODAVÍA"). RANARIA sigue como simulado.

## Specs

| Orden | Archivo                           | Objetivo                                                                                                                                                                     |
| ----- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `01-juego-hopper-vaiven.md`       | Juego jugable completo: motor `lib/games/hopper/`, saltos, autopista y río de datos, rozón con racha x1–x5, volteo con carriles más rápidos, catálogo, cover y ranking vacío |
| 2     | `02-vaiven-amenazas-por-viaje.md` | Novedades que se desbloquean viaje a viaje: paquetes que se comprimen (3), ráfagas de carril (4), ralentí (5) y mediana electrificada (6), con su aviso en el volteo         |

La 02 depende de la 01 y no se empieza hasta que la 01 esté implementada. Al aprobarlas se mueven a `specs/10-juego-hopper-vaiven.md` y `specs/11-vaiven-amenazas-por-viaje.md` (o el número que toque) antes de `/spec-impl`.

## Preguntas abiertas

1. **Destino** — elegido: juego nuevo `vaiven` en `sort_order` 9, con RANARIA intacta como simulado · alternativa: sustituir el simulado `ranaria` (sin fila nueva ni cover, pero con id y título RANARIA, o un `update` del título) · ¿por qué importa? con juego nuevo el catálogo tendrá dos juegos de cruce de carriles, uno real y otro simulado, y la propuesta de RANARIA del `game-planner` quedaría casi sin sentido. Si se sustituye, el paso 1 de la 01 pasa a ser un `update` + reset de puntuaciones y no hay cover nueva.
2. **Título e id** — elegido: VAIVÉN / `vaiven` (sin tilde en el id por el `check` `^[a-z0-9-]{1,32}$`) · alternativa: otro título si se sustituye RANARIA · ¿por qué importa? el id no se puede cambiar después sin perder las puntuaciones (`scores.game_id` es clave foránea).
3. **Color** — elegido: green, el que sugirió el usuario · alternativa: magenta, que solo usa CAÍDA (green ya lo tienen SERPENTINA, INVASORES y RANARIA) · ¿por qué importa? con green, 4 de 9 juegos serían verdes; cambia `PALETTE`, la cover y el borde de la ficha.
4. **Categoría** — elegido: ARCADE · alternativa: ninguna encaja mejor (no es PUZZLE, SHOOTER ni VERSUS) · ¿por qué importa? ARCADE pasa a 6 de 9 juegos. El filtro sigue funcionando, pero el catálogo se desequilibra.
5. **Qué es "voltear"** — elegido: espejo horizontal animado de 600 ms (el tablero gira como una carta sobre el eje vertical), todos los carriles invierten su sentido y se vuelve bajando · alternativa: giro de 180°, que deja la orilla de llegada abajo y obliga a "volver subiendo" otra vez · ¿por qué importa? la idea dice "volver bajando"; el giro de 180° lo contradice y además desorienta.
6. **Rozón** — elegido: un salto es rozón si, al pulsar, un vehículo que **se acerca** está a entre 1 y 16 px de la caja del jugador en el carril de origen o en el de destino; solo en la autopista, como máximo uno por salto · alternativa: contar también los bordes de los paquetes del río, o cualquier vehículo cercano aunque se aleje · ¿por qué importa? define la dificultad del multiplicador y evita farmear rozones con vehículos que ya pasaron.
7. **Caducidad de la racha** — elegido: la racha vuelve a x1 si pasan 3 s sin otro rozón, o al perder una vida · alternativa: sin caducidad, solo se pierde al morir · ¿por qué importa? sin caducidad, x5 se mantiene casi toda la partida y el rozón deja de ser una decisión.
8. **Tiempo por viaje** — elegido: 45 s por viaje con barra en la franja de estado; agotarlo cuesta una vida · alternativa: sin límite de tiempo · ¿por qué importa? sin tiempo se puede esperar en la mediana indefinidamente a que pasen los vehículos perfectos para rozar.
9. **Controles** — elegido: flechas y WASD, con `preventDefault` solo en las flechas · alternativa: solo WASD, como SERPENTINA, sin ningún `preventDefault` · ¿por qué importa? las flechas son lo natural en un juego de saltos, pero obligan a cuidar el `preventDefault` con el input de iniciales.
10. **Puntuaciones iniciales** — elegido: ranking vacío, sin seed · alternativa: seed de 12 filas inventadas · ¿por qué importa? un seed aleatorio pondría marcas inalcanzables o ridículas, como pasó con los simulados.
11. **Nombre del motor** — elegido: `lib/games/hopper/` (`createHopperGame`, `hopper-game.tsx`), siguiendo la convención de nombres de género en inglés (`asteroids`, `tetris`, `arkanoid`, `snake`) · alternativa: `lib/games/vaiven/` · ¿por qué importa? se repite en rutas, imports y en el slug de la spec.
12. **Alcance de la 02** — elegido: cuatro novedades que se desbloquean en los viajes 3, 4, 5 y 6 (compresión, ráfagas, ralentí, mediana electrificada) · alternativa: una 02 de arte propio o un modo contrarreloj · ¿por qué importa? se evitaron a propósito mecánicas reconocibles del género comercial (plataformas que se hunden, casillas de llegada, pasajeros que se rescatan). Si alguna de las cuatro se parece demasiado a algo conocido, se cambia antes de aprobar.
13. **Contrato** — elegido: el tema no obliga a romper nada; 800×600 (4:3), teclado, `GameShell` sin cambios (NIVEL = número de viaje) y la racha, el tiempo y el sentido del viaje dibujados en una franja de estado del canvas · alternativa: ampliar `GameShell` con una métrica RACHA en el HUD de React, en una spec propia del jam · ¿por qué importa? el multiplicador es la clave de la puntuación y estaría más visible en el HUD, pero cambiar `GameShell` toca a los cinco juegos.

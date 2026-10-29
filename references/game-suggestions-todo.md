# TODO — Sugerencias de juegos

Lista de juegos que la gente ha sugerido para Arcade Vault. La mantiene el agente `game-planner`: añade cada sugerencia nueva y actualiza su estado cuando se evalúa, se elige, se descarta o se implementa.

**Estados:** `[ ]` pendiente de evaluar · `[~]` evaluado / en estudio · `[x]` implementado · `[-]` descartado

## Pendientes

<!-- - [ ] **TÍTULO o idea** — sugerido por: <quién> · fecha: AAAA-MM-DD · notas: <descripción breve> -->

## En estudio

- [~] **INVASORES** (`invasores`) ★ recomendado — sugerido por: game-planner · fecha: 2026-10-29 · notas: shooter de oleadas que sustituye al simulado; multiplicador de racha x1–x5 que se reinicia al fallar, escudos destructibles, cada oleada cambia de patrón y acelera. Coste medio-bajo; refuerza SHOOTER (solo ROCAS es real). Decidir si se vacían las 12 puntuaciones simuladas.
- [~] **RANARIA** (`ranaria`) — sugerido por: game-planner · fecha: 2026-10-29 · notas: cruzar carriles y río hasta los nenúfares; carriles que cambian de sentido por nivel y nenúfar dorado con bonus. Coste medio; puntuación a saltos.
- [~] **DUELO PIXEL** (`duelo-pixel`) — sugerido por: game-planner · fecha: 2026-10-29 · notas: paletas contra la CPU en modo supervivencia (la pelota acelera y se divide, puntos por rebote). Coste bajo, pero hay que rediseñar la puntuación y el modo de 2 jugadores no encaja con el TOP 10.
- [~] **GLOTÓN** (`gloton`) — sugerido por: game-planner · fecha: 2026-10-29 · notas: laberinto con puntos y cuatro perseguidores; la píldora invierte el laberinto. Coste alto (tilemap, movimiento por casillas, 4 IA).

### Lote de 20 propuestas nuevas (game-planner, 2026-10-29)

**ARCADE**

- [~] **ÓRBITA** (`orbita`) ★ top ARCADE — sugerido por: game-planner · fecha: 2026-10-29 · notas: magenta · coste bajo. Una chispa gira alrededor de un núcleo y salta entre 3 anillos para esquivar fragmentos; cada salto invierte el giro y el núcleo crece hasta tragarse el anillo interior.
- [~] **PÉNDULO** (`pendulo`) — sugerido por: game-planner · fecha: 2026-10-29 · notas: cyan · coste medio. Engancharse y soltarse de anclas para subir por un pozo infinito; el cable se acorta en cada enganche y se recupera soltándose en lo alto del arco.
- [~] **PRISMA** (`prisma`) — sugerido por: game-planner · fecha: 2026-10-29 · notas: magenta · coste bajo. Cambiar de color (4 teclas) para cruzar compuertas del mismo tono; las compuertas mezcladas exigen alternar colores.
- [~] **IMÁN** (`iman`) — sugerido por: game-planner · fecha: 2026-10-29 · notas: yellow · coste medio. Cambiar de polaridad para atraer o repeler chatarra; lo que repeles destruye drones en cadena y cargar demasiado te vuelve lento.
- [~] **DERRUMBE** (`derrumbe`) — sugerido por: game-planner · fecha: 2026-10-29 · notas: yellow · coste bajo. Recoger gemas en una cuadrícula cuyas baldosas caen poco después de pisarlas; vuelven en oleadas con formas nuevas.

**SHOOTER**

- [~] **FARO** (`faro`) ★ top SHOOTER — sugerido por: game-planner · fecha: 2026-10-29 · notas: cyan · coste bajo. Torreta central que gira 360° contra enjambres desde los 4 bordes; escudo de 8 sectores que se reactiva encadenando 3 bajas por el mismo lado.
- [~] **ECO LÁSER** (`eco-laser`) — sugerido por: game-planner · fecha: 2026-10-29 · notas: magenta · coste medio. Solo 6 disparos; los que fallan rebotan en el techo y vuelven: si los atrapas, recuperas munición; si te tocan, pierdes una vida. Parecido a INVASORES.
- [~] **CÚPULA** (`cupula`) — sugerido por: game-planner · fecha: 2026-10-29 · notas: yellow · coste medio. Defender 3 cúpulas con pulsos detonados por una mira de teclado; los misiles atrapados en un pulso explotan en cadena y suben un multiplicador.
- [~] **GEMELAS** (`gemelas`) — sugerido por: game-planner · fecha: 2026-10-29 · notas: cyan · coste medio. Dos naves en espejo con las mismas teclas en sentido contrario; un impacto doble simultáneo vale x5.
- [~] **ENJAMBRE** (`enjambre`) — sugerido por: game-planner · fecha: 2026-10-29 · notas: magenta · coste alto. Bullet-hell ligero; rozar las balas carga un pulso que las convierte en puntos.

**PUZZLE**

- [~] **NÚCLEO** (`nucleo`) ★ top PUZZLE — sugerido por: game-planner · fecha: 2026-10-29 · notas: magenta · coste medio. Girar 3 anillos para alinear 3 segmentos del mismo color en un radio; las purgas cargan una onda que limpia el anillo exterior y multiplica la puntuación.
- [~] **ESPECTRO** (`espectro`) — sugerido por: game-planner · fecha: 2026-10-29 · notas: yellow · coste medio. Caen parejas de gotas de colores primarios que se funden en secundarios; solo desaparecen grupos de 3 o más del mismo secundario.
- [~] **CIRCUITO** (`circuito`) — sugerido por: game-planner · fecha: 2026-10-29 · notas: cyan · coste medio. Colocar y girar piezas de cable antes de que llegue la chispa; cerrar un bucle lo borra y da multiplicador.
- [~] **CIFRA** (`cifra`) — sugerido por: game-planner · fecha: 2026-10-29 · notas: green · coste bajo. Filas de dígitos que suben desde el suelo; las cadenas que suman 10 se eliminan y cuanto más larga la cadena, más multiplicador. Hay un comodín «0».
- [~] **MECHA** (`mecha`) — sugerido por: game-planner · fecha: 2026-10-29 · notas: yellow · coste medio. Girar bombas direccionales y detonar reacciones en cadena con puntuación exponencial antes de que se desborde la rejilla.

**Géneros nuevos**

- [~] **AZOTEA** (`azotea`) ★ top géneros nuevos — sugerido por: game-planner · fecha: 2026-10-29 · notas: PLATAFORMAS (categoría nueva) · cyan · coste bajo. Runner por azoteas en el que solo controlas el salto; cambias de fase cyan/magenta y solo pisas las plataformas de tu color.
- [~] **REBUFO** (`rebufo`) — sugerido por: game-planner · fecha: 2026-10-29 · notas: CARRERAS (categoría nueva) · cyan · coste medio. Autopista con scroll vertical; ir pegado tras otro coche carga turbo y adelantar con él multiplica la puntuación.
- [~] **PULSO** (`pulso`) — sugerido por: game-planner · fecha: 2026-10-29 · notas: RITMO (categoría nueva) · magenta · coste medio. Anillos por 4 carriles hacia un núcleo que late; el ritmo es visual y el tempo se adapta a tu racha.
- [~] **CANASTA NEÓN** (`canasta`) — sugerido por: game-planner · fecha: 2026-10-29 · notas: DEPORTES (categoría nueva) · yellow · coste bajo. Tiros libres en 60 s con barras de ángulo y potencia; el aro se mueve y las canastas limpias suman tiempo y activan el modo «EN LLAMAS».
- [~] **EMPUJE** (`empuje`) — sugerido por: game-planner · fecha: 2026-10-29 · notas: VERSUS · magenta · coste medio. Sumo de discos contra la CPU; el ring encoge en cada ronda y cada rival tiene una IA distinta. Puede sustituir la idea de DUELO PIXEL.

## Implementados

## Descartados

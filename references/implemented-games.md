# Juegos implementados

Catálogo de juegos registrados en la tabla `games` de Supabase (proyecto `kzkpuodqsexbszdlehap`), ordenados por `sort_order`. Consultado el 2026-10-29.

- **Real**: juego jugable en canvas, con ruta estática `app/games/<id>/play/page.tsx`.
- **Simulado**: usa el reproductor simulado de `app/games/[id]/play/page.tsx`.

## Resumen

| #   | Id              | Título        | Categoría | Color   | Estado    | Motor                  | Componente                            |
| --- | --------------- | ------------- | --------- | ------- | --------- | ---------------------- | ------------------------------------- |
| 1   | `bloque-buster` | BLOQUE BUSTER | ARCADE    | cyan    | Real      | `lib/games/arkanoid/`  | `components/games/arkanoid-game.tsx`  |
| 2   | `caida`         | CAÍDA         | PUZZLE    | magenta | Real      | `lib/games/tetris/`    | `components/games/tetris-game.tsx`    |
| 3   | `serpentina`    | SERPENTINA    | ARCADE    | green   | Real      | `lib/games/snake/`     | `components/games/snake-game.tsx`     |
| 4   | `gloton`        | GLOTÓN        | ARCADE    | yellow  | Simulado  | —                      | —                                     |
| 5   | `invasores`     | INVASORES     | SHOOTER   | green   | Simulado  | —                      | —                                     |
| 6   | `rocas`         | ROCAS         | SHOOTER   | yellow  | Real      | `lib/games/asteroids/` | `components/games/asteroids-game.tsx` |
| 7   | `ranaria`       | RANARIA       | ARCADE    | green   | Simulado  | —                      | —                                     |
| 8   | `duelo-pixel`   | DUELO PIXEL   | VERSUS    | cyan    | Simulado  | —                      | —                                     |

Total: 8 juegos (4 reales, 4 simulados).

## Detalle

### 1. BLOQUE BUSTER (`bloque-buster`)

- **Categoría:** ARCADE · **Portada:** `cover-bricks` · **Color:** cyan · **Estado:** Real
- **Descripción corta:** Rebota la pelota y destruye muros de neón.
- **Descripción:** Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?

### 2. CAÍDA (`caida`)

- **Categoría:** PUZZLE · **Portada:** `cover-tetro` · **Color:** magenta · **Estado:** Real
- **Descripción corta:** Encaja las piezas antes de que el techo te aplaste.
- **Descripción:** Ocho piezas caen desde la oscuridad, incluida una tuerca hueca que no perdona. Gíralas, encájalas y limpia líneas para sobrevivir; cada 10 líneas la caída se acelera sin piedad.

### 3. SERPENTINA (`serpentina`)

- **Categoría:** ARCADE · **Portada:** `cover-snake` · **Color:** green · **Estado:** Real
- **Descripción corta:** Crece sin morder tu propia cola.
- **Descripción:** Una serpiente de luz recorre la grilla devorando fruta pixelada. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.

### 4. GLOTÓN (`gloton`)

- **Categoría:** ARCADE · **Portada:** `cover-glot` · **Color:** yellow · **Estado:** Simulado
- **Descripción corta:** Devora puntos y escapa de los fantasmas.
- **Descripción:** Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.

### 5. INVASORES (`invasores`)

- **Categoría:** SHOOTER · **Portada:** `cover-invaders` · **Color:** green · **Estado:** Simulado
- **Descripción corta:** Defiende el planeta de filas alienígenas.
- **Descripción:** Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.

### 6. ROCAS (`rocas`)

- **Categoría:** SHOOTER · **Portada:** `cover-rocas` · **Color:** yellow · **Estado:** Real
- **Descripción corta:** Pulveriza asteroides en gravedad cero.
- **Descripción:** Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el horizonte.

### 7. RANARIA (`ranaria`)

- **Categoría:** ARCADE · **Portada:** `cover-rana` · **Color:** green · **Estado:** Simulado
- **Descripción corta:** Cruza la autopista de pixeles.
- **Descripción:** Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.

### 8. DUELO PIXEL (`duelo-pixel`)

- **Categoría:** VERSUS · **Portada:** `cover-duelo` · **Color:** cyan · **Estado:** Simulado
- **Descripción corta:** Dos paletas. Una pelota. Reflejos máximos.
- **Descripción:** El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.

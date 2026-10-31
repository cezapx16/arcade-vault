# Template de spec de juego

Plantilla de `specs/NN-juego-<slug>.md` para `/add-game`. Es el template de `/spec` (`.claude/skills/spec/template.md`) aplicado a un juego de Arcade Vault, con la forma de las SPEC 05 y 06.

Cómo usarlo:

- Lo que va entre `<…>` se sustituye por datos reales: nombres de archivo, constantes, puntos, teclas. Nunca se deja un `<…>` en la spec final.
- Los bloques marcados **[si …]** solo se incluyen cuando se cumple la condición. Si no se cumple, se quitan, y la razón va en Decisiones.
- Las líneas que ya vienen escritas son las que se repiten en todos los juegos. Se ajustan al juego (teclas, valores iniciales, textos) pero no se eliminan sin una decisión explícita.
- Si una spec de juego posterior a la 05 cambió algún contrato, manda esa spec sobre este template.

---

````markdown
# SPEC NN — Juego <NOMBRE ORIGINAL> en <TÍTULO DEL CATÁLOGO>

> **Estado:** Draft
> **Depende de:** SPEC 05, SPEC 06<, SPEC XX si cambió un contrato>
> **Fecha:** <AAAA-MM-DD, leída del contexto de la sesión>
> **Objetivo:** <Una sola frase: portar/crear <juego> y hacerlo jugable en `/games/<id>/play`, integrado con el HUD, la pausa, el modal de fin y el ranking de la plataforma.>

## Por qué existe esta spec

<Párrafo 1: qué hay hoy en `/games/<id>/play` (la partida simulada de `GamePlayer`) o que el juego no existe en el catálogo.>

<Párrafo 2, [si viene de referencia]: qué tiene `references/started-games/<carpeta>/` (archivos, líneas de `game.js`, resolución) y por qué no se puede usar tal cual: script global, `getElementById`, listeners que no se quitan, HUD y overlays propios, reinicio con tecla, aspecto distinto de 4:3, assets…>

<Párrafo 2, [si viene de una descripción]: el juego que pidió el usuario en una o dos frases: género, objetivo y por qué encaja en el catálogo.>

<Párrafo 3: qué consigue esta spec. El leaderboard se hereda de la SPEC 06 sin código nuevo.>

## Alcance

**Entra:**

- <Port 1:1 de `game.js` / Motor nuevo> en TypeScript en `lib/games/<motor>/`, sin React. Reglas: <lista con números: tamaño del tablero, velocidades, puntos por acción, vidas, cómo se sube de nivel, power-ups>.
- API del motor `create<Motor>Game(canvas, callbacks)`, que devuelve `pause / resume / restart / end / destroy`. `destroy` cancela el `requestAnimationFrame` y quita todos los listeners.
- El motor avisa a React solo cuando cambian `score`, `lives` o `level`, y una vez en game over.
- Del canvas se quitan <HUD de puntuación, vidas y nivel, overlays de pausa y game over, reinicio con <tecla>>. Se mantiene <lo que es jugabilidad: pieza siguiente, indicador de power-up…>.
- `preventDefault` en <teclas> mientras se juega, para que la página no haga scroll. Nunca se aplica con el foco en un `input` o `textarea`.
- Al pausar se limpian las teclas pulsadas.
- Resolución lógica fija de <W>×<H> (4:3), escalada con CSS al `.crt-screen`, con el buffer multiplicado por `devicePixelRatio`. <[si la referencia no es 4:3] Cómo se colocan el tablero y lo que estaba fuera del canvas.>
- Paleta neón de la plataforma con glow (`shadowBlur`), diseñada con `/frontend-design`.
- Componente cliente `components/games/<motor>-game.tsx`, que monta el canvas, crea y destruye el motor y conecta su estado con `GameShell`.
- Ruta estática `app/games/<id>/play/page.tsx`, que tiene prioridad sobre `app/games/[id]/play/page.tsx`. La ruta genérica no se toca.
- Pausa por tres vías con un único estado de React: botón PAUSA/REANUDAR, teclas `P`/`Escape` y `visibilitychange`.
- Fin de partida: `onGameOver(score)` abre el modal "FIN DEL JUEGO". FIN llama a `end()` y JUGAR DE NUEVO a `restart()`.
- GUARDAR PUNTUACIÓN usa `submitScore` (heredado de `GameShell`). La puntuación aparece en el TOP 10 de `/games/<id>` y en la pestaña <TÍTULO> de `/salon`.
- Mando táctil (SPEC 10): el motor expone `input(action, pressed)` y traduce cada acción (`up/down/left/right/a/b`) a su tecla, pasando por la misma función que el teclado. El componente define su `TouchLayout` (cruceta <flechas>, botones <A: …, B: …>, autorrepetición <sí/no>) y pasa `controls={touch && <TouchPad … />}` a `GameShell`.
- **[si sustituye a un simulado]** El juego ocupa la entrada `<id>` del catálogo. <Se conservan las puntuaciones del seed / Se vacían con una migración>. <[si cambian] Textos `short`/`long` nuevos en `games` y en `GAMES`.>
- **[si es un juego nuevo]** Fila `<id>` en `games` por migración, entrada de respaldo en `GAMES`, cover `.cover-<nombre>` diseñada con `/frontend-design`, y <seed de 12 puntuaciones / ranking vacío>.
- **[si hay assets]** <Sprites/sonidos> copiados a `public/games/<id>/` y cargados por el motor antes de arrancar.
- **[si se extrae un hook compartido]** Hook `<nombre>` en `<ruta>`, extraído de `asteroids-game.tsx`, con pausa, `visibilitychange`, detección de teclado y ciclo de vida del motor. ROCAS y este juego lo usan.
- **[si se amplía el HUD]** Métrica opcional `<nombre>` en `GameShell` (por ejemplo LÍNEAS). Los juegos que no la pasan se ven igual.

**Fuera de alcance (specs futuras):**

- <Gestos táctiles propios del juego, si no entran.>
- <Sonido, música o mute, si no entran.>
- <Mecánicas que no están en la referencia o que no se acordaron.>
- Cambios en los demás juegos simulados.
- Auth real y antitrampas (siguen como en la SPEC 06).
- Instalar un test runner o escribir tests del motor.

## Modelo de datos

<[si no hay migraciones] No se persiste nada nuevo: las puntuaciones van a la tabla `scores` de la SPEC 06. Las estructuras nuevas son la API del motor <y la ampliación del shell>.>

### Motor (`lib/games/<motor>/engine.ts`)

```ts
export type <Motor>Callbacks = {
  onScore: (score: number) => void; // solo cuando cambia
  onLives: (lives: number) => void; // solo cuando cambia
  onLevel: (level: number) => void; // solo cuando cambia
  onGameOver: (score: number) => void; // una vez por partida
};

export type <Motor>Game = {
  pause: () => void; // detiene el loop y limpia las teclas pulsadas
  resume: () => void; // reanuda sin salto de dt (reinicia lastTime)
  restart: () => void; // reinicia y vuelve a emitir score/lives/level iniciales
  end: () => void; // fuerza game over con la puntuación actual → onGameOver
  destroy: () => void; // cancela rAF y quita listeners; idempotente
};

export function create<Motor>Game(
  canvas: HTMLCanvasElement,
  callbacks: <Motor>Callbacks,
): <Motor>Game;
```

- Estado interno: `state: <"playing" | … | "gameover">`. En `gameover` el motor ignora la entrada y no aplica `preventDefault`.
- `dt` limitado a <50> ms. <Acumuladores de caída, tiempos de respawn, etc.>
- Al crearse emite `onScore(0)`, `onLives(<n>)` y `onLevel(1)`.
- <[si hay victoria] Al superar el último nivel: <onGameOver(score) / vuelve al nivel 1 con multiplicador <x>>.>

### Archivos del motor

| Archivo                          | Contenido                                                                   |
| -------------------------------- | --------------------------------------------------------------------------- |
| `lib/games/<motor>/constants.ts` | `W`, `H`, <constantes de reglas>, `PALETTE` y `GLOW`                        |
| `lib/games/<motor>/entities.ts`  | <Clases y utilidades>. `draw(ctx)` recibe el contexto en lugar de un global |
| `lib/games/<motor>/engine.ts`    | Estado, entrada, `update`, `draw`, loop y `create<Motor>Game`               |

`PALETTE` usa los hex de los tokens de `app/globals.css`, porque el canvas no lee variables CSS. Los colores finales los decide `/frontend-design`, partiendo de esta propuesta:

```ts
export const PALETTE = {
  bg: "#000",
  <elemento>: "<hex>", // --<token>
} as const;
```

**[si se amplía el HUD]**

```ts
type GameShellProps = {
  // …igual que en la SPEC 05
  hud: { score: number; lives: number; level: number; <extra>?: number };
};
```

**[si es un juego nuevo]**

### Catálogo (`supabase/migrations/<AAAAMMDDhhmmss>_game_<id>.sql`)

```sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order) values
  ('<id>', '<TÍTULO>', '<short>', '<long>', '<CAT>', 'cover-<nombre>', '<color>', <n>)
on conflict (id) do nothing;
```

- La misma entrada se añade a `GAMES` de `app/data/games.ts`, en la posición <n>.
- **[si hay seed]** `supabase/migrations/<AAAAMMDDhhmmss>_seed_scores_<id>.sql` con 12 filas (`name` en mayúsculas, de 1 a 10 caracteres).
- No cambia el esquema: `lib/supabase/database.types.ts` no se regenera.

**[si sustituye y se vacían las puntuaciones]**

### Reset de puntuaciones (`supabase/migrations/<AAAAMMDDhhmmss>_reset_scores_<id>.sql`)

```sql
delete from public.scores where game_id = '<id>';
```

### Estructura final

```
app/games/<id>/play/page.tsx              (nuevo)
components/games/<motor>-game.tsx         (nuevo)
lib/games/<motor>/constants.ts            (nuevo)
lib/games/<motor>/entities.ts             (nuevo)
lib/games/<motor>/engine.ts               (nuevo)
app/globals.css                           (<estilos del canvas / cover nueva>)
<supabase/migrations/…sql                 (nuevo)>
<app/data/games.ts                        (modificado: entrada nueva / textos)>
<public/games/<id>/…                      (nuevo)>
<components/games/game-shell.tsx          (modificado: métrica opcional)>
<hook compartido y asteroids-game.tsx     (nuevo / modificado)>
```

## Plan de implementación

<Cada paso deja el sistema funcionando y es un commit. Quita los pasos que no aplican y renumera.>

1. **[si se extrae un hook compartido] Extraer el hook.**
   - Mover de `asteroids-game.tsx` a `<ruta>` la pausa, `visibilitychange`, la detección de teclado y el ciclo de vida del motor.
   - Resultado: `/games/rocas/play` se ve y funciona igual. `npm run build` y `npm run lint` pasan.
2. **[si es nuevo o se vacían las puntuaciones] Catálogo en Supabase.**
   - Crear la(s) migración(es), aplicarlas con `apply_migration` (nombre `<…>`) y revisar `get_advisors`.
   - [si es nuevo] Añadir la entrada a `GAMES` y la cover `.cover-<nombre>` en `app/globals.css` con `/frontend-design`.
   - Comprobar con `execute_sql` <la fila en `games` / que `scores` no tiene filas de `<id>`>.
   - Resultado: <el juego aparece en `/games` con la partida simulada / su ranking muestra "SIN PUNTUACIONES TODAVÍA">.
3. **Portar el motor a TypeScript.**
   - Crear `constants.ts`, `entities.ts` y `engine.ts` con las reglas <1:1 de `game.js` / acordadas>, y los colores originales en este paso.
   - Entrada con listeners en `window`, registrados en la factoría y quitados en `destroy`. `preventDefault` según el alcance.
   - Quitar del canvas el HUD, los overlays y el reinicio con tecla.
   - Implementar `pause / resume / restart / end / destroy`, los callbacks y el escalado HiDPI.
   - Todavía no lo usa nadie. Resultado: `npm run build` y `npm run lint` pasan.
4. **Componente y ruta.**
   - Crear `components/games/<motor>-game.tsx` (`"use client"`), <con el hook compartido / con el patrón de `asteroids-game.tsx`>. Debe funcionar con el doble montaje de StrictMode.
   - Crear `app/games/<id>/play/page.tsx` con `getGame("<id>")`.
   - Resultado: el juego es jugable de principio a fin y GUARDAR PUNTUACIÓN crea una fila en `scores`.
5. **Paleta neón.**
   - Usar `/frontend-design` para fijar `PALETTE` y el glow, y aplicarlos en `entities.ts` y `engine.ts`.
6. **Mando táctil.**
   - `input(action, pressed)` en el motor, con un mapa acción → tecla y la función compartida con el teclado.
   - `TouchLayout` en el componente y `controls={touch && <TouchPad layout={TOUCH} onInput={input} disabled={paused || over} />}`.
7. **Verificación final.**
   - `npm run build` y `npm run lint`.
   - Recorrer los criterios de aceptación con el MCP de Playwright y el de Supabase.
   - Partida manual completa (el usuario).

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `app/games/[id]/play/page.tsx` no aparece en `git diff`.
- [ ] `/games/<otro simulado>/play` se ve y se comporta igual que antes.
- [ ] **[si hay hook o cambia el shell]** `/games/rocas/play` funciona igual que antes.
- [ ] `/games/<id>/play` muestra un `<canvas>` dentro de `.crt-screen` que ocupa todo el ancho manteniendo 4:3, sin errores en consola.
- [ ] Al iniciar, el HUD de React muestra PUNTUACIÓN 0, VIDAS <…> y NIVEL 01, y el canvas no dibuja <lo que se quitó>.
- [ ] <Un criterio por regla de puntuación, con números: "Al <acción>, la PUNTUACIÓN sube <n>".>
- [ ] <Criterio de vidas y criterio de subida de nivel, con números.>
- [ ] <Criterios de mecánicas propias: power-ups, pieza siguiente, victoria…>
- [ ] Pulsar <teclas> no hace scroll en la página.
- [ ] PAUSA congela el canvas y muestra "EN PAUSA". REANUDAR continúa sin saltos. `P` y `Escape` hacen lo mismo.
- [ ] Mantener una tecla de movimiento, pausar, soltarla y reanudar: no se sigue moviendo.
- [ ] Cambiar de pestaña y volver: el juego está en pausa.
- [ ] Al perder <la última vida / la partida> se abre "FIN DEL JUEGO" con la puntuación final. FIN hace lo mismo con la puntuación actual.
- [ ] Con el modal abierto se pueden escribir iniciales con espacios.
- [ ] GUARDAR PUNTUACIÓN muestra "GUARDANDO…" y luego "▸ PUNTUACIÓN GUARDADA_", y aparece una fila nueva en `scores` con `game_id = '<id>'`.
- [ ] Una puntuación que entra en el TOP 10 aparece en `/games/<id>` y en la pestaña <TÍTULO> de `/salon` sin recargar la caché, y coincide con `leaderboard('<id>', 10)`.
- [ ] JUGAR DE NUEVO cierra el modal y empieza una partida nueva con los valores iniciales.
- [ ] Al navegar a otra página, pulsar <teclas> no lanza errores y la página hace scroll con normalidad.
- [ ] Con emulación táctil en Playwright (`hasTouch`), `/games/<id>/play` muestra el `<canvas>` y el mando con <flechas y botones>, y cada botón hace lo mismo que su tecla. En escritorio no hay mando.
- [ ] Los elementos usan los colores de `PALETTE`, y el canvas se ve nítido con `devicePixelRatio` 2.
- [ ] **[si es nuevo]** `select * from games where id = '<id>'` devuelve la fila. `/games` lo muestra en la posición <n> y con el filtro <CAT>. Sin las variables de Supabase sale del respaldo con MEJOR PUNTUACIÓN 0.
- [ ] **[si es nuevo]** La cover `.cover-<nombre>` se ve en la tarjeta de `/games`, en la ficha y <en la home si está entre los 6 primeros>.
- [ ] **[si se vacían]** Tras la migración, `/games/<id>` y su pestaña de `/salon` muestran "SIN PUNTUACIONES TODAVÍA".

## Decisiones

<Una línea por decisión: **Sí:** lo elegido. **No:** lo descartado. Y quién lo decidió.>

- **Sí:** <origen: port 1:1 de `references/started-games/<carpeta>` / diseño a partir de la descripción del usuario>. Elegido por el usuario.
- **Sí:** <sustituir `<id>` / juego nuevo `<id>`>. **No:** <la otra opción>. <Elegido por el usuario / Tomado de las recomendaciones>.
- **Sí:** <puntuaciones: conservar / vaciar / seed / ranking vacío>. <…>
- **Sí:** <HUD: mapear / ampliar `GameShell` / dibujar en canvas>. <…>
- **Sí:** <encaje en 4:3>. <…>
- **Sí:** <assets y sonido>. <…>
- **Sí:** <hook compartido ahora / después>. <…>
- **Sí:** el leaderboard se hereda de `GameShell` + `submitScore` + `getLeaderboard`. **No:** código de ranking propio del juego.
- **Sí:** ruta estática `app/games/<id>/play/page.tsx`. **No:** un `if` en la ruta genérica.
- **Sí:** motor en `lib/games/<motor>/` y componente en `components/games/`, como ROCAS.
- **Sí:** paleta neón con glow, diseñada con `/frontend-design`. Exigido por `CLAUDE.md`.
- **Sí:** los callbacks solo se emiten cuando cambia el valor, para no provocar un render de React en cada frame.

## Riesgos

| Riesgo                                                                     | Mitigación                                                                                     |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Listeners o `requestAnimationFrame` que sobreviven al desmontar            | `destroy` idempotente y criterio de navegación sin errores; StrictMode lo prueba en desarrollo |
| `preventDefault` impide escribir las iniciales en el modal                 | No se aplica con foco en `input`/`textarea` ni en `gameover`                                   |
| Salto de `dt` al reanudar o al volver de otra pestaña                      | `resume` reinicia `lastTime` y `dt` limitado                                                   |
| Renders de React a 60 fps                                                  | Callbacks solo cuando cambia el valor                                                          |
| `matchMedia` en SSR provoca un hydration mismatch                          | `useSyncExternalStore` con snapshot de servidor `false`                                        |
| <`shadowBlur` con muchos objetos baja los FPS>                             | <Glow solo en los elementos principales>                                                       |
| <[si no es 4:3] El tablero recolocado cambia la sensación de juego>        | <Tamaño de celda y márgenes fijados en la spec>                                                |
| <[si hay assets] El juego arranca antes de que carguen los sprites>        | <El motor espera a la carga antes del primer frame>                                            |
| <[si es nuevo] El catálogo cacheado no muestra el juego tras la migración> | <Reiniciar `next dev`; en producción entra con el build>                                       |

## Lo que **no** entra en esta spec

- <Gestos táctiles, si no entran.>
- <Sonido / mute, si no entra.>
- <Mecánicas nuevas.>
- Cambios en los demás juegos simulados.
- Auth, antitrampas y test runner.

Cada una de estas cosas, si llega, irá en su propia spec.
````

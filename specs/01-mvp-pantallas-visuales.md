# SPEC 01 — MVP visual de Arcade Vault

> **Estado:** implementado
> **Depende de:** —
> **Fecha:** 2026-10-16
> **Objetivo:** Implementar en Next.js las cinco pantallas del prototipo de `references/` (Biblioteca, Detalle, Reproductor, Login y Salón de la Fama) con datos ficticios y sin juegos reales.

## Por qué existe esta spec

El prototipo de `references/` es una SPA en React 18 con Babel en el navegador, navegación por hash y estado global en `app.jsx`. Hay que llevarlo al stack real (Next.js 16 App Router, React 19, TypeScript y Tailwind v4) sin perder fidelidad visual.

Los archivos de `references/` están cruzados: el nombre de cada archivo no coincide con su contenido. El JSX de **Detalle** (`GameDetail`) y de **Auth** no existe, solo sus estilos. Esas dos pantallas se reconstruyen a partir de sus clases CSS (`.av-detail`, `.stat-strip`, `.leaderboard`, `.lb-row`, `.auth-card`, `.auth-tabs`, `.field`, `.auth-divider`, `.social`).

Mapa real de `references/`:

| Archivo          | Contenido real                       |
| ---------------- | ------------------------------------ |
| `app.jsx`        | Biblioteca (`Library`, `GameCard`)   |
| `nav.jsx`        | HTML de entrada                      |
| `data.jsx`       | Salón de la Fama (`HallOfFame`)      |
| `salon.jsx`      | Duplicado de `data.jsx`              |
| `Arcade Vault.html` | Datos (`GAMES`, `CATS`, `PLAYERS`, `seededScores`) |
| `auth.jsx`       | Shell (`App`: rutas, sesión, footer) |
| `detalle.jsx`    | Navbar (`Nav`)                       |
| `reproductor.jsx`| Reproductor (`GamePlayer`)           |
| `styles.css`     | Duplicado de `reproductor.jsx`       |
| `biblioteca.jsx` | CSS completo (ya portado a `app/globals.css`) |

## Alcance

**Entra:**

- Un layout común con Nav (escritorio y menú móvil por debajo de 840px), `<main className="av-main">` y footer.
- Ruta `/`: Biblioteca con hero, buscador por nombre, chips de categoría, grid de cards con inclinación 3D y estado "NO HAY RESULTADOS".
- Ruta `/juegos/[id]`: Detalle del juego, reconstruido.
- Ruta `/juegos/[id]/jugar`: Reproductor con partida simulada igual que la referencia. Incluye HUD con puntuación automática, PAUSA/REANUDAR, FIN, SALIR, arena CRT animada y modal "FIN DEL JUEGO".
- Ruta `/salon`: Salón de la Fama con pestañas por juego, podio, tabla de 12 filas y la fila "TU MEJOR MARCA" cuando hay sesión.
- Ruta `/login`: Auth con pestañas ENTRAR/REGISTRO, reconstruida.
- `app/not-found.tsx` con estilo arcade para ids inexistentes y rutas desconocidas.
- Sesión de prueba en `localStorage` (`av_user`) y guardado de puntuaciones de prueba (`av_scores`).
- Datos ficticios tipados en `app/data/`.
- Todos los efectos visuales de la referencia: inclinación 3D de las cards, `flicker`, cursor `blink`, enemigos `drift`, entrada en cascada de las filas del Salón y `fade-in` de pantallas.

**Fuera de alcance (specs futuras):**

- Cualquier juego real o lógica de juego.
- Backend, base de datos, API o autenticación real (OAuth, contraseñas o validación de servidor).
- Leer `av_scores` para mostrar puntuaciones guardadas en Detalle o Salón.
- Sistema de créditos funcional: "CRÉDITOS · 03" es decorativo.
- Menú desplegable de usuario.
- Test runner (Vitest o Playwright).
- Borrar los SVG del scaffold en `public/`.

## Modelo de datos

Todo vive en `app/data/`. Al no tener `page.tsx`, esa carpeta no genera rutas. Es la fuente provisional que en el futuro sustituirá una base de datos, así que las pantallas solo consumen sus exports.

```ts
// app/data/games.ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export type Game = {
  id: string;          // slug, usado en /juegos/[id]
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: `cover-${string}`; // clase CSS de portada existente en globals.css
  color: GameColor;    // color del botón JUGAR
  best: number;
  plays: string;       // "12.4K"
};

export const GAMES: Game[];                 // los 8 juegos de la referencia, mismos valores
export const CATS: ("TODOS" | GameCategory)[]; // ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]
export function getGame(id: string): Game | undefined;
```

```ts
// app/data/scores.ts
export type ScoreRow = { rank: number; name: string; score: number; date: string }; // date "DD/MM/2026"

export const PLAYERS: string[];  // los 18 alias de la referencia
export function seededScores(seed: number, count?: number): ScoreRow[]; // mismo algoritmo determinista
export function seedFor(gameId: string): number; // gameId.length * 23 + 7, igual que la referencia
```

```ts
// lib/session.ts (solo cliente)
export type User = { name: string };
export type SavedScore = { game: string; score: number; name: string; at: number };
// Claves de localStorage: "av_user" (User | null) y "av_scores" (SavedScore[]).
// Expone useUser(), signIn(user), signOut() y saveScore(entry).
// Todo el acceso a localStorage va envuelto en try/catch.
```

Convenciones:

- Los números se formatean con `toLocaleString("es-ES")`.
- Los rangos se muestran con dos dígitos: `#01` y `01`.

## Plan de implementación

1. **Datos.** Crear `app/data/games.ts` y `app/data/scores.ts` con los tipos y valores de la referencia. Comprobar que `npm run build` compila.
2. **Sesión.** Crear `lib/session.ts`. `useUser()` usa `useSyncExternalStore`, con snapshot de servidor `null`, para evitar errores de hidratación. `signIn` y `signOut` notifican a los suscriptores.
3. **Shell.** Crear `components/nav.tsx` (client: `usePathname` para el enlace activo, menú móvil y botón de usuario o "Iniciar Sesión") y `components/footer.tsx`. Integrarlos en `app/layout.tsx` alrededor de `<main className="av-main">`. Hacer clic en el nombre de usuario cierra la sesión, igual que en la referencia. Biblioteca queda activa en `/` y `/juegos/*`.
4. **Biblioteca.** Reemplazar el `app/page.tsx` del scaffold:
   - Hero como Server Component.
   - `components/library-browser.tsx` (client) con búsqueda, chips y grid.
   - `components/game-card.tsx` (client) con inclinación 3D mediante ref y `Link` a `/juegos/[id]`.
5. **Detalle y 404.**
   - `app/juegos/[id]/page.tsx` con `generateStaticParams` sobre `GAMES` (Cache Components exige al menos un param). `params` es una Promise y un id inexistente llama a `notFound()`.
   - Layout `.av-detail`. A la izquierda va `.detail-cover` con la clase de portada. A la derecha, `.detail-info` con `h2`, `.detail-tags` (categoría y "1 JUGADOR"), descripción larga, `.stat-strip` (MEJOR PUNTUACIÓN, PARTIDAS, CATEGORÍA) y `.detail-actions` con **JUGAR AHORA** (`/juegos/[id]/jugar`) y **VER SALÓN** (`/salon`).
   - `components/leaderboard.tsx` (`.leaderboard`/`.lb-row`, top 10 de `seededScores(seedFor(id), 10)`, clases `top1`–`top3`).
   - `app/not-found.tsx` con "GAME OVER · JUEGO NO ENCONTRADO" y un botón a `/`.
6. **Reproductor.** `app/juegos/[id]/jugar/page.tsx` (server: valida el id con `generateStaticParams` y `notFound()`) renderiza `components/game-player.tsx` (client). Es una copia funcional de `reproductor.jsx`:
   - El intervalo de 220 ms suma puntos y sube de nivel.
   - PAUSA muestra el overlay "EN PAUSA". FIN abre el modal. SALIR vuelve a `/juegos/[id]`.
   - En el modal, el input de iniciales va en mayúsculas con un máximo de 10. Por defecto muestra el nombre del usuario o "INVITADO".
   - GUARDAR PUNTUACIÓN llama a `saveScore` y muestra "▸ PUNTUACIÓN GUARDADA_".
   - JUGAR DE NUEVO reinicia la partida y VOLVER AL VAULT lleva a `/`.
7. **Login.** `app/login/page.tsx` + `components/auth-card.tsx` (client):
   - `.auth-header` con `.mark` y el título "ACCESO AL VAULT".
   - Pestañas ENTRAR (usuario y contraseña) y REGISTRO (usuario, email, contraseña y confirmación).
   - Botón principal ENTRAR o CREAR CUENTA, `.auth-divider` "O CONTINÚA CON" y `.social` con GOOGLE y GITHUB.
   - Enviar el formulario (campos `required`) o pulsar un botón social llama a `signIn({ name })`, con el usuario en mayúsculas o "JUGADOR_1" en los sociales, y redirige a `/`.
8. **Salón de la Fama.** `app/salon/page.tsx` + `components/hall-of-fame.tsx` (client: la pestaña activa es estado local). Incluye podio 2-1-3, tabla de 12 filas con `animationDelay` escalonado y el bloque "TU MEJOR MARCA" cuando hay sesión, con el mismo cálculo falso que la referencia. Botón VOLVER A LA BIBLIOTECA.

Estilos en todos los pasos:

- Se reutilizan las clases existentes de `app/globals.css`.
- Los `style={{…}}` inline de la referencia pasan a utilidades de Tailwind usando los tokens del tema (`text-magenta`, `font-pixel`, `text-ink-faint`…).
- Las piezas nuevas (not-found y ajustes de Detalle y Auth) se hacen con Tailwind.
- `globals.css` solo se edita si falta una clase.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` termina sin errores.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en ninguna de las 5 pantallas.
- [ ] `/` muestra los 8 juegos. Escribir "ser" deja solo SERPENTINA. El chip SHOOTER deja solo INVASORES y ROCAS.
- [ ] Una búsqueda sin coincidencias muestra "NO HAY RESULTADOS".
- [ ] Al pasar el ratón sobre una card, se inclina en 3D. Al salir, vuelve a su posición.
- [ ] Al hacer clic en una card o en su botón JUGAR, la URL pasa a `/juegos/<id>`.
- [ ] `/juegos/caida` muestra el título CAÍDA, la portada `cover-tetro`, la franja con 184.220 / 31.8K / PUZZLE y un ranking de 10 filas con las 3 primeras en oro, plata y bronce.
- [ ] `/juegos/no-existe` y `/juegos/no-existe/jugar` muestran la página 404 arcade con un botón a `/`.
- [ ] En `/juegos/caida/jugar`, la puntuación sube sola. PAUSA la detiene y muestra "EN PAUSA". REANUDAR la continúa.
- [ ] FIN abre el modal "FIN DEL JUEGO" con la puntuación final.
- [ ] En el modal, GUARDAR añade una entrada a `localStorage.av_scores` y muestra "PUNTUACIÓN GUARDADA".
- [ ] En el modal, JUGAR DE NUEVO reinicia a 0, 3 vidas y nivel 01.
- [ ] Enviar el formulario de `/login` redirige a `/`, y el Nav muestra el nombre en lugar de "Iniciar Sesión".
- [ ] Al recargar la página, la sesión se mantiene.
- [ ] Hacer clic en el nombre del Nav cierra la sesión y borra `av_user`.
- [ ] En `/salon`, cambiar de pestaña cambia el podio y la tabla, y el mismo juego siempre muestra los mismos datos.
- [ ] Con sesión iniciada, `/salon` muestra la fila "TU MEJOR MARCA EN <JUEGO>" en amarillo. Sin sesión, no aparece.
- [ ] El enlace activo del Nav se resalta en cyan: Biblioteca en `/`, `/juegos/*` y `/juegos/*/jugar`, y Salón en `/salon`.
- [ ] Por debajo de 840px se ocultan los enlaces y aparece la hamburguesa. Esta abre el panel lateral, y al hacer clic en el fondo se cierra.
- [ ] Ninguna pantalla tiene scroll horizontal a 375px de ancho.
- [ ] Ya no queda contenido del scaffold de `create-next-app`.
- [ ] Revisión visual manual de las 5 pantallas, en escritorio y en móvil, contra la referencia: colores, tipografías pixel/mono, neón y animaciones coinciden.

## Decisiones

- **Sí:** rutas reales del App Router en español (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/salon`, `/login`). Las URLs se pueden compartir y coinciden con el idioma de la interfaz.
- **No:** SPA con estado de ruta en `location.hash`, como en el prototipo. No aprovecha Next y rompe enlaces y prefetch.
- **No:** rutas en inglés (`/games`, `/hall-of-fame`, `/auth`).
- **Sí:** reconstruir Detalle y Auth a partir de su CSS. El código fuente no existe en `references/` y las clases definen casi toda la estructura.
- **Sí:** reutilizar las clases ya portadas a `globals.css` y usar Tailwind para todo lo demás. Así se mantiene la fidelidad 1:1 sin reescribir 950 líneas de CSS.
- **No:** migrar todo el CSS a utilidades de Tailwind. Supone mucho trabajo y riesgo de desviarse del diseño.
- **Sí:** datos ficticios en `app/data/` (TypeScript tipado). Es el punto único que se sustituirá por una base de datos.
- **No:** `lib/games.ts` ni JSON en `/data`. El usuario eligió `app/data/`.
- **Sí:** el Reproductor copia tal cual la simulación de la referencia. Es un placeholder hasta que existan juegos reales.
- **Sí:** sesión y puntuaciones de prueba en `localStorage` (`av_user`, `av_scores`) con `useSyncExternalStore`. Así no hay errores de hidratación y no hace falta backend.
- **No:** autenticación real ni validación. Va en una spec propia junto con la base de datos.
- **Sí:** al hacer clic en el nombre del Nav se cierra la sesión, como en la referencia. Un desplegable queda fuera de esta spec.
- **Sí:** `generateStaticParams` con los 8 ids. Con `cacheComponents`, las rutas dinámicas necesitan al menos un param. Además, los 8 juegos se prerenderizan.
- **Sí:** la pestaña activa del Salón es estado local del cliente. Sincronizarla con `?juego=` obligaría a usar `searchParams` dinámico y Suspense, y no aporta nada al MVP.
- **Sí:** todos los efectos visuales de la referencia en esta spec. Ya están en el CSS, y solo la inclinación 3D necesita JS.
- **Sí:** verificación con build, lint y una lista de comprobación manual. El test runner va en otra spec.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Error de hidratación al leer `localStorage` durante el render | `useSyncExternalStore` con snapshot de servidor `null`. Nunca se lee `localStorage` fuera de efectos o del store. |
| Cache Components rechaza las rutas dinámicas en el build | `generateStaticParams` devuelve los 8 ids. Se consultan `node_modules/next/dist/docs/` antes de escribir las páginas. |
| Detalle y Auth reconstruidas no se parecen a lo que el usuario imaginaba | Se basan solo en clases existentes. Si el usuario recupera los JSX originales, se ajustan en una spec de corrección. |
| `localStorage` bloqueado (modo privado) | try/catch en `lib/session.ts`. La app funciona sin sesión persistente. |
| `Math.random` del Reproductor en el render del servidor | El intervalo solo corre en `useEffect`, y el render inicial usa valores deterministas (0, 3, 1). |

## Lo que **no** entra en esta spec

- Juegos reales.
- Backend, base de datos o autenticación real.
- Mostrar en Detalle o Salón las puntuaciones guardadas en `av_scores`.
- Créditos funcionales.
- Menú desplegable de usuario.
- Tests automatizados.
- Limpieza de assets del scaffold en `public/`.

Cada uno de estos puntos, si se hace, irá en su propia spec.

# SPEC 02 — Landing page (Home)

> **Estado:** implementado@
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-19
> **Objetivo:** Convertir `/` en la landing page de `references/templates/home-about/home.jsx` y mover la Biblioteca y sus pantallas de juego bajo `/games`.

## Por qué existe esta spec

La SPEC 01 puso la Biblioteca en `/`. El nuevo prototipo (`references/templates/home-about/`) añade una landing page de marketing que debe ser la puerta de entrada al Vault. Eso obliga a mover la Biblioteca y, para mantener una jerarquía coherente, también el Detalle y el Reproductor.

Esta spec **revierte en parte** la decisión de la SPEC 01 de usar rutas en español: el bloque de juegos pasa a `/games`. El resto de rutas (`/salon`, `/login`) no cambia.

Mapa de `references/templates/home-about/`:

| Archivo                         | Contenido                                       | ¿Entra aquí? |
| ------------------------------- | ----------------------------------------------- | ------------ |
| `home.jsx`                      | Landing (`Home`, `FloatingSilhouettes`, `MiniCard`, `FeatureIcon`) | Sí |
| `nav.jsx`                       | Nav con Inicio · Biblioteca · Salón · Acerca de | Parcial (solo "Inicio") |
| `styles.css`                    | CSS completo; bloques `HOME PAGE`, `ACTIVITY`, `PRICING` son los nuevos | Parcial |
| `about.jsx`                     | Acerca de + Contacto                            | No (SPEC 03) |
| `arcade-vault-standalone.html`  | Bundle de previsualización                      | No (solo referencia visual) |

## Alcance

**Entra:**

- Ruta `/`: landing con las 7 secciones de `home.jsx`, en el mismo orden y con los mismos textos:
  1. Hero: siluetas pixel flotantes (8 SVG), eyebrow "▸ INSERTA UNA MONEDA_", título en 3 líneas, subtítulo, CTAs **EXPLORAR JUEGOS** y **CREAR CUENTA**, indicador "DESLIZA ▼".
  2. `// 01` ¿POR QUÉ ARCADE VAULT?: 4 feature cards con iconos pixel SVG.
  3. `// 02` JUEGOS DISPONIBLES AHORA: los 6 primeros de `GAMES` en mini-cards + botón VER TODOS LOS JUEGOS.
  4. Stats: 12+ JUEGOS · MILES DE PARTIDAS · GLOBAL RANKING.
  5. `// 03` ACTIVIDAD EN VIVO: ticker de últimas puntuaciones (7 filas) y top jugadores de hoy (5 filas) con enlace VER SALÓN.
  6. `// 04` PRECIOS: tarjeta "JUGADOR VAULT $0" con sello FREE PLAY + 3 FAQ.
  7. CTA final "¿LISTO PARA JUGAR?" con botón INSERTAR MONEDA.
- Animación de aparición al hacer scroll (`.reveal` → `.in`) con `IntersectionObserver`.
- Mover la Biblioteca de `/` a `/games`.
- Mover el Detalle a `/games/[id]` y el Reproductor a `/games/[id]/play`.
- Redirecciones permanentes desde las rutas antiguas `/juegos/:id` y `/juegos/:id/jugar`.
- Actualizar todos los enlaces internos a las nuevas rutas.
- Nav: añadir el enlace **Inicio** (escritorio y móvil). Orden: Inicio · Biblioteca · Salón de la Fama.
- Login: aceptar `?tab=registro` para abrir directamente la pestaña REGISTRO.
- Los botones **CREAR CUENTA** (hero) y **EMPEZAR GRATIS** (precios) llevan a `/login?tab=registro`.
- Datos mock de la landing como constantes temporales en `app/data/home.ts`.
- Portar a `app/globals.css` solo los bloques CSS que faltan: `HOME PAGE`, `ACTIVITY` y `PRICING`.

**Fuera de alcance (specs futuras):**

- Pantalla Acerca de / Contacto (`about.jsx`) y el enlace "Acerca de" del Nav → SPEC 03.
- CSS del gamepad, variantes de tema, score floaters y del bloque `ABOUT PAGE` de `styles.css`.
- Datos reales en ACTIVIDAD EN VIVO o en las stats (siguen siendo mock aunque digan "en vivo").
- Ajustar "12+ JUEGOS" al número real de juegos (8).
- Traducir al inglés el resto de rutas (`/salon`, `/login`).
- Sincronizar la pestaña del login con la URL al cambiarla a mano (solo se lee al entrar).

## Modelo de datos

No cambia el modelo de la SPEC 01. Se añade un archivo de constantes mock:

```ts
// app/data/home.ts — mock temporal, se sustituirá por datos reales
import type { GameColor } from "./games";

export type HomeStat = { n: string; u: string; s: string };
export type RecentScore = { player: string; game: string; score: number; ago: string; color: GameColor };
export type TopPlayer = { rank: number; player: string; score: number };

export const HOME_STATS: HomeStat[];       // 3 bloques, valores literales de home.jsx
export const RECENT_SCORES: RecentScore[]; // 7 filas, valores literales de home.jsx
export const TOP_PLAYERS: TopPlayer[];     // 5 filas, valores literales de home.jsx
```

- Los juegos de "JUEGOS DISPONIBLES AHORA" salen de `GAMES.slice(0, 6)`, como en la referencia.
- Los textos de features, precios y FAQ son copy fijo y viven en el JSX del componente, no en `app/data/`.
- El ancho de la barra del top se calcula igual que la referencia: `100 - i * 16` %.

Parámetro de URL del login:

```ts
// /login?tab=registro → pestaña REGISTRO. Cualquier otro valor o ausencia → ENTRAR.
type Mode = "login" | "register";
```

## Plan de implementación

1. **Mover Detalle y Reproductor.**
   - `app/juegos/[id]/page.tsx` → `app/games/[id]/page.tsx`.
   - `app/juegos/[id]/jugar/page.tsx` → `app/games/[id]/play/page.tsx`.
   - Actualizar los tipos `PageProps<"/games/[id]">` y `PageProps<"/games/[id]/play">`.
   - Actualizar enlaces en `components/game-card.tsx`, `components/game-player.tsx` (SALIR) y el botón JUGAR AHORA del Detalle.
   - Añadir `redirects()` en `next.config.ts`: `/juegos/:id` → `/games/:id` y `/juegos/:id/jugar` → `/games/:id/play`, ambas `permanent: true`. Consultar `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/redirects.md`.
   - Comprobar `npm run build`.
2. **Mover la Biblioteca.**
   - Crear `app/games/page.tsx` con el contenido actual de `app/page.tsx` (hero `.av-hero` + `LibraryBrowser`).
   - `app/page.tsx` queda temporalmente con un placeholder mínimo que enlaza a `/games`.
   - `components/hall-of-fame.tsx`: VOLVER A LA BIBLIOTECA → `/games`.
   - `components/nav.tsx`: `sectionOf` marca Biblioteca en `/games` y `/games/*`. Los enlaces Biblioteca apuntan a `/games`.
3. **Nav con Inicio.**
   - Añadir la sección `"inicio"` (activa solo en `/`) y el enlace **Inicio** antes de Biblioteca, en escritorio y en el panel móvil.
   - El logo sigue enlazando a `/`.
4. **CSS de la landing.**
   - Copiar a `app/globals.css` los bloques `HOME PAGE` (líneas 930–1070), `ACTIVITY` (1621–1671) y `PRICING` (1672–1730) de `references/templates/home-about/styles.css`.
   - No duplicar reglas ni `@keyframes` que ya existen (`pulse`, `blink`, `fadeIn`, `.btn.xl`, `.btn.lg`, `.field`…). Antes de pegar, comprobar con grep.
5. **Datos mock.** Crear `app/data/home.ts` con `HOME_STATS`, `RECENT_SCORES` y `TOP_PLAYERS`.
6. **Componentes de la landing (Server Components salvo donde se indique).**
   - `components/home/floating-silhouettes.tsx`: los 8 SVG de `FloatingSilhouettes`.
   - `components/home/feature-icon.tsx`: `FeatureIcon` (GAMEPAD, FREE, TROPHY, ROCKET).
   - `components/home/mini-card.tsx`: `Link` a `/games/[id]` con `.mini-card`.
   - `components/home/reveal.tsx` (client): envuelve una sección con clase `reveal` y le añade `in` al entrar en pantalla (`threshold: 0.12`, se desconecta tras la primera vez).
7. **Página Home, parte 1.** Reemplazar el placeholder de `app/page.tsx` con `<div className="home fade-in">` y las secciones Hero, `// 01` y `// 02`.
   - EXPLORAR JUEGOS → `/games`. CREAR CUENTA → `/login?tab=registro`. VER TODOS LOS JUEGOS → `/games`.
   - Añadir `metadata` con el título "Arcade Vault · Portal Retro".
8. **Página Home, parte 2.** Añadir Stats, `// 03` Actividad, `// 04` Precios y CTA final.
   - VER SALÓN → `/salon`. EMPEZAR GRATIS → `/login?tab=registro`. INSERTAR MONEDA → `/games`.
   - Los `style={{…}}` inline de la referencia (`transitionDelay`, `animationDelay`, ancho de `.tp-fill`) se mantienen inline porque son valores calculados. El resto pasa a Tailwind.
9. **Login con `?tab=registro`.**
   - `components/auth-card.tsx` recibe `initialMode?: Mode`.
   - Nuevo componente client que lee `useSearchParams()` y pasa `initialMode` a `AuthCard`.
   - `app/login/page.tsx` lo envuelve en `<Suspense fallback={<AuthCard />}>`. Con Cache Components, `useSearchParams` fuera de Suspense rompe el build (ver `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md`).

Estilos en todos los pasos: mismas reglas que la SPEC 01. Se reutilizan las clases portadas a `globals.css` y lo nuevo se hace con Tailwind usando los tokens del tema.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` termina sin errores.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en `/`, `/games`, `/games/caida`, `/games/caida/play` y `/login?tab=registro`.
- [ ] `/` muestra las 7 secciones en orden: Hero, `// 01`, `// 02`, Stats, `// 03`, `// 04` y CTA final.
- [ ] El hero muestra las 8 siluetas flotando y el cursor `_` del eyebrow parpadea.
- [ ] Al hacer scroll, cada sección con `.reveal` aparece con transición la primera vez que entra en pantalla.
- [ ] `// 02` muestra 6 mini-cards (los 6 primeros juegos de `GAMES`). Clic en una lleva a `/games/<id>`.
- [ ] EXPLORAR JUEGOS, VER TODOS LOS JUEGOS e INSERTAR MONEDA llevan a `/games`.
- [ ] CREAR CUENTA y EMPEZAR GRATIS llevan a `/login?tab=registro` y la pestaña REGISTRO aparece seleccionada.
- [ ] `/login` sin parámetro abre la pestaña ENTRAR.
- [ ] VER SALÓN lleva a `/salon`.
- [ ] El ticker muestra 7 filas y el top 5 filas, con #01–#03 en oro, plata y bronce.
- [ ] `/games` muestra la Biblioteca con buscador, chips y los 8 juegos, igual que antes en `/`.
- [ ] `/games/caida` muestra el Detalle de CAÍDA. JUGAR AHORA lleva a `/games/caida/play`.
- [ ] En el Reproductor, SALIR lleva a `/games/caida`.
- [ ] `/juegos/caida` redirige a `/games/caida` y `/juegos/caida/jugar` redirige a `/games/caida/play`.
- [ ] `/games/no-existe` y `/games/no-existe/play` muestran la página 404 arcade.
- [ ] En `/salon`, VOLVER A LA BIBLIOTECA lleva a `/games`.
- [ ] El Nav muestra Inicio · Biblioteca · Salón de la Fama, en escritorio y en el panel móvil.
- [ ] Inicio está activo (cyan) solo en `/`. Biblioteca está activo en `/games`, `/games/*` y `/games/*/play`.
- [ ] No queda ningún enlace interno a `/juegos/...` en `app/` ni en `components/` (`grep -rn "/juegos" app components` sin resultados).
- [ ] Ninguna sección de `/` tiene scroll horizontal a 375px de ancho.
- [ ] A 375px, las feature cards pasan a 1 columna, las mini-cards a 2 y stats, actividad y precios a 1 columna.
- [ ] Revisión visual manual de `/` en escritorio y móvil contra `references/templates/home-about/arcade-vault-standalone.html`: colores, tipografías, neón y animaciones coinciden.

## Decisiones

- **Sí:** la landing ocupa `/` y la Biblioteca pasa a `/games`. Lo pidió el usuario: la landing es la puerta de entrada.
- **Sí:** `/games` en minúsculas. Las URLs distinguen mayúsculas y la convención web es minúsculas.
- **No:** `/Games` con mayúscula.
- **Sí:** Detalle y Reproductor pasan a `/games/[id]` y `/games/[id]/play`. Mantiene la jerarquía bajo un solo prefijo y en un solo idioma.
- **No:** dejar `/juegos/[id]` con el listado en `/games`. Mezcla idiomas y rompe la jerarquía.
- **No:** `/games/[id]/jugar`. Mezcla inglés y español en la misma URL.
- **Sí:** esta spec revierte la decisión de la SPEC 01 de usar rutas en español, solo para el bloque de juegos. `/salon` y `/login` se quedan igual para no ampliar el alcance.
- **Sí:** redirecciones permanentes desde `/juegos/...`. Cuestan dos líneas y evitan enlaces rotos.
- **Sí:** Acerca de / Contacto queda fuera y va en la SPEC 03. Mantiene esta spec pequeña y verificable.
- **Sí:** el Nav solo añade "Inicio". "Acerca de" se añade en la SPEC 03 para no enlazar a un 404.
- **Sí:** CREAR CUENTA y EMPEZAR GRATIS abren la pestaña REGISTRO con `/login?tab=registro`. Exigido por el usuario.
- **Sí:** leer `?tab` con `useSearchParams` dentro de `<Suspense>`, con `<AuthCard />` (pestaña ENTRAR) como fallback. Así `/login` sigue prerenderizándose y no rompe el build con Cache Components.
- **No:** leer `searchParams` en el Server Component de la página. Haría dinámica toda la ruta sin beneficio.
- **Sí:** datos mock como constantes temporales en `app/data/home.ts`, con los valores literales de la referencia. Lo pidió el usuario y es el punto único a sustituir más adelante.
- **No:** derivar ticker y top de `seededScores`. Se desvía del texto de la referencia.
- **Sí:** "JUEGOS DISPONIBLES AHORA" usa `GAMES.slice(0, 6)`, igual que la referencia. Confirmado por el usuario.
- **Sí:** mantener "12+ JUEGOS" aunque hoy haya 8. Es copy de marketing de la referencia y es mock temporal.
- **Sí:** `Reveal` como pequeño client component por sección, en lugar de un `querySelectorAll(".reveal")` global. Funciona con la navegación del App Router, que no remonta la página entera.
- **Sí:** la página Home es Server Component. Solo `Reveal` necesita JS.
- **Sí:** portar solo los bloques CSS `HOME PAGE`, `ACTIVITY` y `PRICING`. El resto de `styles.css` ya está en `globals.css` o pertenece a otras specs.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| `useSearchParams` sin Suspense rompe `npm run build` con Cache Components | `<Suspense>` en `app/login/page.tsx`, con `AuthCard` en modo ENTRAR como fallback. |
| Las secciones `.reveal` quedan invisibles si el JS falla o no se ejecuta el observer | Cada `Reveal` añade `in` también si `IntersectionObserver` no existe. Revisión manual con scroll rápido hasta el final. |
| Reglas CSS duplicadas o `@keyframes` con el mismo nombre al pegar los bloques | Comprobar con grep cada selector y keyframe antes de pegarlo (paso 4). |
| Enlaces antiguos a `/juegos/...` olvidados en el código | Criterio de aceptación con `grep -rn "/juegos"`. Las redirecciones cubren enlaces externos. |
| `.home-hero` usa `min-height: calc(100vh - 60px)` y puede no cuadrar con la altura real del Nav o el padding de `.av-main` | Revisión visual en escritorio y móvil. Si no cuadra, se ajusta con Tailwind en la página, sin tocar el bloque portado. |
| Los tipos `PageProps<"/games/...">` no existen hasta regenerar `.next/types` | Ejecutar `next dev` o `npm run build` tras mover las carpetas. |

## Lo que **no** entra en esta spec

- Pantalla Acerca de / Contacto y el enlace "Acerca de" del Nav (SPEC 03).
- CSS del gamepad, temas, score floaters y de la página About.
- Datos reales en Actividad en vivo y en las stats.
- Cambiar "12+ JUEGOS" por el número real.
- Rutas en inglés para `/salon` y `/login`.
- Sincronizar la pestaña del login con la URL al cambiarla.

Cada uno de estos puntos, si se hace, irá en su propia spec.

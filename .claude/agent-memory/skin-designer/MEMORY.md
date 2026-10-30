# Memoria de skin-designer

## Registro de skins

| Fecha      | Juego         | Skin    | Estado | Contraste mínimo | Notas                                                                                                                            |
| ---------- | ------------- | ------- | ------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-30 | rocas         | clasico | ok     | 15.75:1          | game.js original: vector blanco, power-up #0ff, llama naranja. Nave y rocas comparten blanco (original; se distinguen por forma) |
| 2026-10-30 | rocas         | neon    | ok     | 5.15:1           | PALETTE/GLOW previos sin cambios                                                                                                 |
| 2026-10-30 | rocas         | retro   | ok     | 6.01:1           | fósforo verde P1, 3 luminosidades                                                                                                |
| 2026-10-30 | rocas         | pastel  | ok     | 11.74:1          | mantequilla / azul polvo / rosa sobre #0d0b14                                                                                    |
| 2026-10-30 | caida         | clasico | ok     | 4.84:1           | game.js + style.css; borde #2a2a3a→#7aa2f7 y label #555570→#888888 por contraste (colores del propio original)                   |
| 2026-10-30 | caida         | neon    | ok     | 3.91:1           | sin cambios; J violeta #aa00ff es el más justo                                                                                   |
| 2026-10-30 | caida         | retro   | ok     | 4.44:1           | fósforo ámbar; 8 escalones de luminosidad (excede 2–4 tonos: las 8 piezas deben distinguirse)                                    |
| 2026-10-30 | caida         | pastel  | ok     | 7.81:1           | cada pieza en su familia original, noche malva                                                                                   |
| 2026-10-30 | bloque-buster | clasico | ok     | 3.84:1           | nombres CSS del original en hex, bloques macizos; green #008000 es el más justo. Paleta = pelota (blanco original)               |
| 2026-10-30 | bloque-buster | neon    | ok     | 5.12:1           | sin cambios                                                                                                                      |
| 2026-10-30 | bloque-buster | retro   | ok     | 4.60:1           | LCD verde 8-bit (tipo consola portátil), 7 escalones para los 7 bloques                                                          |
| 2026-10-30 | bloque-buster | pastel  | ok     | 11.26:1          | caramelo translúcido, paleta cian pastel                                                                                         |
| 2026-10-30 | serpentina    | clasico | ajustado | 5.15:1         | spec 09 paso 3 plano: tailFade 1 (antes se atenuaba a 2.32:1). Fruta pixel art no se recolorea |
| 2026-10-30 | serpentina    | neon    | ajustado | 3.92:1         | cola 0.35→0.5 (tailFade por skin): la cola medía 2.32:1 y el cuerpo mata; resto sin cambios |
| 2026-10-30 | serpentina    | retro   | ajustado | 3.60:1         | fósforo ámbar; cola 0.35→0.55 (medía 1.99:1). Pared borderAlpha 0.6 = 4.37:1 |
| 2026-10-30 | serpentina    | pastel  | ajustado | 3.83:1         | menta + bonus vainilla; cola 0.35→0.5 (medía 2.32:1) |

Familias retro usadas: verde (rocas), ámbar (caida, serpentina), LCD 8-bit verde oliva (bloque-buster).

Contraste: medir también la cola atenuada de serpentina (tailFade), no solo los hex de la paleta.

bloque-buster re-auditado 2026-10-30: los 4 skins siguen ok, mismos mínimos, sin cambios.

- [Agentes en paralelo](parallel-agents-shared-browser.md) — navegador Playwright, localStorage y dev server :3000 compartidos

## Preferencias del usuario

- Skins obligatorios: clásico (default, colores originales), neón, retro y pastel.
- "Modo oscuro" = contraste sobre fondo oscuro; la web no tiene modo claro.
- El selector de skin va en el GameShell de cada juego, guardado por juego.
- Mantener `references/game-with-themes.md` (🟡/✅/—, Dark-mode revisado) e incluirlo en el commit de cada juego.
- Si pide un juego concreto con prioridad, hacerlo primero y ponerlo primero en la respuesta.

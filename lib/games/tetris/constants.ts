import type { SkinId } from "@/lib/games/skins";
// Port 1:1 de references/started-games/03-tetris/game.js. Mundo lógico fijo: el canvas se escala por CSS.
export const W = 800;
export const H = 600;
// ── Tablero ──
export const COLS = 10;
export const ROWS = 20;
export const CELL = 28;
export const BOARD_X = 260; // 280 px de ancho centrados en x = 400
export const BOARD_Y = 20;
// ── Panel lateral (SIGUIENTE, LÍNEAS, CONTROLES) ──
export const PANEL_X = 580; // 40 px a la derecha del tablero
export const NEXT_LABEL_Y = 70;
export const NEXT_BOX_Y = 84;
export const NEXT_BOX = 128; // 4×4 celdas de 28 + 8 de margen por lado
export const NEXT_PAD = 8;
export const LINES_LABEL_Y = 250;
export const LINES_VALUE_Y = 275;
export const CONTROLS_Y = 330;
export const CONTROLS = [
  ["← →", "MOVER"],
  ["↑ X", "ROTAR"],
  ["↓", "BAJAR"],
  ["ESPACIO", "CAÍDA"],
  ["P", "PAUSA"],
] as const;
// ── Piezas (índice = tipo = color) ──
export const PIECES: (number[][] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];
export const PIECE_TYPES = 8;
// ── Reglas ──
export const LINE_SCORES = [0, 100, 300, 500, 800]; // × nivel
export const KICKS = [0, -1, 1, -2, 2];
export const GHOST_ALPHA = 0.2;
export const MAX_DT = 50; // ms: límite del dt antes de sumarlo a dropAccum
// ── Skins ── (presentación: colores y glow; las reglas no cambian)
export type Palette = {
  bg: string;
  board: string;
  grid: string;
  border: string;
  nextBox: string;
  highlight: string;
  shade: string;
  pieces: (string | null)[]; // índice = tipo de pieza; 0 = vacío
  label: string;
  text: string;
};
export type Glow = { piece: number; border: number; locked: number };
export type Skin = { palette: Palette; glow: Glow };
export const SKINS: Record<SkinId, Skin> = {
  // Colores del original (game.js y style.css, tema oscuro).
  clasico: {
    palette: {
      bg: "#0f0f17", // style.css --bg
      board: "#1a1a25", // style.css --canvas-bg
      grid: "#22222e", // style.css --grid-line
      border: "#7aa2f7", // style.css, acento del original: --border (#2a2a3a) no llegaba a 3:1
      nextBox: "#2a2a3a", // style.css --border
      highlight: "rgba(255,255,255,0.12)", // game.js original
      shade: "rgba(0,0,0,0)", // el original no tenía filo inferior
      pieces: [
        null,
        "#4dd0e1", // I — game.js original
        "#ffd54f", // O — game.js original
        "#ba68c8", // T — game.js original
        "#81c784", // S — game.js original
        "#e57373", // Z — game.js original
        "#90caf9", // J — game.js original
        "#ffb74d", // L — game.js original
        "#9e9e9e", // N (tuerca) — game.js original
      ],
      label: "#888888", // style.css --controls-text: --label (#555570) no llegaba a 4.5:1
      text: "#e0e0e0", // style.css --text
    },
    glow: { piece: 0, border: 0, locked: 0 },
  },
  // Paleta neón de la plataforma: hex de los tokens de app/globals.css (el canvas no lee variables CSS).
  // Lo único que brilla siempre es el borde magenta (el color de CAÍDA) y la pieza que cae; lo fijado se apaga.
  // Z y J toman el naranja y el violeta de la portada cover-tetro: bronce e ink-dim quedaban mates junto al neón.
  neon: {
    palette: {
      bg: "#000",
      board: "#07070d", // un punto sobre el negro para separar el pozo del fondo
      grid: "rgba(255,255,255,0.06)", // --line-2
      border: "#ff006e", // --magenta (color de CAÍDA)
      nextBox: "rgba(255,0,110,0.35)", // --magenta atenuado: el recuadro acompaña sin competir con el pozo
      highlight: "rgba(255,255,255,0.35)", // filo superior de cada bloque
      shade: "rgba(0,0,0,0.3)", // filo inferior de cada bloque
      pieces: [
        null,
        "#00f5ff", // I — --cyan
        "#f5ff00", // O — --yellow
        "#ff006e", // T — --magenta
        "#00ff88", // S — --green
        "#ff7700", // Z — naranja de cover-tetro
        "#aa00ff", // J — violeta de cover-tetro
        "#ffcf3a", // L — --gold
        "#c7d0e0", // N (tuerca) — --silver: metal
      ],
      label: "#8a8fb5", // --ink-dim
      text: "#e6e9ff", // --ink
    },
    // Radio del glow (shadowBlur) en px lógicos; glow() lo escala por el devicePixelRatio.
    glow: {
      piece: 12, // pieza que cae y pieza siguiente
      border: 14, // borde del pozo
      locked: 0, // sin glow: hasta 200 shadowBlur por frame (ver Riesgos de la spec)
    },
  },
  // Terminal de fósforo ámbar: un solo tono, las piezas se separan por luminosidad y por forma.
  retro: {
    palette: {
      bg: "#0c0700", // negro con tinte de fósforo ámbar
      board: "#140c02", // pozo un punto más caliente
      grid: "rgba(255,176,0,0.07)", // fósforo ámbar casi apagado
      border: "#ffb000", // fósforo ámbar
      nextBox: "rgba(255,176,0,0.35)", // fósforo ámbar atenuado
      highlight: "rgba(255,236,200,0.3)", // filo de fósforo saturado
      shade: "rgba(0,0,0,0.35)",
      pieces: [
        null,
        "#ffd27a", // I — fósforo ámbar claro
        "#ffb000", // O — fósforo ámbar
        "#c98400", // T — fósforo ámbar medio
        "#ffe9bf", // S — fósforo ámbar saturado al blanco
        "#a86c00", // Z — fósforo ámbar apagado
        "#e89c1a", // J — fósforo ámbar cálido
        "#ffc54a", // L — fósforo ámbar vivo
        "#c4a274", // N (tuerca) — fósforo ámbar mate
      ],
      label: "#c99a4c", // fósforo ámbar medio
      text: "#ffe0a3", // fósforo ámbar claro
    },
    glow: { piece: 3, border: 4, locked: 0 },
  },
  // Caramelos sobre noche malva: cada pieza conserva su familia del original, en pastel.
  pastel: {
    palette: {
      bg: "#0e0d16", // noche malva
      board: "#15131f", // pozo un punto más claro
      grid: "rgba(255,255,255,0.05)",
      border: "#f5b8d0", // rosa: el magenta de CAÍDA en pastel
      nextBox: "rgba(245,184,208,0.35)", // rosa atenuado
      highlight: "rgba(255,255,255,0.35)",
      shade: "rgba(0,0,0,0.2)",
      pieces: [
        null,
        "#a8e8f0", // I — aguamarina
        "#fff0a0", // O — vainilla
        "#e0b8ff", // T — lila
        "#b8f0c8", // S — menta
        "#ffb8b0", // Z — coral
        "#b8c8ff", // J — vincapervinca
        "#ffd0a0", // L — melocotón
        "#d8dce8", // N (tuerca) — plata
      ],
      label: "#a9a6c4", // lavanda gris
      text: "#f0eeff", // lavanda casi blanca
    },
    glow: { piece: 5, border: 6, locked: 0 },
  },
};

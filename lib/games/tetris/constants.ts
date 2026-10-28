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
// Paleta neón de la plataforma: hex de los tokens de app/globals.css (el canvas no lee variables CSS).
// Lo único que brilla siempre es el borde magenta (el color de CAÍDA) y la pieza que cae; lo fijado se apaga.
// Z y J toman el naranja y el violeta de la portada cover-tetro: bronce e ink-dim quedaban mates junto al neón.
export const PALETTE = {
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
} as const;
// Radio del glow (shadowBlur) en px lógicos; glow() lo escala por el devicePixelRatio.
export const GLOW = {
  piece: 12, // pieza que cae y pieza siguiente
  border: 14, // borde del pozo
  locked: 0, // sin glow: hasta 200 shadowBlur por frame (ver Riesgos de la spec)
} as const;

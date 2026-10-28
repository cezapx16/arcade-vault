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
// Colores originales de game.js y style.css (tema oscuro); la paleta neón llega en el paso 5.
export const PALETTE = {
  bg: "#0f0f17",
  board: "#1a1a25",
  grid: "#22222e",
  border: "#2a2a3a",
  highlight: "rgba(255,255,255,0.12)",
  pieces: [
    null,
    "#4dd0e1", // I
    "#ffd54f", // O
    "#ba68c8", // T
    "#81c784", // S
    "#e57373", // Z
    "#90caf9", // J
    "#ffb74d", // L
    "#9e9e9e", // N (tuerca)
  ],
  label: "#555570",
  text: "#e0e0e0",
} as const;
// shadowBlur en px lógicos; 0 = sin glow.
export const GLOW = {
  piece: 0,
  border: 0,
} as const;

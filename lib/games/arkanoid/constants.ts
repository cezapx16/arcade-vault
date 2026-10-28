// Port 1:1 de references/started-games/04-arkanoid/game.js. Mundo lógico fijo: el canvas se escala por CSS.
export const W = 800;
export const H = 600;
// ── Paleta y pelota ──
export const PADDLE_SPEED = 400; // px/s con ← →
export const PADDLE = { y: 560, w: 81, h: 14 } as const;
export const PADDLE_CATCH = 8; // px por debajo del borde superior que aún cuentan como contacto
export const BALL_SIZE = 16;
export const BASE_BALL_VX = 200;
export const BASE_BALL_VY = -300;
// ── Bloques (rejilla de 10 × 6) ──
export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2; // 80
export const BLOCKS_ORIGIN_Y = 80;
// ── Reglas ──
export const POINTS_PER_BLOCK = 10;
export const START_LIVES = 3;
export const SPEED_STEP = 1.1; // multiplicador por nivel a partir del 6
export const MAX_SPEED = 2.0;
export const EXPLOSION_DURATION = 150; // ms
export const EXPLOSION_PHASES = 4;
export const MAX_DT = 50; // ms: límite del dt, único cambio sobre la física del original
// Paso 2: colores con los nombres CSS del original. La paleta neón se fija en el paso 4.
export const PALETTE = {
  bg: "#000",
  paddle: "#fff",
  ball: "#fff",
  blocks: {
    red: "red",
    yellow: "yellow",
    cyan: "cyan",
    magenta: "magenta",
    hotpink: "hotpink",
    green: "green",
    gray: "gray",
  },
} as const;
// Radio del glow (shadowBlur) en px lógicos; glow() lo escala por el devicePixelRatio.
export const GLOW = {
  paddle: 0,
  ball: 0,
  block: 0,
  explosion: 0,
} as const;

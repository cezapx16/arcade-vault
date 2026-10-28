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
export const MAX_DT = 50; // ms: límite del dt, único cambio sobre la física del original
// Paleta neón de la plataforma: hex de los tokens de app/globals.css (el canvas no lee variables CSS).
// Los nombres de color del original se conservan en levels.ts; solo cambia el hex al que apuntan.
// Lo que brilla es lo que se mueve (paleta, pelota, explosiones); los bloques son tubos de neón apagados:
// cristal tintado con un filo encendido, sin shadowBlur.
export const PALETTE = {
  bg: "#000",
  paddle: "#00f5ff", // --cyan (color de BLOQUE BUSTER)
  paddleCore: "#e6fdff", // núcleo blanco del tubo de neón
  ball: "#e6e9ff", // --ink
  ballGlow: "#00f5ff", // halo cyan: la pelota pertenece a la paleta
  blockFillAlpha: 0.22, // cristal tintado del bloque
  blockEdge: "rgba(255,255,255,0.45)", // filo superior encendido
  blocks: {
    red: "#ff7700", // naranja de cover-tetro: --bronze (#d97a3a) quedaba mate junto al neón
    yellow: "#f5ff00", // --yellow
    cyan: "#00f5ff", // --cyan
    magenta: "#ff006e", // --magenta
    hotpink: "#b44dff", // violeta de cover-tetro, aclarado: --gold se confundía con --yellow (filas contiguas en la pirámide)
    green: "#00ff88", // --green
    gray: "#c7d0e0", // --silver
  },
} as const;
// Radio del glow (shadowBlur) en px lógicos; glow() lo escala por el devicePixelRatio.
export const GLOW = {
  paddle: 16,
  ball: 14,
  block: 0, // sin glow: 60 shadowBlur por frame (ver Riesgos de la spec); el filo encendido hace de neón
  explosion: 18,
} as const;
// Explosión: una fase cada 37,5 ms. El bloque se hincha, se aclara y se apaga.
export const EXPLOSION_FRAMES = [
  { scale: 1.0, alpha: 1.0, flash: 0.6 }, // destello casi blanco
  { scale: 1.15, alpha: 0.75, flash: 0.25 },
  { scale: 1.3, alpha: 0.45, flash: 0 },
  { scale: 1.45, alpha: 0.2, flash: 0 },
] as const;

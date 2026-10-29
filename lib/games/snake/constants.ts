import type { FruitName } from "./sprites";
// Snake original de SERPENTINA (SPEC 09). Mundo lógico fijo: el canvas se escala por CSS.
export const W = 800;
export const H = 600;
// ── Tablero cuadrado de 20 × 20 celdas, centrado en el 4:3 ──
export const COLS = 20;
export const ROWS = 20;
export const CELL = 30;
export const BOARD_X = (W - COLS * CELL) / 2; // 100
export const BOARD_Y = 0;
// ── Serpiente ──
// Cabeza primero, mirando a la derecha.
export const START_CELLS = [
  { x: 6, y: 10 },
  { x: 5, y: 10 },
  { x: 4, y: 10 },
  { x: 3, y: 10 },
] as const;
export const START_DIR = "right";
export const START_LIVES = 3;
export const QUEUE_MAX = 2; // giros guardados en el búfer
// ── Velocidad: tick de max(60, 140 − (nivel − 1) × 10) ms ──
export const BASE_TICK = 140;
export const TICK_STEP = 10;
export const MIN_TICK = 60;
// ── Fruta y niveles ──
export const FRUITS_PER_LEVEL = 5;
export const BONUS_EVERY = 5; // frutas normales entre bonus
export const BONUS_MS = 6000;
export const BONUS_FRUIT: FruitName = "pineapple";
export const POINTS_FRUIT = 10; // × nivel
export const POINTS_BONUS = 50; // × nivel
export const GROW_FRUIT = 1;
export const GROW_BONUS = 3;
// ── Dibujo ──
export const FRUIT_DRAW_H = 28; // alto del sprite dentro de la celda de 30
export const BONUS_BAR = { w: 24, h: 3 } as const;
export const FLASH_MS = 150;
export const MAX_DT = 50; // ms: límite del dt del frame
// Paleta: hex de los tokens de app/globals.css (el canvas no lee variables CSS).
export const PALETTE = {
  bg: "#000",
  grid: "rgba(255,255,255,0.06)", // --line-2
  border: "#00ff88", // --green (color de SERPENTINA)
  head: "#00ff88", // --green
  body: "#00ff88", // --green
  bonusGlow: "#ffcf3a", // --gold
  bonusBar: "#ffcf3a", // --gold
  flash: "#e6e9ff", // --ink
  prompt: "#8a8fb5", // --ink-dim
  fruitFallback: "#ff006e", // --magenta: círculo si fruits.png no carga
} as const;

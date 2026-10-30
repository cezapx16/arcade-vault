import type { SkinId } from "@/lib/games/skins";
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
// ── Skins ── (presentación: colores y glow; las reglas no cambian)
// Colores en #rrggbb (dim() y el halo del bonus los descomponen), salvo grid.
export type Palette = {
  bg: string;
  grid: string;
  border: string;
  borderAlpha: number; // la pared se ve, pero no compite con la serpiente
  head: string;
  headCore: string; // punto más caliente del tubo
  body: string;
  bodyCore: string; // núcleo del tubo
  bonusGlow: string;
  bonusBar: string;
  flash: string;
  flashGlow: string;
  prompt: string; // texto "PULSA W A S D"
  fruitFallback: string; // círculo si fruits.png no carga
};
// shadowBlur por elemento (px lógicos).
export type Glow = {
  tube: number;
  head: number;
  border: number;
  bar: number;
  flash: number;
};
export type Skin = { palette: Palette; glow: Glow };
export const SKINS: Record<SkinId, Skin> = {
  // Sin juego original: colores planos del primer paso del motor (spec 09, paso 3), sin glow.
  clasico: {
    palette: {
      bg: "#000000", // spec 09 paso 3
      grid: "rgba(255,255,255,0.06)", // spec 09 paso 3 (--line-2)
      border: "#00ff88", // spec 09 paso 3 (--green)
      borderAlpha: 1, // pared plana
      head: "#00ff88", // spec 09 paso 3 (--green)
      headCore: "#00ff88", // plano: sin núcleo
      body: "#00ff88", // spec 09 paso 3 (--green)
      bodyCore: "#00ff88", // plano: sin núcleo
      bonusGlow: "#ffcf3a", // spec 09 paso 3 (--gold)
      bonusBar: "#ffcf3a", // spec 09 paso 3 (--gold)
      flash: "#e6e9ff", // spec 09 paso 3 (--ink)
      flashGlow: "#e6e9ff",
      prompt: "#8a8fb5", // spec 09 paso 3 (--ink-dim)
      fruitFallback: "#ff006e", // spec 09 paso 3 (--magenta)
    },
    glow: { tube: 0, head: 0, border: 0, bar: 0, flash: 0 },
  },
  // Paleta neón de la plataforma: hex de los tokens de app/globals.css (el canvas no lee variables CSS).
  // Lo único que brilla de verdad es la serpiente: un tubo de luz verde con núcleo casi blanco
  // que se enfría hacia la cola. La rejilla y la pared van en el mismo verde, pero apagadas;
  // la fruta es pixel art sin glow, y solo la piña bonus lleva un halo dorado que late.
  neon: {
    palette: {
      bg: "#000",
      grid: "rgba(0,255,136,0.05)", // --green muy apagado: la rejilla es parte del mundo de la serpiente
      border: "#00ff88", // --green (color de SERPENTINA)
      borderAlpha: 0.55, // la pared se ve, pero no compite con la serpiente
      head: "#00ff88", // --green
      headCore: "#f2fff8", // punto más caliente del tubo
      body: "#00ff88", // --green
      bodyCore: "#b9ffdd", // núcleo del tubo, verde casi blanco
      bonusGlow: "#ffcf3a", // --gold
      bonusBar: "#ffcf3a", // --gold
      flash: "#e6e9ff", // --ink
      flashGlow: "#00ff88", // --green
      prompt: "#8a8fb5", // --ink-dim
      fruitFallback: "#ff006e", // --magenta: círculo si fruits.png no carga
    },
    glow: {
      tube: 14, // una sola pasada sobre todo el cuerpo
      head: 18,
      border: 8,
      bar: 6,
      flash: 10,
    },
  },
  // Terminal de fósforo ámbar (SERPENTINA ya es verde): serpiente, pared y bonus por luminosidad.
  retro: {
    palette: {
      bg: "#0c0700", // negro con tinte de fósforo ámbar
      grid: "rgba(255,176,0,0.06)", // fósforo ámbar casi apagado
      border: "#ffb000", // fósforo ámbar
      borderAlpha: 0.6,
      head: "#ffe9bf", // fósforo ámbar saturado al blanco
      headCore: "#fff8ea",
      body: "#ffb000", // fósforo ámbar
      bodyCore: "#ffd27a", // fósforo ámbar claro
      bonusGlow: "#ffd27a", // fósforo ámbar claro
      bonusBar: "#ffe9bf", // fósforo ámbar saturado al blanco
      flash: "#fff8ea",
      flashGlow: "#ffb000",
      prompt: "#c99a4c", // fósforo ámbar medio
      fruitFallback: "#ffe9bf",
    },
    glow: { tube: 4, head: 4, border: 3, bar: 3, flash: 4 },
  },
  // Menta sobre noche malva: el verde de SERPENTINA en pastel, bonus vainilla.
  pastel: {
    palette: {
      bg: "#0d0c15", // noche malva
      grid: "rgba(184,240,200,0.05)", // menta casi apagada
      border: "#b8f0c8", // menta
      borderAlpha: 0.6,
      head: "#c8f5d6", // menta clara
      headCore: "#f4fff8",
      body: "#a8ecc0", // menta
      bodyCore: "#e0fbe9", // menta casi blanca
      bonusGlow: "#fff0a0", // vainilla
      bonusBar: "#fff0a0", // vainilla
      flash: "#f4f1ff", // lavanda casi blanca
      flashGlow: "#b8f0c8",
      prompt: "#a9a6c4", // lavanda gris
      fruitFallback: "#ffb3d1", // rosa chicle
    },
    glow: { tube: 6, head: 6, border: 4, bar: 4, flash: 5 },
  },
};
// Tubo de neón de la serpiente (px lógicos; la celda mide 30).
export const TUBE = {
  width: 18,
  core: 5,
  headCore: 4.5,
  haloAlpha: 0.45,
  tailAlpha: 0.35, // brillo del último tramo (la cabeza es 1)
} as const;

import {
  BASE_TICK,
  BOARD_X,
  BOARD_Y,
  BONUS_BAR,
  CELL,
  COLS,
  FLASH_MS,
  FRUIT_DRAW_H,
  MIN_TICK,
  ROWS,
  TICK_STEP,
  TUBE,
  type Skin,
} from "./constants";
import { FRUIT_H, FRUITS, type FruitName } from "./sprites";
export type Cell = { x: number; y: number }; // columna y fila, de 0 a 19
export type Dir = "up" | "down" | "left" | "right";
export type Flash = { cell: Cell; elapsed: number }; // elapsed en ms
const DELTAS: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};
// ── Reglas ──
export const tickFor = (level: number) =>
  Math.max(MIN_TICK, BASE_TICK - (level - 1) * TICK_STEP);
export const isOpposite = (a: Dir, b: Dir) => OPPOSITE[a] === b;
export const step = (cell: Cell, dir: Dir): Cell => ({
  x: cell.x + DELTAS[dir].x,
  y: cell.y + DELTAS[dir].y,
});
export const inBounds = (c: Cell) =>
  c.x >= 0 && c.x < COLS && c.y >= 0 && c.y < ROWS;
export const sameCell = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
// Celda libre al azar, con la misma probabilidad para todas. null si el tablero está lleno.
export function randomFreeCell(taken: Cell[]): Cell | null {
  const busy = new Set(taken.map((c) => c.y * COLS + c.x));
  const free: Cell[] = [];
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      if (!busy.has(y * COLS + x)) free.push({ x, y });
  return free.length ? free[Math.floor(Math.random() * free.length)] : null;
}
// ── Dibujo ── (coordenadas de celda → px lógicos del tablero)
const px = (c: Cell) => ({ x: BOARD_X + c.x * CELL, y: BOARD_Y + c.y * CELL });
// Oscurece un hex #rrggbb hacia el negro del fondo (k = 1 → igual, k = 0 → negro).
const dim = (hex: string, k: number, alpha = 1) => {
  const v = parseInt(hex.slice(1), 16);
  const r = Math.round(((v >> 16) & 255) * k);
  const g = Math.round(((v >> 8) & 255) * k);
  const b = Math.round((v & 255) * k);
  return alpha === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
};
const center = (c: Cell) => ({
  x: BOARD_X + c.x * CELL + CELL / 2,
  y: BOARD_Y + c.y * CELL + CELL / 2,
});
export function drawBoard(
  ctx: CanvasRenderingContext2D,
  { palette, glow }: Skin,
) {
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < COLS; i++) {
    const x = BOARD_X + i * CELL + 0.5;
    ctx.moveTo(x, BOARD_Y);
    ctx.lineTo(x, BOARD_Y + ROWS * CELL);
  }
  for (let i = 1; i < ROWS; i++) {
    const y = BOARD_Y + i * CELL + 0.5;
    ctx.moveTo(BOARD_X, y);
    ctx.lineTo(BOARD_X + COLS * CELL, y);
  }
  ctx.stroke();
  // Borde de 2 px dentro del tablero: es la pared que mata. Brilla menos que la serpiente.
  ctx.save();
  ctx.strokeStyle = palette.border;
  ctx.globalAlpha = palette.borderAlpha;
  ctx.shadowColor = palette.border;
  ctx.shadowBlur = glow.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(BOARD_X + 1, BOARD_Y + 1, COLS * CELL - 2, ROWS * CELL - 2);
  ctx.restore();
}
// La serpiente es un tubo de neón continuo por los centros de sus celdas, con núcleo claro.
// Se enfría hacia la cola: el brillo baja de 1 a TUBE.tailAlpha.
// El glow es una sola pasada sobre todo el trazo, así que no crece con la longitud.
export function drawSnake(
  ctx: CanvasRenderingContext2D,
  snake: Cell[],
  { palette, glow }: Skin,
) {
  if (snake.length === 0) return;
  const pts = snake.map(center);
  const h = pts[0];
  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(h.x, h.y);
    for (const p of pts) ctx.lineTo(p.x, p.y);
  };
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Halo: un único trazo con shadowBlur.
  ctx.strokeStyle = palette.body;
  ctx.globalAlpha = TUBE.haloAlpha;
  ctx.shadowColor = palette.body;
  ctx.shadowBlur = glow.tube;
  ctx.lineWidth = TUBE.width;
  trace();
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Tubo y núcleo en un solo trazo cada uno. El enfriamiento hacia la cola es un degradado
  // lineal de la cabeza a la cola: con la serpiente enroscada es aproximado, pero sin costuras.
  ctx.globalAlpha = 1;
  const tail = pts[pts.length - 1];
  const fade = (hex: string) => {
    if (Math.hypot(tail.x - h.x, tail.y - h.y) < CELL) return hex;
    const g = ctx.createLinearGradient(h.x, h.y, tail.x, tail.y);
    g.addColorStop(0, hex);
    g.addColorStop(1, dim(hex, TUBE.tailAlpha));
    return g;
  };
  ctx.strokeStyle = fade(palette.body);
  ctx.lineWidth = TUBE.width;
  ctx.stroke();
  ctx.strokeStyle = fade(palette.bodyCore);
  ctx.lineWidth = TUBE.core;
  ctx.stroke();
  // Cabeza: el punto más caliente del tubo.
  ctx.globalAlpha = 1;
  ctx.shadowColor = palette.head;
  ctx.shadowBlur = glow.head;
  ctx.fillStyle = palette.head;
  ctx.beginPath();
  ctx.arc(h.x, h.y, TUBE.width / 2 + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = palette.headCore;
  ctx.beginPath();
  ctx.arc(h.x, h.y, TUBE.headCore, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
// Sprite escalado a FRUIT_DRAW_H de alto, centrado en su celda. Sin hoja, un círculo.
// La fruta no brilla: el pixel art ya tiene su color y el neón es de la serpiente.
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  cell: Cell,
  name: FruitName,
  { palette }: Skin,
) {
  const { x, y } = px(cell);
  if (!img) {
    ctx.fillStyle = palette.fruitFallback;
    ctx.beginPath();
    ctx.arc(x + CELL / 2, y + CELL / 2, CELL / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const s = FRUITS[name];
  const dh = FRUIT_DRAW_H;
  const dw = (s.w * dh) / FRUIT_H;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    img,
    s.x,
    0,
    s.w,
    FRUIT_H,
    x + (CELL - dw) / 2,
    y + (CELL - dh) / 2,
    dw,
    dh,
  );
}
// Halo dorado detrás de la piña bonus. Late, y más rápido en los últimos 2 s.
export function drawBonusGlow(
  ctx: CanvasRenderingContext2D,
  cell: Cell,
  remaining: number,
  { palette }: Skin,
) {
  const { x, y } = center(cell);
  const speed = remaining < 2000 ? 90 : 260;
  const pulse = 0.5 + 0.5 * Math.sin(remaining / speed);
  const r = CELL * 0.75;
  const g = ctx.createRadialGradient(x, y, 2, x, y, r);
  g.addColorStop(0, palette.bonusGlow);
  g.addColorStop(1, dim(palette.bonusGlow, 1, 0));
  ctx.save();
  ctx.globalAlpha = 0.35 + 0.35 * pulse;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
// Barra de tiempo del bonus en la parte baja de su celda; fraction va de 1 a 0.
export function drawBonusBar(
  ctx: CanvasRenderingContext2D,
  cell: Cell,
  fraction: number,
  { palette, glow }: Skin,
) {
  const { x, y } = px(cell);
  ctx.save();
  ctx.fillStyle = palette.bonusBar;
  ctx.shadowColor = palette.bonusBar;
  ctx.shadowBlur = glow.bar;
  ctx.fillRect(
    x + (CELL - BONUS_BAR.w) / 2,
    y + CELL - BONUS_BAR.h,
    BONUS_BAR.w * Math.max(0, fraction),
    BONUS_BAR.h,
  );
  ctx.restore();
}
// Destello de la celda donde se comió una fruta: un anillo que se abre y se apaga en FLASH_MS.
export function drawFlash(
  ctx: CanvasRenderingContext2D,
  flash: Flash,
  { palette, glow }: Skin,
) {
  const t = Math.min(flash.elapsed / FLASH_MS, 1);
  const { x, y } = center(flash.cell);
  ctx.save();
  ctx.globalAlpha = 1 - t;
  ctx.strokeStyle = palette.flash;
  ctx.shadowColor = palette.flashGlow;
  ctx.shadowBlur = glow.flash;
  ctx.lineWidth = 3 - 2 * t;
  ctx.beginPath();
  ctx.arc(x, y, CELL * (0.35 + 0.55 * t), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

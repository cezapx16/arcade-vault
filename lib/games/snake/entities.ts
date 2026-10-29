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
  PALETTE,
  ROWS,
  TICK_STEP,
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
export function drawBoard(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = PALETTE.grid;
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
  // Borde de 2 px dentro del tablero: es la pared que mata.
  ctx.strokeStyle = PALETTE.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(BOARD_X + 1, BOARD_Y + 1, COLS * CELL - 2, ROWS * CELL - 2);
}
export function drawSnake(ctx: CanvasRenderingContext2D, snake: Cell[]) {
  for (let i = snake.length - 1; i >= 0; i--) {
    const { x, y } = px(snake[i]);
    ctx.fillStyle = i === 0 ? PALETTE.head : PALETTE.body;
    ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
  }
}
// Sprite escalado a FRUIT_DRAW_H de alto, centrado en su celda. Sin hoja, un círculo.
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  cell: Cell,
  name: FruitName,
) {
  const { x, y } = px(cell);
  if (!img) {
    ctx.fillStyle = PALETTE.fruitFallback;
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
// Barra de tiempo del bonus en la parte baja de su celda; fraction va de 1 a 0.
export function drawBonusBar(
  ctx: CanvasRenderingContext2D,
  cell: Cell,
  fraction: number,
) {
  const { x, y } = px(cell);
  ctx.fillStyle = PALETTE.bonusBar;
  ctx.fillRect(
    x + (CELL - BONUS_BAR.w) / 2,
    y + CELL - BONUS_BAR.h,
    BONUS_BAR.w * Math.max(0, fraction),
    BONUS_BAR.h,
  );
}
// Destello de la celda donde se comió una fruta: crece y se desvanece en FLASH_MS.
export function drawFlash(ctx: CanvasRenderingContext2D, flash: Flash) {
  const t = Math.min(flash.elapsed / FLASH_MS, 1);
  const { x, y } = px(flash.cell);
  const grow = t * CELL * 0.5;
  ctx.globalAlpha = 1 - t;
  ctx.strokeStyle = PALETTE.flash;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - grow / 2, y - grow / 2, CELL + grow, CELL + grow);
  ctx.globalAlpha = 1;
}

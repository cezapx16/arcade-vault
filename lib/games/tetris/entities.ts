import { COLS, PALETTE, PIECE_TYPES, PIECES, ROWS } from "./constants";
export type Shape = number[][];
export type Board = number[][];
export type Piece = { type: number; shape: Shape; x: number; y: number };
export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}
export function randomPiece(): Piece {
  const type = Math.floor(Math.random() * PIECE_TYPES) + 1;
  const shape = PIECES[type]!.map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}
export function collide(board: Board, shape: Shape, ox: number, oy: number) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}
export function rotateCW(shape: Shape): Shape {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = Array.from({ length: cols }, () =>
    new Array<number>(rows).fill(0),
  );
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}
// Fila donde aterrizaría la pieza (pieza fantasma y hard drop).
export function ghostY(board: Board, piece: Piece) {
  let gy = piece.y;
  while (!collide(board, piece.shape, piece.x, gy + 1)) gy++;
  return gy;
}
// Elimina las filas completas del tablero (lo modifica, como el original) y devuelve cuántas.
export function clearLines(board: Board) {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every((v) => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array<number>(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  return cleared;
}
// shadowBlur no sigue a la transformación del contexto: se escala a mano por el devicePixelRatio.
export function glow(
  ctx: CanvasRenderingContext2D,
  color: string,
  blur: number,
) {
  const m = ctx.getTransform();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur * Math.hypot(m.a, m.b);
}
// Dibuja la celda (x, y) de una rejilla cuyo origen está en (ox, oy), con glow opcional.
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  x: number,
  y: number,
  colorIndex: number,
  size: number,
  alpha = 1,
  blur = 0,
) {
  if (!colorIndex) return;
  const color = PALETTE.pieces[colorIndex]!;
  const px = ox + x * size;
  const py = oy + y * size;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (blur) glow(ctx, color, blur);
  ctx.fillStyle = color;
  ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
  // Los filos no llevan glow: solo el cuerpo del bloque ilumina.
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.highlight;
  ctx.fillRect(px + 1, py + 1, size - 2, 3);
  ctx.fillStyle = PALETTE.shade;
  ctx.fillRect(px + 1, py + size - 4, size - 2, 3);
  ctx.restore();
}

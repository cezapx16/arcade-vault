import {
  CELL,
  ROAD_BOT,
  ROAD_TOP,
  ROW_MEDIAN,
  ROW_NORTH,
  ROW_SOUTH,
  STATUS_Y,
  W,
  type Skin,
} from "./constants";
import type { Lane } from "./lanes";
// Lo que no cambia entre frames, pintado una vez por skin (SPEC 13).
// Cada capa va a resolución física (lógico × dpr) y se dibuja en px lógicos, así que se copia 1:1.
// El glow se hornea con los mismos shadowBlur que el dibujo directo, que tampoco los escala por dpr.
export type RenderCache = {
  board: HTMLCanvasElement; // 800×560 lógicos: carriles, líneas y zonas seguras con glow
};
function layer(w: number, h: number, dpr: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(w * dpr);
  canvas.height = Math.ceil(h * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { canvas, ctx };
}
const rowY = (row: number) => row * CELL;
// Tablero sin las rayas de flujo del río, que se mueven con los paquetes y se pintan en cada frame.
function paintBoard(
  ctx: CanvasRenderingContext2D,
  lanes: Lane[],
  { palette, glow }: Skin,
) {
  for (const lane of lanes) {
    ctx.fillStyle = lane.kind === "data" ? palette.data : palette.road;
    ctx.fillRect(0, rowY(lane.row), W, CELL);
  }
  // Líneas discontinuas entre los carriles de la autopista.
  ctx.fillStyle = palette.laneLine;
  for (let row = ROAD_TOP + 1; row <= ROAD_BOT; row++)
    for (let x = 0; x < W; x += CELL) ctx.fillRect(x + 8, rowY(row) - 1, 24, 2);
  // Zonas seguras con su borde hacia el peligro.
  ctx.save();
  ctx.shadowColor = palette.safeEdge;
  ctx.shadowBlur = glow.edge;
  for (const row of [ROW_NORTH, ROW_MEDIAN, ROW_SOUTH]) {
    const y = rowY(row);
    ctx.fillStyle = palette.safe;
    ctx.fillRect(0, y, W, CELL);
    ctx.fillStyle = palette.safeEdge;
    if (row !== ROW_NORTH) ctx.fillRect(0, y, W, 2);
    if (row !== ROW_SOUTH) ctx.fillRect(0, y + CELL - 2, W, 2);
  }
  ctx.restore();
}
// Se crea al arrancar el motor y en cada setSkin; nunca dentro del loop.
export function createRenderCache(
  skin: Skin,
  lanes: Lane[],
  dpr: number,
): RenderCache {
  const board = layer(W, STATUS_Y, dpr);
  paintBoard(board.ctx, lanes, skin);
  return { board: board.canvas };
}

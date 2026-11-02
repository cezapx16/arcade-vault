import {
  CELL,
  H,
  HOP_MS,
  HOP_STRETCH,
  PLAYER_BOX,
  PLAYER_SIZE,
  PROMPT,
  PROMPT_POS,
  ROAD_BOT,
  ROAD_TOP,
  ROW_MEDIAN,
  ROW_NORTH,
  ROW_SOUTH,
  STATUS_Y,
  VEHICLE_INSET,
  W,
  type Skin,
} from "./constants";
import { LOOP, LOOP_MAX, LOOP_MIN, speedFor, type Lane } from "./lanes";
export type HopDir = "up" | "down" | "left" | "right";
// x: borde izquierdo de la celda en px (puede no ser múltiplo de 40 tras el arrastre del río).
// hop: ms que quedan de la animación; off: desplazamiento visual al empezar el salto.
export type Player = {
  x: number;
  row: number;
  hop: number;
  hopDir: HopDir;
  offX: number;
  offY: number;
};
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // ms restantes
};
// ── Reglas ──
// Mueve todas las entidades y las recicla por el lado contrario al salir del bucle.
export function stepLanes(lanes: Lane[], dt: number, trip: number) {
  const k = speedFor(trip);
  for (const lane of lanes) {
    const dx = (lane.base * k * lane.dir * dt) / 1000;
    for (let i = 0; i < lane.xs.length; i++) {
      let x = lane.xs[i] + dx;
      if (lane.dir === 1 && x > LOOP_MAX) x -= LOOP;
      if (lane.dir === -1 && x + lane.len < LOOP_MIN) x += LOOP;
      lane.xs[i] = x;
    }
  }
}
export const laneAt = (lanes: Lane[], row: number) =>
  lanes.find((l) => l.row === row);
// Velocidad con signo del carril en px/s.
export const laneSpeed = (lane: Lane, trip: number) =>
  lane.base * speedFor(trip) * lane.dir;
// Caja horizontal del saltador (26 px centrados en la celda).
export const playerBox = (x: number) => ({
  l: x + PLAYER_BOX.inset,
  r: x + PLAYER_BOX.inset + PLAYER_BOX.size,
});
// Las dos cajas se solapan en la misma fila de la autopista.
export function hitsVehicle(lane: Lane, x: number) {
  const p = playerBox(x);
  return lane.xs.some(
    (vx) => p.l < vx + lane.len - VEHICLE_INSET && vx + VEHICLE_INSET < p.r,
  );
}
// Paquete bajo el centro del saltador, o -1 si no hay ninguno.
export function supportOf(lane: Lane, x: number) {
  const c = x + CELL / 2;
  return lane.xs.findIndex((px) => c >= px && c <= px + lane.len);
}
// ── Dibujo ── (px lógicos; el tablero ocupa y = 0–560)
const rowY = (row: number) => row * CELL;
export function drawBoard(
  ctx: CanvasRenderingContext2D,
  lanes: Lane[],
  { palette, glow }: Skin,
) {
  // Río de datos y sus rayas de flujo, que avanzan con los paquetes de cada carril.
  for (const lane of lanes) {
    const y = rowY(lane.row);
    if (lane.kind === "data") {
      ctx.fillStyle = palette.data;
      ctx.fillRect(0, y, W, CELL);
      const phase = ((lane.xs[0] % CELL) + CELL) % CELL;
      ctx.fillStyle = palette.dataFlow;
      for (let x = phase - CELL; x < W; x += CELL)
        ctx.fillRect(x, y + CELL / 2 - 1, CELL / 2, 2);
    } else {
      ctx.fillStyle = palette.road;
      ctx.fillRect(0, y, W, CELL);
    }
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
export function drawLane(
  ctx: CanvasRenderingContext2D,
  lane: Lane,
  { palette, glow }: Skin,
) {
  const y = rowY(lane.row);
  ctx.save();
  if (lane.kind === "data") {
    // Paquete de datos: 30 px de alto.
    ctx.fillStyle = palette.packet;
    ctx.shadowColor = palette.packet;
    ctx.shadowBlur = glow.packet;
    for (const x of lane.xs) ctx.fillRect(x, y + 5, lane.len, 30);
  } else {
    // Vehículo: 28 px de alto, con el faro en el frente según el sentido.
    const color = palette[lane.vehicle ?? "coche"];
    for (const x of lane.xs) {
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = glow.vehicle;
      ctx.fillRect(x, y + 6, lane.len, 28);
      ctx.fillStyle = palette.headlight;
      ctx.shadowBlur = 0;
      const fx = lane.dir === 1 ? x + lane.len - 6 : x + 2;
      ctx.fillRect(fx, y + 10, 4, 6);
      ctx.fillRect(fx, y + 24, 4, 6);
    }
  }
  ctx.restore();
}
// Rombo de luz centrado en su celda; durante el salto se estira en la dirección del movimiento.
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  p: Player,
  { palette, glow }: Skin,
) {
  const t = p.hop / HOP_MS; // 1 al empezar el salto, 0 al aterrizar
  const cx = p.x + CELL / 2 + p.offX * t;
  const cy = rowY(p.row) + CELL / 2 + p.offY * t;
  const s = 1 + HOP_STRETCH * Math.sin(Math.PI * t);
  const vertical = p.hopDir === "up" || p.hopDir === "down";
  const hw = (PLAYER_SIZE / 2) * (vertical ? 1 / s : s);
  const hh = (PLAYER_SIZE / 2) * (vertical ? s : 1 / s);
  ctx.save();
  ctx.fillStyle = palette.player;
  ctx.shadowColor = palette.player;
  ctx.shadowBlur = glow.player;
  ctx.beginPath();
  ctx.moveTo(cx, cy - hh);
  ctx.lineTo(cx + hw, cy);
  ctx.lineTo(cx, cy + hh);
  ctx.lineTo(cx - hw, cy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  max: number,
  { palette }: Skin,
) {
  ctx.save();
  ctx.fillStyle = palette.death;
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / max);
    ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
  }
  ctx.restore();
}
export function drawPrompt(ctx: CanvasRenderingContext2D, { palette }: Skin) {
  ctx.save();
  ctx.fillStyle = palette.ink;
  ctx.font = "20px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(PROMPT, PROMPT_POS.x, PROMPT_POS.y);
  ctx.restore();
}
// Fondo de la franja de estado (y = 560–600); su contenido llega en el paso 3.
export function drawStatusBg(ctx: CanvasRenderingContext2D, { palette }: Skin) {
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, STATUS_Y, W, H - STATUS_Y);
}

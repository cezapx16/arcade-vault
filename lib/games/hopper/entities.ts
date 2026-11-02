import {
  CELL,
  H,
  HOP_MS,
  HOP_STRETCH,
  PLAYER_BOX,
  PLAYER_SIZE,
  PROMPT,
  PROMPT_POS,
  ROZON_FX_MS,
  ROZON_FX_RISE,
  ROZON_PX,
  STREAK_MS,
  STATUS_Y,
  TIME_LOW_MS,
  TRIP_MS,
  VEHICLE_INSET,
  W,
  type Skin,
} from "./constants";
import { LOOP, LOOP_MAX, LOOP_MIN, speedFor, type Lane } from "./lanes";
import { blit, vehicleKey, type RenderCache } from "./render-cache";
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
export type RozonFx = { x: number; y: number; text: string; life: number }; // "ROZÓN x3", 600 ms
export type Status = {
  tripMs: number;
  heading: "up" | "down";
  streak: number;
  streakMs: number;
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
// Volteo: cada carril invierte su sentido y cada entidad queda en su posición reflejada.
export function mirrorLanes(lanes: Lane[]) {
  for (const lane of lanes) {
    lane.dir = lane.dir === 1 ? -1 : 1;
    lane.xs = lane.xs.map((x) => W - x - lane.len);
  }
}
// Rozón: un vehículo de la fila que se acerca al saltador con un hueco de 1 a 16 px entre cajas.
export function rozonOf(lane: Lane, x: number) {
  const p = playerBox(x);
  return lane.xs.some((vx) => {
    const l = vx + VEHICLE_INSET;
    const r = vx + lane.len - VEHICLE_INSET;
    const gap = lane.dir === 1 ? p.l - r : l - p.r;
    return gap >= 1 && gap <= ROZON_PX;
  });
}
// Paquete bajo el centro del saltador, o -1 si no hay ninguno.
export function supportOf(lane: Lane, x: number) {
  const c = x + CELL / 2;
  return lane.xs.findIndex((px) => c >= px && c <= px + lane.len);
}
// ── Dibujo ── (px lógicos; el tablero ocupa y = 0–560)
const rowY = (row: number) => row * CELL;
// Tablero cacheado (carriles, líneas y zonas seguras con glow) y encima las rayas de flujo
// del río, que avanzan con los paquetes de cada carril.
export function drawBoard(
  ctx: CanvasRenderingContext2D,
  lanes: Lane[],
  cache: RenderCache,
  { palette }: Skin,
) {
  ctx.drawImage(cache.board, 0, 0, W, STATUS_Y);
  ctx.fillStyle = palette.dataFlow;
  for (const lane of lanes) {
    if (lane.kind !== "data") continue;
    const y = rowY(lane.row);
    const phase = ((lane.xs[0] % CELL) + CELL) % CELL;
    for (let x = phase - CELL; x < W; x += CELL)
      ctx.fillRect(x, y + CELL / 2 - 1, CELL / 2, 2);
  }
}
// Paquetes y vehículos (con su haz, faros y glow) son sprites del skin actual: aquí solo se copian.
export function drawLane(
  ctx: CanvasRenderingContext2D,
  lane: Lane,
  cache: RenderCache,
) {
  const y = rowY(lane.row);
  const s = lane.vehicle
    ? cache.vehicles.get(vehicleKey(lane.vehicle, lane.len, lane.dir))
    : cache.packets.get(lane.len);
  if (!s) return;
  for (const x of lane.xs) blit(ctx, cache, s, x, y);
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
  // Núcleo: el punto más caliente de la pantalla.
  if (palette.playerCore !== palette.player) {
    ctx.fillStyle = palette.playerCore;
    ctx.shadowBlur = glow.player / 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh * 0.42);
    ctx.lineTo(cx + hw * 0.42, cy);
    ctx.lineTo(cx, cy + hh * 0.42);
    ctx.lineTo(cx - hw * 0.42, cy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  max: number,
  cache: RenderCache,
) {
  ctx.save();
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / max);
    blit(ctx, cache, cache.particle, p.x, p.y);
  }
  ctx.restore();
}
// Aviso de arranque sobre una placa: en y = 500 pasan las motos de la fila 12.
export function drawPrompt(ctx: CanvasRenderingContext2D, { palette }: Skin) {
  ctx.save();
  ctx.font = "20px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const w = ctx.measureText(PROMPT).width + 32;
  ctx.fillStyle = palette.plate;
  ctx.fillRect(PROMPT_POS.x - w / 2, PROMPT_POS.y - 16, w, 32);
  ctx.strokeStyle = palette.plateEdge;
  ctx.lineWidth = 1;
  ctx.strokeRect(PROMPT_POS.x - w / 2 + 0.5, PROMPT_POS.y - 15.5, w - 1, 31);
  ctx.fillStyle = palette.ink;
  ctx.fillText(PROMPT, PROMPT_POS.x, PROMPT_POS.y);
  ctx.restore();
}
// Texto "ROZÓN xN" que sube 20 px y se desvanece, con un destello que se abre bajo él.
export function drawRozonFx(
  ctx: CanvasRenderingContext2D,
  fx: RozonFx[],
  { palette, glow }: Skin,
) {
  ctx.save();
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = palette.rozon;
  ctx.strokeStyle = palette.rozon;
  ctx.shadowColor = palette.rozon;
  ctx.shadowBlur = glow.rozon;
  for (const f of fx) {
    const t = 1 - f.life / ROZON_FX_MS; // 0 → 1
    ctx.globalAlpha = 1 - t;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(f.x, f.y + CELL / 2, 14 + 18 * t, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillText(f.text, f.x, f.y - 6 - ROZON_FX_RISE * t);
  }
  ctx.restore();
}
// Franja de estado (y = 560–600): TIEMPO, sentido del viaje y RACHA. No se voltea.
export function drawStatus(
  ctx: CanvasRenderingContext2D,
  s: Status,
  { palette, glow }: Skin,
) {
  ctx.save();
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, STATUS_Y, W, H - STATUS_Y);
  ctx.textBaseline = "middle";
  ctx.font = "11px monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = palette.label;
  ctx.fillText("TIEMPO", 20, 572);
  // Barra de 360 px que se vacía en 45 s; con 10 s o menos cambia de color.
  ctx.fillStyle = palette.safe;
  ctx.fillRect(20, 582, 360, 6);
  const timeColor = s.tripMs <= TIME_LOW_MS ? palette.timeLow : palette.timeOk;
  ctx.fillStyle = timeColor;
  ctx.shadowColor = timeColor;
  ctx.shadowBlur = glow.status;
  ctx.fillRect(20, 582, 360 * Math.max(0, s.tripMs / TRIP_MS), 6);
  ctx.shadowBlur = 0;
  ctx.font = "16px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = palette.ink;
  ctx.fillText(s.heading === "up" ? "▲ IDA" : "▼ VUELTA", 480, 586);
  ctx.textAlign = "left";
  ctx.fillStyle = s.streak > 1 ? palette.rozon : palette.text;
  ctx.fillText(`x${s.streak}`, 620, 586);
  // Caducidad de la racha: 120 px que se vacían en 3 s. Con x1 no se ve.
  if (s.streak > 1) {
    ctx.shadowColor = palette.rozon;
    ctx.shadowBlur = glow.status;
    ctx.fillRect(660, 584, 120 * Math.max(0, s.streakMs / STREAK_MS), 4);
  }
  ctx.restore();
}

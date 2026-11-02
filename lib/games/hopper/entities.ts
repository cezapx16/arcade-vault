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
  ROZON_FX_MS,
  ROZON_FX_RISE,
  ROZON_PX,
  STREAK_MS,
  ROAD_TOP,
  ROW_MEDIAN,
  ROW_NORTH,
  ROW_SOUTH,
  STATUS_Y,
  TIME_LOW_MS,
  TRIP_MS,
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
  const glass = palette.bodyAlpha < 1;
  ctx.save();
  if (lane.kind === "data") {
    // Paquete de datos: 30 px de alto. En cristal, con un byte marcado cada 20 px.
    ctx.strokeStyle = ctx.fillStyle = palette.packet;
    ctx.shadowColor = palette.packet;
    ctx.shadowBlur = glow.packet;
    ctx.lineWidth = 2;
    for (const x of lane.xs) {
      ctx.globalAlpha = palette.bodyAlpha;
      ctx.fillRect(x, y + 5, lane.len, 30);
      if (!glass) continue;
      ctx.globalAlpha = 0.45;
      for (let bx = x + 20; bx < x + lane.len; bx += 20)
        ctx.fillRect(bx - 1, y + 11, 2, 18);
      ctx.globalAlpha = 1;
      ctx.strokeRect(x + 1, y + 6, lane.len - 2, 28);
    }
  } else {
    // Vehículo: 28 px de alto, con el faro en el frente según el sentido.
    const color = palette[lane.vehicle ?? "coche"];
    for (const x of lane.xs) {
      const front = lane.dir === 1 ? x + lane.len : x;
      // Haz del faro: dice hacia dónde va el vehículo antes de que llegue.
      if (palette.beamAlpha > 0) {
        const reach = front + lane.dir * 56;
        const beam = ctx.createLinearGradient(front, 0, reach, 0);
        beam.addColorStop(0, palette.headlight);
        beam.addColorStop(1, "transparent");
        ctx.globalAlpha = palette.beamAlpha;
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(front, y + 12);
        ctx.lineTo(reach, y + 4);
        ctx.lineTo(reach, y + 36);
        ctx.lineTo(front, y + 28);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = palette.bodyAlpha;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 0;
      ctx.fillRect(x, y + 6, lane.len, 28);
      ctx.globalAlpha = 1;
      if (glass) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = glow.vehicle;
        ctx.strokeRect(x + 1, y + 7, lane.len - 2, 26);
      }
      ctx.fillStyle = palette.headlight;
      ctx.shadowColor = palette.headlight;
      ctx.shadowBlur = glow.vehicle / 2;
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
  { palette, glow }: Skin,
) {
  ctx.save();
  ctx.fillStyle = palette.death;
  ctx.shadowColor = palette.death;
  ctx.shadowBlur = glow.vehicle;
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / max);
    ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
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

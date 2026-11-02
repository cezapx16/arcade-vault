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
import { LANES, type Dir, type Lane, type Vehicle } from "./lanes";
// Lo que no cambia entre frames, pintado una vez por skin (SPEC 13).
// Cada capa va a resolución física (lógico × dpr) y se dibuja en px lógicos, así que se copia 1:1.
// El glow se hornea con los mismos shadowBlur que el dibujo directo, que tampoco los escala por dpr.
// Sprite con el recuadro ajustado: solo lo que se pinta (cuerpo, haz del faro y glow), sin margen vacío.
// (ox, oy) es la esquina del recuadro respecto al origen de la entidad: la x del vehículo o paquete
// y la y de su fila, o el centro de la partícula. w y h son el tamaño lógico exacto del canvas.
export type Sprite = {
  canvas: HTMLCanvasElement;
  ox: number;
  oy: number;
  w: number;
  h: number;
  pad: number; // margen lógico del glow incluido en el recuadro
};
export type RenderCache = {
  dpr: number;
  board: HTMLCanvasElement; // 800×560 lógicos: carriles, líneas y zonas seguras con glow
  vehicles: Map<string, Sprite>; // clave vehicleKey(vehicle, len, dir)
  packets: Map<number, Sprite>; // clave: len
  particle: Sprite; // cuadrado de 6×6 con su glow
};
const BEAM = 56; // largo del haz del faro por delante del vehículo
export const vehicleKey = (vehicle: Vehicle, len: number, dir: Dir) =>
  `${vehicle}:${len}:${dir}`;
function layer(w: number, h: number, dpr: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(w * dpr);
  canvas.height = Math.ceil(h * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { canvas, ctx };
}
// El shadowBlur se extiende ~1,5 veces su valor; +2 px para el antialias.
const glowPad = (blur: number) => (blur > 0 ? Math.ceil(blur * 1.5) + 2 : 1);
// Recuadro [x0, x1] × [y0, y1] en coordenadas de la entidad, más el margen del glow.
function sprite(
  dpr: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  pad: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
): Sprite {
  const ox = x0 - pad;
  const oy = y0 - pad;
  const { canvas, ctx } = layer(x1 - x0 + 2 * pad, y1 - y0 + 2 * pad, dpr);
  // El origen de la entidad queda en (-ox, -oy) dentro del sprite.
  ctx.setTransform(dpr, 0, 0, dpr, -ox * dpr, -oy * dpr);
  paint(ctx);
  return {
    canvas,
    ox,
    oy,
    w: canvas.width / dpr,
    h: canvas.height / dpr,
    pad,
  };
}
// Copia el sprite con la entidad en (x, y), ajustado a la rejilla de píxeles físicos.
export function blit(
  ctx: CanvasRenderingContext2D,
  cache: RenderCache,
  s: Sprite,
  x: number,
  y: number,
) {
  const { dpr } = cache;
  const dx = Math.round((x + s.ox) * dpr) / dpr;
  const dy = Math.round((y + s.oy) * dpr) / dpr;
  ctx.drawImage(s.canvas, dx, dy, s.w, s.h);
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
// Vehículo de 28 px de alto con el faro en el frente según el sentido y, si el skin lo tiene,
// el haz que dice hacia dónde va. Mismo dibujo que el directo de la SPEC 12, con x = 0 e y = 0.
function vehicleSprite(
  dpr: number,
  vehicle: Vehicle,
  len: number,
  dir: Dir,
  { palette, glow }: Skin,
): Sprite {
  const color = palette[vehicle];
  const glass = palette.bodyAlpha < 1;
  const beam = palette.beamAlpha > 0;
  const front = dir === 1 ? len : 0;
  const x0 = beam && dir === -1 ? -BEAM : 0;
  const x1 = beam && dir === 1 ? len + BEAM : len;
  return sprite(
    dpr,
    x0,
    beam ? 4 : 6,
    x1,
    beam ? 36 : 34,
    glowPad(glow.vehicle),
    (ctx) => {
      if (beam) {
        const reach = front + dir * BEAM;
        const g = ctx.createLinearGradient(front, 0, reach, 0);
        g.addColorStop(0, palette.headlight);
        g.addColorStop(1, "transparent");
        ctx.globalAlpha = palette.beamAlpha;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(front, 12);
        ctx.lineTo(reach, 4);
        ctx.lineTo(reach, 36);
        ctx.lineTo(front, 28);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = palette.bodyAlpha;
      ctx.fillStyle = color;
      ctx.fillRect(0, 6, len, 28);
      ctx.globalAlpha = 1;
      if (glass) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowColor = color;
        ctx.shadowBlur = glow.vehicle;
        ctx.strokeRect(1, 7, len - 2, 26);
      }
      ctx.fillStyle = palette.headlight;
      ctx.shadowColor = palette.headlight;
      ctx.shadowBlur = glow.vehicle / 2;
      const fx = dir === 1 ? len - 6 : 2;
      ctx.fillRect(fx, 10, 4, 6);
      ctx.fillRect(fx, 24, 4, 6);
    },
  );
}
// Paquete de datos de 30 px de alto. En cristal, con un byte marcado cada 20 px.
function packetSprite(dpr: number, len: number, { palette, glow }: Skin) {
  const glass = palette.bodyAlpha < 1;
  return sprite(dpr, 0, 5, len, 35, glowPad(glow.packet), (ctx) => {
    ctx.strokeStyle = ctx.fillStyle = palette.packet;
    ctx.shadowColor = palette.packet;
    ctx.shadowBlur = glow.packet;
    ctx.lineWidth = 2;
    ctx.globalAlpha = palette.bodyAlpha;
    ctx.fillRect(0, 5, len, 30);
    if (!glass) return;
    ctx.globalAlpha = 0.45;
    for (let bx = 20; bx < len; bx += 20) ctx.fillRect(bx - 1, 11, 2, 18);
    ctx.globalAlpha = 1;
    ctx.strokeRect(1, 6, len - 2, 28);
  });
}
// Partícula de la muerte: 6×6 centrada en su posición. La opacidad la pone quien la dibuja.
function particleSprite(dpr: number, { palette, glow }: Skin) {
  return sprite(dpr, -3, -3, 3, 3, glowPad(glow.vehicle), (ctx) => {
    ctx.fillStyle = palette.death;
    ctx.shadowColor = palette.death;
    ctx.shadowBlur = glow.vehicle;
    ctx.fillRect(-3, -3, 6, 6);
  });
}
// Se crea al arrancar el motor y en cada setSkin; nunca dentro del loop.
// Los vehículos se crean en los dos sentidos: tras el volteo se usa el del sentido contrario.
export function createRenderCache(
  skin: Skin,
  lanes: Lane[],
  dpr: number,
): RenderCache {
  const board = layer(W, STATUS_Y, dpr);
  paintBoard(board.ctx, lanes, skin);
  const vehicles = new Map<string, Sprite>();
  const packets = new Map<number, Sprite>();
  for (const { vehicle, len } of LANES) {
    if (!vehicle) {
      if (!packets.has(len)) packets.set(len, packetSprite(dpr, len, skin));
      continue;
    }
    for (const dir of [1, -1] as const) {
      const key = vehicleKey(vehicle, len, dir);
      if (!vehicles.has(key))
        vehicles.set(key, vehicleSprite(dpr, vehicle, len, dir, skin));
    }
  }
  return {
    dpr,
    board: board.canvas,
    vehicles,
    packets,
    particle: particleSprite(dpr, skin),
  };
}

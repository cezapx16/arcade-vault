import type { SkinId } from "@/lib/games/skins";
// Cruce de carriles de VAIVÉN (SPEC 12). Mundo lógico fijo: el canvas se escala por CSS.
export const W = 800;
export const H = 600;
// ── Tablero de 20 × 14 celdas de 40 px y franja de estado debajo ──
export const COLS = 20;
export const ROWS = 14;
export const CELL = 40;
export const STATUS_Y = ROWS * CELL; // 560
// Filas, de arriba abajo: orilla norte, río de datos, mediana, autopista y orilla sur.
export const ROW_NORTH = 0;
export const RIVER_TOP = 1;
export const RIVER_BOT = 5;
export const ROW_MEDIAN = 6;
export const ROAD_TOP = 7;
export const ROAD_BOT = 12;
export const ROW_SOUTH = 13;
// ── Saltador ──
export const START_COL = 10;
export const START_LIVES = 3;
export const HOP_MS = 90; // animación del salto; la celda lógica cambia al pulsar
export const MAX_X = (COLS - 1) * CELL; // 760
export const PLAYER_BOX = { inset: 7, size: 26 } as const; // caja de colisión centrada en la celda
export const VEHICLE_INSET = 3; // la caja del vehículo pierde 3 px por cada lado
export const PLAYER_SIZE = 28; // rombo dibujado
export const HOP_STRETCH = 0.2; // estiramiento en la dirección del salto
// ── Viajes ──
export const TRIP_MS = 45000;
export const TIME_LOW_MS = 10000; // con 10 s o menos la barra cambia de color
export const FLIP_MS = 600;
export const DYING_MS = 800;
// ── Rozón y racha ──
export const ROZON_PX = 16;
export const STREAK_MAX = 5;
export const STREAK_MS = 3000;
export const ROZON_FX_MS = 600;
export const ROZON_FX_RISE = 20;
// ── Puntos ──
export const POINTS_ROW = 10; // × racha
export const POINTS_ROZON = 50; // × racha
export const POINTS_ARRIVAL = 100; // × viaje
export const POINTS_PER_SECOND = 10;
export const MAX_SCORE = 9999999;
// ── Efectos y loop ──
export const PARTICLES = 12;
export const MAX_DT = 50; // ms: límite del dt del frame
export const PROMPT = "PULSA ↑ PARA SALIR";
export const PROMPT_POS = { x: 400, y: 500 } as const;
// ── Skins ── (presentación: colores y glow; las reglas no cambian)
export type Palette = {
  bg: string;
  safe: string; // orillas y mediana
  safeEdge: string; // borde de las zonas seguras
  road: string;
  laneLine: string; // líneas discontinuas de la autopista
  data: string; // fondo del río
  dataFlow: string; // rayas de flujo del río
  packet: string;
  moto: string;
  coche: string;
  camion: string;
  headlight: string;
  player: string;
  rozon: string;
  death: string;
  timeOk: string;
  timeLow: string;
  label: string;
  text: string;
  ink: string;
};
// shadowBlur por elemento (px lógicos).
export type Glow = {
  player: number;
  vehicle: number;
  packet: number;
  edge: number;
  rozon: number;
  status: number;
};
export type Skin = { palette: Palette; glow: Glow };
// Sin juego original: los colores planos del primer paso del motor (spec 12, paso 2), sin glow.
const CLASICO: Skin = {
  palette: {
    bg: "#000000",
    safe: "#15151f", // --bg-3
    safeEdge: "#00ff88", // --green (color de VAIVÉN)
    road: "#0a0a0f", // --bg
    laneLine: "rgba(255,255,255,0.06)", // --line-2
    data: "#0f0f18", // --bg-2
    dataFlow: "rgba(0,245,255,0.18)", // --line
    packet: "#00f5ff", // --cyan
    moto: "#ff006e", // --magenta
    coche: "#f5ff00", // --yellow
    camion: "#d97a3a", // --bronze
    headlight: "#e6e9ff", // --ink
    player: "#00ff88", // --green
    rozon: "#ffcf3a", // --gold
    death: "#ff006e", // --magenta
    timeOk: "#00ff88", // --green
    timeLow: "#ff006e", // --magenta
    label: "#8a8fb5", // --ink-dim (texto de canvas ≥ 4.5:1)
    text: "#8a8fb5", // --ink-dim
    ink: "#e6e9ff", // --ink
  },
  glow: { player: 0, vehicle: 0, packet: 0, edge: 0, rozon: 0, status: 0 },
};
// `neon` se fija en el paso 5 con /frontend-design; `retro` y `pastel` los diseña skin-designer.
// Hasta entonces son copias de `clasico` para que el selector del GameShell funcione.
export const SKINS: Record<SkinId, Skin> = {
  clasico: CLASICO,
  neon: CLASICO,
  retro: CLASICO,
  pastel: CLASICO,
};

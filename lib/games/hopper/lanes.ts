// Tabla de carriles de VAIVÉN: es lo que se ajusta al equilibrar el juego.
export type Dir = 1 | -1; // 1 = hacia la derecha
export type Vehicle = "moto" | "coche" | "camion";
export type Lane = {
  row: number; // 1–5 río, 7–12 autopista
  kind: "data" | "road";
  dir: Dir; // se invierte en cada volteo
  base: number; // px/s a ×1.0
  len: number; // largo de cada entidad en px
  vehicle: Vehicle | null; // null en el río
  xs: number[]; // x izquierda de cada entidad
};
export type LaneDef = Omit<Lane, "xs"> & { count: number };
// Sentido y velocidad en el viaje 1 (ida).
export const LANES: LaneDef[] = [
  { row: 1, kind: "data", dir: 1, base: 45, len: 160, vehicle: null, count: 3 },
  {
    row: 2,
    kind: "data",
    dir: -1,
    base: 65,
    len: 120,
    vehicle: null,
    count: 3,
  },
  { row: 3, kind: "data", dir: 1, base: 35, len: 200, vehicle: null, count: 2 },
  { row: 4, kind: "data", dir: -1, base: 75, len: 80, vehicle: null, count: 4 },
  { row: 5, kind: "data", dir: 1, base: 55, len: 120, vehicle: null, count: 3 },
  {
    row: 7,
    kind: "road",
    dir: -1,
    base: 85,
    len: 40,
    vehicle: "moto",
    count: 4,
  },
  {
    row: 8,
    kind: "road",
    dir: 1,
    base: 65,
    len: 60,
    vehicle: "coche",
    count: 3,
  },
  {
    row: 9,
    kind: "road",
    dir: -1,
    base: 110,
    len: 60,
    vehicle: "coche",
    count: 2,
  },
  {
    row: 10,
    kind: "road",
    dir: 1,
    base: 50,
    len: 120,
    vehicle: "camion",
    count: 2,
  },
  {
    row: 11,
    kind: "road",
    dir: -1,
    base: 95,
    len: 60,
    vehicle: "coche",
    count: 3,
  },
  {
    row: 12,
    kind: "road",
    dir: 1,
    base: 70,
    len: 40,
    vehicle: "moto",
    count: 4,
  },
];
// Las entidades circulan entre x = −80 y x = 880.
export const LOOP_MIN = -80;
export const LOOP_MAX = 880;
export const LOOP = LOOP_MAX - LOOP_MIN; // 960
// ×1.0 en el viaje 1, ×1.5 en el 6 y ×2.0 del 11 en adelante.
export function speedFor(trip: number): number {
  return Math.min(2, 1 + 0.1 * (trip - 1));
}
// Posiciones iniciales del viaje 1, desfasadas por fila para que no salgan alineadas.
export function createLanes(): Lane[] {
  return LANES.map(({ count, ...def }) => {
    const gap = LOOP / count;
    const start = LOOP_MIN + ((def.row * 37) % gap);
    return {
      ...def,
      xs: Array.from({ length: count }, (_, i) => start + i * gap),
    };
  });
}

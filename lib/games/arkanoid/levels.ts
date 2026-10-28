// Port 1:1 de references/started-games/04-arkanoid/levels.js: los 5 patrones de bloques.
import { MAX_SPEED, SPEED_STEP } from "./constants";
export type BlockColor =
  "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";
export type LevelDef = {
  speed: number;
  blocks: { col: number; row: number; color: BlockColor }[];
};
export const LEVELS: LevelDef[] = (() => {
  const rowColors1: BlockColor[] = [
    "red",
    "yellow",
    "cyan",
    "magenta",
    "hotpink",
    "green",
  ];
  const rowColors2: BlockColor[] = [
    "gray",
    "cyan",
    "hotpink",
    "yellow",
    "magenta",
    "green",
  ];
  const rowColors4: BlockColor[] = [
    "cyan",
    "magenta",
    "green",
    "yellow",
    "hotpink",
    "red",
  ];
  // 1 — Parrilla 10×6 (60)
  const l1: LevelDef["blocks"] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      l1.push({ col, row, color: rowColors1[row] });
  // 2 — Pirámide (40)
  const l2: LevelDef["blocks"] = [];
  const pyStart = [4, 3, 2, 1, 0, 0];
  const pyEnd = [5, 6, 7, 8, 9, 9];
  for (let row = 0; row < 6; row++)
    for (let col = pyStart[row]; col <= pyEnd[row]; col++)
      l2.push({ col, row, color: rowColors2[row] });
  // 3 — Ajedrez (30)
  const l3: LevelDef["blocks"] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if ((col + row) % 2 === 0)
        l3.push({ col, row, color: row < 3 ? "yellow" : "magenta" });
  // 4 — Filas con huecos (39)
  const gaps4 = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const l4: LevelDef["blocks"] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if (!gaps4[row].includes(col))
        l4.push({ col, row, color: rowColors4[row] });
  // 5 — Marco + cruz (39)
  const l5: LevelDef["blocks"] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++) {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross)
        l5.push({ col, row, color: isCross && !isFrame ? "hotpink" : "cyan" });
    }
  return [
    { speed: 1.0, blocks: l1 },
    { speed: 1.1, blocks: l2 },
    { speed: 1.21, blocks: l3 },
    { speed: 1.33, blocks: l4 },
    { speed: 1.46, blocks: l5 },
  ];
})();
// Sin victoria: tras el nivel 5 los patrones se repiten en bucle.
export function patternFor(n: number): LevelDef {
  return LEVELS[(n - 1) % LEVELS.length];
}
// 1.00 … 1.46 del 1 al 5; después ×1.1 por nivel hasta MAX_SPEED (×2.0 desde el 9).
export function speedFor(n: number): number {
  if (n <= LEVELS.length) return LEVELS[n - 1].speed;
  const last = LEVELS[LEVELS.length - 1].speed;
  return Math.min(MAX_SPEED, last * SPEED_STEP ** (n - LEVELS.length));
}

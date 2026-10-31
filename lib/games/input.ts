// Entrada abstracta de los juegos: el mando táctil habla con los motores solo con estas acciones.
export type Dir = "up" | "down" | "left" | "right";
export type GameAction = Dir | "a" | "b";
export type TouchLayout = {
  dpad: Dir[]; // flechas que se pintan; las demás no aparecen
  buttons: { action: "a" | "b"; label: string }[]; // de 0 a 2, A a la derecha
  repeat?: GameAction[]; // autorrepetición al mantener (REPEAT_DELAY de espera, REPEAT_INTERVAL entre repeticiones)
};
export const DIR_LABELS: Record<Dir, string> = {
  up: "Arriba",
  down: "Abajo",
  left: "Izquierda",
  right: "Derecha",
};
export const REPEAT_DELAY = 170;
export const REPEAT_INTERVAL = 50;

export type Hud = { score: number; lives: number; level: number };
export type HudKey = keyof Hud;
export type HudRefs = Record<HudKey, React.RefObject<HTMLDivElement | null>>;
// Mismo texto en el render inicial y en la escritura por ref.
export const formatHud: Record<HudKey, (n: number) => string> = {
  score: (n) => n.toLocaleString("es-ES"),
  lives: (n) => "♥ ".repeat(n).trim() || "—",
  level: (n) => String(n).padStart(2, "0"),
};

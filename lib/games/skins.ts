// Skins de los juegos de canvas: tipos compartidos y utilidades de color (TypeScript plano, sin React).
// Cada motor define en su constants.ts `SKINS: Record<SkinId, { palette; glow }>` con las mismas claves.
export type SkinId = "clasico" | "neon" | "retro" | "pastel";
export const SKIN_IDS: readonly SkinId[] = [
  "clasico",
  "neon",
  "retro",
  "pastel",
];
export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
  pastel: "PASTEL",
};
export const DEFAULT_SKIN: SkinId = "clasico";
export function isSkinId(value: unknown): value is SkinId {
  return typeof value === "string" && (SKIN_IDS as string[]).includes(value);
}
export type Rgba = { r: number; g: number; b: number; a: number };
// Acepta #rgb, #rrggbb, rgb(r,g,b) y rgba(r,g,b,a). null si no lo entiende.
export function parseColor(color: string): Rgba | null {
  const c = color.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(c);
  if (hex) {
    const h =
      hex[1].length === 3
        ? hex[1]
            .split("")
            .map((x) => x + x)
            .join("")
        : hex[1];
    const n = parseInt(h, 16);
    return { r: n >> 16, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const fn =
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(
      c,
    );
  if (fn)
    return {
      r: Number(fn[1]),
      g: Number(fn[2]),
      b: Number(fn[3]),
      a: fn[4] === undefined ? 1 : Number(fn[4]),
    };
  return null;
}
// Luminancia relativa WCAG 2.x de un color opaco.
function luminance({ r, g, b }: Rgba) {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
// Razón de contraste WCAG 2.x de `fg` sobre `bg` (1–21). Si `fg` tiene alfa, se compone sobre `bg`.
export function contrastRatio(fg: string, bg: string): number {
  const f = parseColor(fg);
  const b = parseColor(bg);
  if (!f || !b) return NaN;
  const mixed: Rgba = {
    r: f.r * f.a + b.r * (1 - f.a),
    g: f.g * f.a + b.g * (1 - f.a),
    b: f.b * f.a + b.b * (1 - f.a),
    a: 1,
  };
  const l1 = luminance(mixed);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

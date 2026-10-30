import { EXPLOSION_DURATION, EXPLOSION_FRAMES, type Skin } from "./constants";
import type { BlockColor } from "./levels";
export type Rect = { x: number; y: number; w: number; h: number };
export type Block = Rect & { color: BlockColor; alive: boolean };
export type Ball = Rect & { vx: number; vy: number };
export type Explosion = Rect & { color: BlockColor; elapsed: number };
export function collideAABB(a: Rect, b: Rect) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}
// shadowBlur no sigue a la transformación del contexto: se escala a mano por el devicePixelRatio.
export function glow(
  ctx: CanvasRenderingContext2D,
  color: string,
  blur: number,
) {
  const m = ctx.getTransform();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur * Math.hypot(m.a, m.b);
}
// Mezcla un hex #rrggbb con blanco (t = 0 → color, t = 1 → blanco).
function tint(hex: string, t: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * t);
  return `rgb(${mix(n >> 16)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}
// Bloque como tubo de neón apagado: cristal tintado, contorno encendido y filo superior claro.
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  block: Block,
  { palette, glow: g }: Skin,
) {
  const color = palette.blocks[block.color];
  const x = block.x + 2;
  const y = block.y + 2;
  const w = block.w - 4;
  const h = block.h - 4;
  ctx.save();
  if (g.block) glow(ctx, color, g.block);
  ctx.globalAlpha = palette.blockFillAlpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = palette.blockEdge;
  ctx.fillRect(x + 2, y + 2, w - 4, 2);
  ctx.restore();
}
// Paleta como tubo de neón cyan con núcleo blanco.
export function drawPaddle(
  ctx: CanvasRenderingContext2D,
  paddle: Rect,
  { palette, glow: g }: Skin,
) {
  const r = paddle.h / 2;
  ctx.save();
  glow(ctx, palette.paddle, g.paddle);
  ctx.fillStyle = palette.paddle;
  ctx.beginPath();
  ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, r);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = palette.paddleCore;
  ctx.beginPath();
  ctx.roundRect(paddle.x + r, paddle.y + r - 2, paddle.w - 2 * r, 4, 2);
  ctx.fill();
  ctx.restore();
}
// Pelota como círculo brillante con halo cyan.
export function drawBall(
  ctx: CanvasRenderingContext2D,
  ball: Rect,
  { palette, glow: g }: Skin,
) {
  ctx.save();
  glow(ctx, palette.ballGlow, g.ball);
  ctx.fillStyle = palette.ball;
  ctx.beginPath();
  ctx.arc(
    ball.x + ball.w / 2,
    ball.y + ball.h / 2,
    ball.w / 2 - 1,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
}
// 4 fases como los frames del spritesheet: el bloque destella, se hincha y se apaga con glow.
export function drawExplosion(
  ctx: CanvasRenderingContext2D,
  exp: Explosion,
  { palette, glow: g }: Skin,
) {
  const phase = Math.min(
    Math.floor((exp.elapsed / EXPLOSION_DURATION) * EXPLOSION_FRAMES.length),
    EXPLOSION_FRAMES.length - 1,
  );
  const { scale, alpha, flash } = EXPLOSION_FRAMES[phase];
  const color = palette.blocks[exp.color];
  const w = exp.w * scale;
  const h = exp.h * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  glow(ctx, color, g.explosion);
  ctx.fillStyle = flash ? tint(color, flash) : color;
  ctx.fillRect(exp.x + (exp.w - w) / 2, exp.y + (exp.h - h) / 2, w, h);
  ctx.restore();
}

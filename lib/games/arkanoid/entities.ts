import {
  EXPLOSION_DURATION,
  EXPLOSION_PHASES,
  GLOW,
  PALETTE,
} from "./constants";
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
export function drawBlock(ctx: CanvasRenderingContext2D, block: Block) {
  const color = PALETTE.blocks[block.color];
  ctx.save();
  if (GLOW.block) glow(ctx, color, GLOW.block);
  ctx.fillStyle = color;
  ctx.fillRect(block.x + 1, block.y + 1, block.w - 2, block.h - 2);
  ctx.restore();
}
export function drawPaddle(ctx: CanvasRenderingContext2D, paddle: Rect) {
  ctx.save();
  if (GLOW.paddle) glow(ctx, PALETTE.paddle, GLOW.paddle);
  ctx.fillStyle = PALETTE.paddle;
  ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
  ctx.restore();
}
export function drawBall(ctx: CanvasRenderingContext2D, ball: Rect) {
  ctx.save();
  if (GLOW.ball) glow(ctx, PALETTE.ball, GLOW.ball);
  ctx.fillStyle = PALETTE.ball;
  ctx.beginPath();
  ctx.arc(ball.x + ball.w / 2, ball.y + ball.h / 2, ball.w / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
// 4 fases como los frames del spritesheet: el rectángulo del bloque crece y se desvanece.
export function drawExplosion(ctx: CanvasRenderingContext2D, exp: Explosion) {
  const phase = Math.min(
    Math.floor((exp.elapsed / EXPLOSION_DURATION) * EXPLOSION_PHASES),
    EXPLOSION_PHASES - 1,
  );
  const grow = 1 + phase * 0.15;
  const w = exp.w * grow;
  const h = exp.h * grow;
  const color = PALETTE.blocks[exp.color];
  ctx.save();
  ctx.globalAlpha = 1 - phase / EXPLOSION_PHASES;
  if (GLOW.explosion) glow(ctx, color, GLOW.explosion);
  ctx.fillStyle = color;
  ctx.fillRect(exp.x + (exp.w - w) / 2, exp.y + (exp.h - h) / 2, w, h);
  ctx.restore();
}

import {
  BALL_SIZE,
  BASE_BALL_VX,
  BASE_BALL_VY,
  BLOCK_H,
  BLOCK_W,
  BLOCKS_ORIGIN_X,
  BLOCKS_ORIGIN_Y,
  EXPLOSION_DURATION,
  H,
  MAX_DT,
  PADDLE,
  PADDLE_CATCH,
  PADDLE_SPEED,
  PALETTE,
  POINTS_PER_BLOCK,
  START_LIVES,
  W,
} from "./constants";
import {
  collideAABB,
  drawBall,
  drawBlock,
  drawExplosion,
  drawPaddle,
  type Ball,
  type Block,
  type Explosion,
  type Rect,
} from "./entities";
import { patternFor, speedFor } from "./levels";
export type ArkanoidCallbacks = {
  onScore: (score: number) => void; // solo cuando cambia
  onLives: (lives: number) => void; // solo cuando cambia
  onLevel: (level: number) => void; // solo cuando cambia
  onGameOver: (score: number) => void; // una vez por partida
};
export type ArkanoidGame = {
  pause: () => void; // detiene el loop, limpia las teclas e ignora teclado y ratón
  resume: () => void; // reanuda sin salto de dt (reinicia lastTime)
  restart: () => void; // paleta centrada, nivel 1, 3 vidas, 0 puntos; reemite los valores iniciales
  end: () => void; // fuerza game over con la puntuación actual → onLives(0) + onGameOver
  destroy: () => void; // cancela rAF y quita listeners; idempotente
};
type State = "playing" | "paused" | "gameover";
type Keys = { ArrowLeft: boolean; ArrowRight: boolean };
const isTypingTarget = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
export function createArkanoidGame(
  canvas: HTMLCanvasElement,
  callbacks: ArkanoidCallbacks,
): ArkanoidGame {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("Canvas 2D no disponible");
  const ctx: CanvasRenderingContext2D = maybeCtx;
  // HiDPI: buffer a resolución física, dibujo en coordenadas lógicas 800×600.
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // ── Estado del juego ──
  const paddle: Rect = { x: 0, y: PADDLE.y, w: PADDLE.w, h: PADDLE.h };
  const ball: Ball = {
    x: 0,
    y: 0,
    w: BALL_SIZE,
    h: BALL_SIZE,
    vx: BASE_BALL_VX,
    vy: BASE_BALL_VY,
  };
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let lives = START_LIVES;
  let score = 0;
  let currentLevel = 1;
  let state: State = "playing";
  const keys: Keys = { ArrowLeft: false, ArrowRight: false };
  // ── Control del loop y avisos a React ──
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let destroyed = false;
  let sent = { score: -1, lives: -1, level: -1 };
  let gameOverSent = false;
  const emit = () => {
    if (score !== sent.score) callbacks.onScore((sent.score = score));
    if (lives !== sent.lives) callbacks.onLives((sent.lives = lives));
    if (currentLevel !== sent.level)
      callbacks.onLevel((sent.level = currentLevel));
    if (state === "gameover" && !gameOverSent) {
      gameOverSent = true;
      callbacks.onGameOver(score);
    }
  };
  const clearKeys = () => {
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
  };
  function initPaddle() {
    paddle.x = (W - paddle.w) / 2;
  }
  // La pelota sale sola desde encima de la paleta, con la velocidad del nivel.
  function initBall() {
    const speed = speedFor(currentLevel);
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }
  function loadLevel(n: number) {
    currentLevel = n;
    blocks = patternFor(n).blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    initBall();
  }
  function gameOver() {
    lives = 0;
    state = "gameover";
    clearKeys();
  }
  function init() {
    lives = START_LIVES;
    score = 0;
    state = "playing";
    clearKeys();
    initPaddle();
    loadLevel(1);
  }
  // ── Update ──
  function updateExplosions(dt: number) {
    for (const exp of explosions) exp.elapsed += dt * 1000;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);
  }
  function update(dt: number) {
    // Paleta
    if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (keys.ArrowRight)
      paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);
    // Movimiento de la pelota
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    // Rebote en paredes (izquierda, derecha, arriba)
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
    }
    // Rebote en la paleta: solo invierte vy, sin cambiar el ángulo.
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + PADDLE_CATCH
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
    }
    // Bloques: como máximo uno por frame.
    for (const block of blocks) {
      if (!block.alive || !collideAABB(ball, block)) continue;
      block.alive = false;
      explosions.push({
        x: block.x,
        y: block.y,
        w: block.w,
        h: block.h,
        color: block.color,
        elapsed: 0,
      });
      score += POINTS_PER_BLOCK;
      ball.vy = -ball.vy;
      // Sin victoria: el nivel siguiente repite los patrones en bucle.
      if (blocks.every((b) => !b.alive)) loadLevel(currentLevel + 1);
      break;
    }
    updateExplosions(dt);
    // Pelota perdida
    if (ball.y > H) {
      lives--;
      if (lives <= 0) gameOver();
      else initBall();
    }
  }
  // ── Draw ── (sin HUD ni overlays: los pinta la plataforma)
  function draw(c: CanvasRenderingContext2D) {
    c.fillStyle = PALETTE.bg;
    c.fillRect(0, 0, W, H);
    for (const block of blocks) if (block.alive) drawBlock(c, block);
    for (const exp of explosions) drawExplosion(c, exp);
    drawPaddle(c, paddle);
    drawBall(c, ball);
  }
  // ── Loop ──
  // En gameover solo se terminan de animar las explosiones que queden.
  function loop(ts: number) {
    if (destroyed || state === "paused") {
      rafId = null;
      return;
    }
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT) / 1000;
    lastTime = ts;
    if (state === "playing") update(dt);
    else updateExplosions(dt);
    draw(ctx);
    emit();
    rafId =
      state === "playing" || explosions.length > 0
        ? requestAnimationFrame(loop)
        : null;
  }
  function start() {
    stop();
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }
  function stop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }
  // ── Listeners ──
  // En pausa y gameover se ignora la entrada; con el foco en un campo de texto no se toca nada.
  const onKeyDown = (e: KeyboardEvent) => {
    if (isTypingTarget(e.target) || state !== "playing") return;
    if (e.code !== "ArrowLeft" && e.code !== "ArrowRight") return;
    e.preventDefault();
    keys[e.code] = true;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (isTypingTarget(e.target) || state !== "playing") return;
    if (e.code !== "ArrowLeft" && e.code !== "ArrowRight") return;
    e.preventDefault();
    keys[e.code] = false;
  };
  // El ratón centra la paleta en el cursor; la escala usa W / rect.width (canvas.width lleva el dpr).
  const onMouseMove = (e: MouseEvent) => {
    if (state !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const mouseX = (e.clientX - rect.left) * (W / rect.width);
    paddle.x = Math.max(0, Math.min(W - paddle.w, mouseX - paddle.w / 2));
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("mousemove", onMouseMove);
  init();
  emit();
  start();
  return {
    pause() {
      if (destroyed || state !== "playing") return;
      state = "paused";
      clearKeys();
      stop();
    },
    resume() {
      if (destroyed || state !== "paused") return;
      state = "playing";
      start();
    },
    restart() {
      if (destroyed) return;
      init();
      sent = { score: -1, lives: -1, level: -1 };
      gameOverSent = false;
      emit();
      start();
    },
    end() {
      if (destroyed || state === "gameover") return;
      gameOver();
      emit();
      // Desde la pausa el loop está parado: se relanza solo si quedan explosiones por terminar.
      if (rafId === null && explosions.length > 0) start();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onMouseMove);
    },
  };
}

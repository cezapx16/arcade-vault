import { DEFAULT_SKIN, type SkinId } from "@/lib/games/skins";
import {
  BOARD_X,
  BOARD_Y,
  CELL,
  COLS,
  CONTROLS,
  CONTROLS_Y,
  GHOST_ALPHA,
  H,
  KICKS,
  LINE_SCORES,
  LINES_LABEL_Y,
  LINES_VALUE_Y,
  MAX_DT,
  NEXT_BOX,
  NEXT_BOX_Y,
  NEXT_LABEL_Y,
  NEXT_PAD,
  PANEL_X,
  ROWS,
  SKINS,
  W,
} from "./constants";
import {
  clearLines,
  collide,
  createBoard,
  drawBlock,
  ghostY,
  glow,
  randomPiece,
  rotateCW,
  type Board,
  type Piece,
} from "./entities";
export type TetrisCallbacks = {
  onScore: (score: number) => void; // solo cuando cambia
  onLives: (lives: number) => void; // solo cuando cambia
  onLevel: (level: number) => void; // solo cuando cambia
  onGameOver: (score: number) => void; // una vez por partida
};
export type TetrisGame = {
  pause: () => void; // detiene el loop; las teclas de juego se ignoran
  resume: () => void; // reanuda sin salto de dt (reinicia lastTime)
  restart: () => void; // init() y vuelve a emitir score/lives/level iniciales
  end: () => void; // fuerza game over con la puntuación actual → onLives(0) + onGameOver
  destroy: () => void; // cancela rAF y quita listeners; idempotente
  setSkin: (id: SkinId) => void; // cambia colores y glow desde el siguiente frame, sin tocar la partida
};
type State = "playing" | "paused" | "gameover";
// Teclas de juego cuya acción por defecto (scroll, activar botón enfocado) se bloquea.
const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
]);
const isTypingTarget = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
export function createTetrisGame(
  canvas: HTMLCanvasElement,
  callbacks: TetrisCallbacks,
  skinId: SkinId = DEFAULT_SKIN,
): TetrisGame {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("Canvas 2D no disponible");
  const ctx: CanvasRenderingContext2D = maybeCtx;
  // HiDPI: buffer a resolución física, dibujo en coordenadas lógicas 800×600.
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Skin actual: solo lo lee el dibujo.
  let skin = SKINS[skinId];
  // ── Estado del juego ──
  let board: Board = createBoard();
  let current: Piece = randomPiece();
  let next: Piece = randomPiece();
  let score = 0;
  let lines = 0;
  let level = 1;
  let lives = 1;
  let dropInterval = 1000;
  let dropAccum = 0;
  let state: State = "playing";
  // ── Control del loop y avisos a React ──
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let destroyed = false;
  let sent = { score: -1, lives: -1, level: -1 };
  let gameOverSent = false;
  const emit = () => {
    if (score !== sent.score) callbacks.onScore((sent.score = score));
    if (lives !== sent.lives) callbacks.onLives((sent.lives = lives));
    if (level !== sent.level) callbacks.onLevel((sent.level = level));
    if (state === "gameover" && !gameOverSent) {
      gameOverSent = true;
      callbacks.onGameOver(score);
    }
  };
  function gameOver() {
    lives = 0;
    state = "gameover";
  }
  function tryRotate() {
    const rotated = rotateCW(current.shape);
    for (const kick of KICKS) {
      if (!collide(board, rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }
  function merge() {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          board[current.y + r][current.x + c] = current.shape[r][c];
  }
  function removeLines() {
    const cleared = clearLines(board);
    if (cleared) {
      lines += cleared;
      score += (LINE_SCORES[cleared] || 0) * level;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    }
  }
  function hardDrop() {
    const gy = ghostY(board, current);
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
  }
  function softDrop() {
    if (!collide(board, current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
    } else {
      lockPiece();
    }
  }
  function lockPiece() {
    merge();
    removeLines();
    spawn();
  }
  // La única vida se pierde cuando la pieza nueva no cabe al aparecer.
  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(board, current.shape, current.x, current.y)) gameOver();
  }
  function init() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    lives = 1;
    dropInterval = 1000;
    dropAccum = 0;
    state = "playing";
    next = randomPiece();
    spawn();
  }
  // ── Update ──
  function update(dt: number) {
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(board, current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
    }
  }
  // ── Draw ── (sin HUD de puntuación/nivel ni overlay: los pinta la plataforma)
  function drawBoard(c: CanvasRenderingContext2D) {
    const bw = COLS * CELL;
    const bh = ROWS * CELL;
    c.fillStyle = skin.palette.board;
    c.fillRect(BOARD_X, BOARD_Y, bw, bh);
    c.strokeStyle = skin.palette.grid;
    c.lineWidth = 0.5;
    c.beginPath();
    for (let col = 1; col < COLS; col++) {
      c.moveTo(BOARD_X + col * CELL, BOARD_Y);
      c.lineTo(BOARD_X + col * CELL, BOARD_Y + bh);
    }
    for (let row = 1; row < ROWS; row++) {
      c.moveTo(BOARD_X, BOARD_Y + row * CELL);
      c.lineTo(BOARD_X + bw, BOARD_Y + row * CELL);
    }
    c.stroke();
    // Tubo de neón magenta: lo único que brilla siempre en la pantalla.
    c.save();
    glow(c, skin.palette.border, skin.glow.border);
    c.strokeStyle = skin.palette.border;
    c.lineWidth = 2;
    c.strokeRect(BOARD_X - 1, BOARD_Y - 1, bw + 2, bh + 2);
    c.restore();
  }
  function drawPiece(
    c: CanvasRenderingContext2D,
    piece: Piece,
    y: number,
    alpha = 1,
    blur = 0,
  ) {
    for (let r = 0; r < piece.shape.length; r++)
      for (let col = 0; col < piece.shape[r].length; col++)
        drawBlock(
          c,
          skin.palette,
          BOARD_X,
          BOARD_Y,
          piece.x + col,
          y + r,
          piece.shape[r][col],
          CELL,
          alpha,
          blur,
        );
  }
  function drawPanel(c: CanvasRenderingContext2D) {
    c.textAlign = "left";
    c.textBaseline = "alphabetic";
    const label = (text: string, y: number) => {
      c.fillStyle = skin.palette.label;
      c.font = "13px monospace";
      c.fillText(text, PANEL_X, y);
    };
    // SIGUIENTE: centrada en su recuadro con los desplazamientos de drawNext()
    label("SIGUIENTE", NEXT_LABEL_Y);
    c.strokeStyle = skin.palette.nextBox;
    c.lineWidth = 1;
    c.strokeRect(PANEL_X + 0.5, NEXT_BOX_Y + 0.5, NEXT_BOX - 1, NEXT_BOX - 1);
    const shape = next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let col = 0; col < shape[r].length; col++)
        drawBlock(
          c,
          skin.palette,
          PANEL_X + NEXT_PAD,
          NEXT_BOX_Y + NEXT_PAD,
          offX + col,
          offY + r,
          shape[r][col],
          CELL,
          1,
          skin.glow.piece,
        );
    // LÍNEAS
    label("LÍNEAS", LINES_LABEL_Y);
    c.fillStyle = skin.palette.text;
    c.font = "bold 22px monospace";
    c.fillText(String(lines), PANEL_X, LINES_VALUE_Y);
    // CONTROLES
    label("CONTROLES", CONTROLS_Y);
    c.font = "12px monospace";
    CONTROLS.forEach(([keys, action], i) => {
      const y = CONTROLS_Y + 28 + i * 24;
      c.fillStyle = skin.palette.text;
      c.fillText(keys, PANEL_X, y);
      c.fillStyle = skin.palette.label;
      c.fillText(action, PANEL_X + 80, y);
    });
  }
  function draw(c: CanvasRenderingContext2D) {
    c.fillStyle = skin.palette.bg;
    c.fillRect(0, 0, W, H);
    drawBoard(c);
    for (let r = 0; r < ROWS; r++)
      for (let col = 0; col < COLS; col++)
        drawBlock(
          c,
          skin.palette,
          BOARD_X,
          BOARD_Y,
          col,
          r,
          board[r][col],
          CELL,
          1,
          skin.glow.locked,
        );
    drawPiece(c, current, ghostY(board, current), GHOST_ALPHA);
    drawPiece(c, current, current.y, 1, skin.glow.piece);
    drawPanel(c);
  }
  // ── Loop ──
  function loop(ts: number) {
    if (destroyed || state !== "playing") {
      rafId = null;
      return;
    }
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT);
    lastTime = ts;
    update(dt);
    // Como el original, tras el game over no se vuelve a dibujar.
    if (state === "playing") draw(ctx);
    emit();
    rafId = state === "playing" ? requestAnimationFrame(loop) : null;
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
  // En gameover se ignora la entrada; con el foco en un campo de texto no se toca nada.
  const onKeyDown = (e: KeyboardEvent) => {
    if (isTypingTarget(e.target) || state === "gameover") return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (state === "paused") return;
    switch (e.code) {
      case "ArrowLeft":
        if (!collide(board, current.shape, current.x - 1, current.y))
          current.x--;
        break;
      case "ArrowRight":
        if (!collide(board, current.shape, current.x + 1, current.y))
          current.x++;
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        hardDrop();
        break;
      default:
        return;
    }
    emit();
  };
  // Evita que Espacio active un botón enfocado (PAUSA/REANUDAR) al soltarlo.
  const onKeyUp = (e: KeyboardEvent) => {
    if (isTypingTarget(e.target) || state === "gameover") return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  init();
  emit();
  start();
  return {
    setSkin(id) {
      if (destroyed) return;
      skin = SKINS[id];
      // En pausa el loop está parado: se repinta una vez para que el cambio se vea ya.
      // Tras el game over no se redibuja, como en el original.
      if (state === "paused") draw(ctx);
    },
    pause() {
      if (destroyed || state !== "playing") return;
      state = "paused";
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
      stop();
      gameOver();
      emit();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
  };
}

import type { GameAction } from "@/lib/games/input";
import { DEFAULT_SKIN, type SkinId } from "@/lib/games/skins";
import {
  BOARD_X,
  BOARD_Y,
  BONUS_EVERY,
  BONUS_FRUIT,
  BONUS_MS,
  CELL,
  COLS,
  FLASH_MS,
  FRUITS_PER_LEVEL,
  GROW_BONUS,
  GROW_FRUIT,
  H,
  MAX_DT,
  POINTS_BONUS,
  POINTS_FRUIT,
  PROMPT_KEYS,
  PROMPT_TOUCH,
  QUEUE_MAX,
  ROWS,
  SKINS,
  START_CELLS,
  START_DIR,
  START_LIVES,
  W,
} from "./constants";
import {
  drawBoard,
  drawBonusBar,
  drawBonusGlow,
  drawFlash,
  drawFruit,
  drawSnake,
  inBounds,
  isOpposite,
  randomFreeCell,
  sameCell,
  step,
  tickFor,
  type Cell,
  type Dir,
  type Flash,
} from "./entities";
import { FRUIT_NAMES, loadFruits, type FruitName } from "./sprites";
export type SnakeCallbacks = {
  onScore: (score: number) => void; // solo cuando cambia
  onLives: (lives: number) => void; // solo cuando cambia
  onLevel: (level: number) => void; // solo cuando cambia
  onGameOver: (score: number) => void; // una vez por partida
};
export type SnakeGame = {
  pause: () => void; // detiene el loop, vacía el búfer de giros e ignora el teclado
  resume: () => void; // reanuda sin salto de dt (reinicia lastTime)
  restart: () => void; // serpiente inicial, 3 vidas, nivel 1, 0 puntos, fruta nueva; reemite los valores iniciales
  end: () => void; // fuerza game over con la puntuación actual → onLives(0) + onGameOver
  destroy: () => void; // cancela rAF, quita listeners y descarta la carga del sprite; idempotente
  setSkin: (id: SkinId) => void; // cambia colores y glow desde el siguiente frame, sin tocar la partida
  input: (action: GameAction, pressed: boolean) => void; // mando táctil: mismas reglas que el teclado
};
type Phase = "loading" | "ready" | "playing" | "paused" | "gameover";
// Solo WASD, leído por e.code: funciona con Bloq Mayús y con cualquier distribución.
const KEY_DIRS: Record<string, Dir> = {
  KeyW: "up",
  KeyA: "left",
  KeyS: "down",
  KeyD: "right",
};
// Acciones del mando → tecla equivalente.
const ACTION_KEYS: Partial<Record<GameAction, string>> = {
  up: "KeyW",
  left: "KeyA",
  down: "KeyS",
  right: "KeyD",
};
const isTypingTarget = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
const randomFruit = (): FruitName =>
  FRUIT_NAMES[Math.floor(Math.random() * FRUIT_NAMES.length)];
export function createSnakeGame(
  canvas: HTMLCanvasElement,
  callbacks: SnakeCallbacks,
  skinId: SkinId = DEFAULT_SKIN,
): SnakeGame {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("Canvas 2D no disponible");
  const ctx: CanvasRenderingContext2D = maybeCtx;
  // Skin actual: solo lo lee el dibujo.
  let skin = SKINS[skinId];
  // El aviso de arranque se decide una vez: con puntero grueso se juega con el mando táctil.
  const prompt = window.matchMedia("(pointer: coarse)").matches
    ? PROMPT_TOUCH
    : PROMPT_KEYS;
  // HiDPI: buffer a resolución física, dibujo en coordenadas lógicas 800×600.
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // ── Estado del juego ──
  let phase: Phase = "loading";
  let pausedFrom: Phase = "loading"; // fase a la que vuelve resume()
  let snake: Cell[] = [];
  let dir: Dir = START_DIR;
  let queue: Dir[] = [];
  let grow = 0;
  let fruit: { cell: Cell; sprite: FruitName } = {
    cell: { x: 0, y: 0 },
    sprite: "apple",
  };
  let bonus: { cell: Cell; remaining: number } | null = null;
  let normalsEaten = 0;
  let fruitsEaten = 0;
  let flashes: Flash[] = [];
  let accum = 0;
  let score = 0;
  let lives = START_LIVES;
  let level = 1;
  // ── Hoja de fruta ──
  let loaded = false;
  let fruitsImg: HTMLImageElement | null = null;
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
    if (phase === "gameover" && !gameOverSent) {
      gameOverSent = true;
      callbacks.onGameOver(score);
    }
  };
  function gameOver() {
    lives = 0;
    phase = "gameover";
    queue = [];
  }
  // Coloca la fruta normal en una celda libre. Sin sitio (tablero lleno), la partida termina.
  function placeFruit() {
    const taken = bonus ? [...snake, bonus.cell] : snake;
    const cell = randomFreeCell(taken);
    if (!cell) return gameOver();
    fruit = { cell, sprite: randomFruit() };
  }
  function placeBonus() {
    const cell = randomFreeCell([...snake, fruit.cell]);
    if (cell) bonus = { cell, remaining: BONUS_MS };
  }
  // Serpiente inicial en espera de la primera dirección.
  function resetSnake() {
    snake = START_CELLS.map((c) => ({ ...c }));
    dir = START_DIR;
    queue = [];
    grow = 0;
    accum = 0;
    phase = loaded ? "ready" : "loading";
  }
  function init() {
    score = 0;
    lives = START_LIVES;
    level = 1;
    normalsEaten = 0;
    fruitsEaten = 0;
    bonus = null;
    flashes = [];
    resetSnake();
    placeFruit();
  }
  // Se conservan puntos, nivel y fruta; la bonus desaparece.
  function loseLife() {
    lives--;
    bonus = null;
    if (lives <= 0) return gameOver();
    resetSnake();
    if (snake.some((c) => sameCell(c, fruit.cell))) placeFruit();
  }
  function eat(cell: Cell, points: number, segments: number) {
    score += points * level;
    grow += segments;
    fruitsEaten++;
    level = Math.floor(fruitsEaten / FRUITS_PER_LEVEL) + 1;
    flashes.push({ cell, elapsed: 0 });
  }
  // ── Update ──
  // Avanza una celda. La cola cuenta como libre si este tick no crece.
  function tick() {
    const next = queue.shift();
    if (next) dir = next;
    const head = step(snake[0], dir);
    if (!inBounds(head)) return loseLife();
    const body = grow > 0 ? snake : snake.slice(0, -1);
    if (body.some((c) => sameCell(c, head))) return loseLife();
    snake.unshift(head);
    if (grow > 0) grow--;
    else snake.pop();
    if (bonus && sameCell(head, bonus.cell)) {
      eat(head, POINTS_BONUS, GROW_BONUS);
      bonus = null;
    }
    if (sameCell(head, fruit.cell)) {
      eat(head, POINTS_FRUIT, GROW_FRUIT);
      normalsEaten++;
      placeFruit();
      if (phase === "playing" && normalsEaten % BONUS_EVERY === 0 && !bonus)
        placeBonus();
    }
  }
  function updateFlashes(dt: number) {
    for (const f of flashes) f.elapsed += dt;
    flashes = flashes.filter((f) => f.elapsed < FLASH_MS);
  }
  function update(dt: number) {
    updateFlashes(dt);
    if (phase !== "playing") return;
    if (bonus) {
      bonus.remaining -= dt;
      if (bonus.remaining <= 0) bonus = null;
    }
    // Con dt ≤ 50 ms y tick ≥ 60 ms, como mucho un paso por frame.
    accum += dt;
    const interval = tickFor(level);
    if (accum >= interval) {
      accum -= interval;
      tick();
    }
  }
  // ── Draw ── (sin HUD ni overlays: los pinta la plataforma)
  function draw(c: CanvasRenderingContext2D) {
    c.fillStyle = skin.palette.bg;
    c.fillRect(0, 0, W, H);
    drawBoard(c, skin);
    if (loaded) {
      drawFruit(c, fruitsImg, fruit.cell, fruit.sprite, skin);
      if (bonus) {
        drawBonusGlow(c, bonus.cell, bonus.remaining, skin);
        drawFruit(c, fruitsImg, bonus.cell, BONUS_FRUIT, skin);
        drawBonusBar(c, bonus.cell, bonus.remaining / BONUS_MS, skin);
      }
    }
    drawSnake(c, snake, skin);
    for (const f of flashes) drawFlash(c, f, skin);
    if (phase === "ready") {
      c.fillStyle = skin.palette.prompt;
      c.font = "20px monospace";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(
        prompt,
        BOARD_X + (COLS * CELL) / 2,
        BOARD_Y + (ROWS * CELL) / 2 + CELL * 3,
      );
    }
  }
  // ── Loop ──
  // En gameover solo se terminan de animar los destellos que queden.
  function loop(ts: number) {
    if (destroyed || phase === "paused" || phase === "loading") {
      rafId = null;
      return;
    }
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT);
    lastTime = ts;
    update(dt);
    draw(ctx);
    emit();
    rafId =
      phase === "ready" || phase === "playing" || flashes.length > 0
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
  // Sin preventDefault: WASD no hace scroll. En pausa, carga y gameover se ignora la entrada.
  const onKeyDown = (e: KeyboardEvent) => {
    if (isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    turn(e.code);
  };
  // Teclado y mando comparten turn: arranque desde la espera y búfer de giros.
  function turn(code: string) {
    const d = KEY_DIRS[code];
    if (!d) return;
    if (phase === "ready") {
      // Arranca con la primera dirección que no sea un giro de 180°.
      if (isOpposite(d, dir)) return;
      dir = d;
      phase = "playing";
      return;
    }
    if (phase !== "playing") return;
    // Cada giro se valida contra el último de la cola, no solo contra dir.
    const last = queue.length ? queue[queue.length - 1] : dir;
    if (d === last || isOpposite(d, last) || queue.length >= QUEUE_MAX) return;
    queue.push(d);
  }
  window.addEventListener("keydown", onKeyDown);
  init();
  emit();
  draw(ctx);
  // El loop no arranca hasta que la hoja carga; si falla, la fruta se dibuja como un círculo.
  const onLoaded = (img: HTMLImageElement | null) => {
    if (destroyed) return;
    fruitsImg = img;
    loaded = true;
    if (phase === "loading") {
      phase = "ready";
      start();
    } else if (phase === "paused" && pausedFrom === "loading") {
      pausedFrom = "ready";
    }
  };
  // La carga empieza en el siguiente frame: si React crea y destruye el motor en el mismo
  // render (hidratación en un dispositivo táctil), la imagen ni se pide.
  const loadId = requestAnimationFrame(() =>
    loadFruits().then(onLoaded, () => onLoaded(null)),
  );
  return {
    setSkin(id) {
      if (destroyed) return;
      skin = SKINS[id];
      // En pausa o tras el game over el loop puede estar parado: se repinta una vez.
      if (phase === "paused" || phase === "gameover") draw(ctx);
    },
    input(action, pressed) {
      const code = ACTION_KEYS[action];
      // Cada toque es un giro; soltar no hace nada.
      if (destroyed || !code || !pressed) return;
      turn(code);
    },
    pause() {
      if (destroyed || phase === "paused" || phase === "gameover") return;
      pausedFrom = phase;
      phase = "paused";
      queue = [];
      stop();
    },
    resume() {
      if (destroyed || phase !== "paused") return;
      phase = pausedFrom;
      if (phase !== "loading") start();
    },
    restart() {
      if (destroyed) return;
      init();
      sent = { score: -1, lives: -1, level: -1 };
      gameOverSent = false;
      emit();
      draw(ctx);
      if (phase !== "loading") start();
    },
    end() {
      if (destroyed || phase === "gameover") return;
      gameOver();
      emit();
      // Desde la pausa el loop está parado: se relanza solo si quedan destellos por terminar.
      if (rafId === null && flashes.length > 0) start();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(loadId);
      stop();
      window.removeEventListener("keydown", onKeyDown);
    },
  };
}

import type { GameAction } from "@/lib/games/input";
import { DEFAULT_SKIN, type SkinId } from "@/lib/games/skins";
import {
  CELL,
  DYING_MS,
  FLIP_MS,
  H,
  HOP_MS,
  MAX_DT,
  MAX_SCORE,
  MAX_X,
  PARTICLES,
  POINTS_ARRIVAL,
  POINTS_PER_SECOND,
  POINTS_ROW,
  POINTS_ROZON,
  RIVER_BOT,
  RIVER_TOP,
  ROAD_BOT,
  ROAD_TOP,
  ROW_NORTH,
  ROW_SOUTH,
  ROZON_FX_MS,
  SKINS,
  START_COL,
  START_LIVES,
  STATUS_Y,
  STREAK_MAX,
  STREAK_MS,
  TRIP_MS,
  W,
} from "./constants";
import {
  drawBoard,
  drawLane,
  drawParticles,
  drawPlayer,
  drawPrompt,
  drawRozonFx,
  drawStatus,
  hitsVehicle,
  laneAt,
  laneSpeed,
  mirrorLanes,
  rozonOf,
  stepLanes,
  supportOf,
  type HopDir,
  type Particle,
  type Player,
  type RozonFx,
} from "./entities";
import { createLanes, type Lane } from "./lanes";
export type HopperCallbacks = {
  onScore: (score: number) => void; // solo cuando cambia
  onLives: (lives: number) => void; // solo cuando cambia
  onLevel: (level: number) => void; // solo cuando cambia (número de viaje)
  onGameOver: (score: number) => void; // una vez por partida
};
export type HopperGame = {
  pause: () => void; // detiene el loop, vacía el búfer de salto e ignora el teclado
  resume: () => void; // reanuda sin salto de dt (reinicia lastTime)
  restart: () => void; // viaje 1, 3 vidas, 0 puntos, racha x1, carriles iniciales, fase ready; reemite los valores iniciales
  end: () => void; // fuerza game over con la puntuación actual → onLives(0) + onGameOver
  destroy: () => void; // cancela rAF y quita listeners; idempotente
  setSkin: (id: SkinId) => void; // cambia colores y glow desde el siguiente frame, sin tocar la partida
  input: (action: GameAction, pressed: boolean) => void; // mando táctil: mismas reglas que el teclado
};
type Phase = "ready" | "playing" | "dying" | "flipping" | "paused" | "gameover";
type ActivePhase = Exclude<Phase, "paused" | "gameover">;
// Flechas y WASD, leídas por e.code: funcionan con Bloq Mayús y con cualquier distribución.
const KEY_HOPS: Record<string, HopDir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};
// Solo las flechas hacen scroll en la página.
const ARROWS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
// Acciones del mando → tecla equivalente.
const ACTION_KEYS: Partial<Record<GameAction, string>> = {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
};
const isTypingTarget = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
const isRiver = (row: number) => row >= RIVER_TOP && row <= RIVER_BOT;
const isRoad = (row: number) => row >= ROAD_TOP && row <= ROAD_BOT;
export function createHopperGame(
  canvas: HTMLCanvasElement,
  callbacks: HopperCallbacks,
  skinId: SkinId = DEFAULT_SKIN,
): HopperGame {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("Canvas 2D no disponible");
  const ctx: CanvasRenderingContext2D = maybeCtx;
  // Skin actual: solo lo lee el dibujo.
  let skin = SKINS[skinId];
  // HiDPI: buffer a resolución física, dibujo en coordenadas lógicas 800×600.
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // ── Estado del juego ──
  let phase: Phase = "ready";
  let resumeTo: ActivePhase = "ready"; // fase a la que vuelve resume()
  let lanes: Lane[] = [];
  let player: Player = newPlayer(ROW_SOUTH);
  let queued: HopDir | null = null; // búfer de 1 salto
  let trip = 1; // viaje actual = nivel
  let heading: "up" | "down" = "up"; // ida (up) o vuelta (down)
  let progress = 0; // filas nuevas alcanzadas en el viaje (0–13)
  let tripMs = TRIP_MS;
  let streak = 1; // racha x1–x5
  let streakMs = 0; // ms hasta que la racha caduca (0 = inactiva)
  let phaseMs = 0; // ms restantes de dying (800) o flipping (600)
  let particles: Particle[] = [];
  let rozonFx: RozonFx[] = [];
  let score = 0;
  let lives = START_LIVES;
  // ── Control del loop y avisos a React ──
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let destroyed = false;
  let sent = { score: -1, lives: -1, level: -1 };
  let gameOverSent = false;
  const emit = () => {
    if (score !== sent.score) callbacks.onScore((sent.score = score));
    if (lives !== sent.lives) callbacks.onLives((sent.lives = lives));
    if (trip !== sent.level) callbacks.onLevel((sent.level = trip));
    if (phase === "gameover" && !gameOverSent) {
      gameOverSent = true;
      callbacks.onGameOver(score);
    }
  };
  function newPlayer(row: number): Player {
    return { x: START_COL * CELL, row, hop: 0, hopDir: "up", offX: 0, offY: 0 };
  }
  const startRow = () => (heading === "up" ? ROW_SOUTH : ROW_NORTH);
  const goalRow = () => (heading === "up" ? ROW_NORTH : ROW_SOUTH);
  // Filas avanzadas desde la orilla de salida del viaje.
  const rowsFromStart = (row: number) =>
    heading === "up" ? ROW_SOUTH - row : row;
  function addScore(points: number) {
    score = Math.min(MAX_SCORE, score + points);
  }
  function init() {
    lanes = createLanes();
    player = newPlayer(ROW_SOUTH);
    queued = null;
    trip = 1;
    heading = "up";
    progress = 0;
    tripMs = TRIP_MS;
    streak = 1;
    streakMs = 0;
    phaseMs = 0;
    particles = [];
    rozonFx = [];
    score = 0;
    lives = START_LIVES;
    phase = "ready";
  }
  function gameOver() {
    lives = 0;
    phase = "gameover";
    queued = null;
  }
  // Explosión, una vida menos y, si quedan, reaparición tras DYING_MS.
  function loseLife() {
    const cx = player.x + CELL / 2;
    const cy = player.row * CELL + CELL / 2;
    for (let i = 0; i < PARTICLES; i++) {
      const a = (i / PARTICLES) * Math.PI * 2 + Math.random() * 0.4;
      const v = 60 + Math.random() * 120;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: DYING_MS,
      });
    }
    lives--;
    streak = 1;
    streakMs = 0;
    queued = null;
    if (lives <= 0) return gameOver();
    phase = "dying";
    phaseMs = DYING_MS;
  }
  // Vuelta a la orilla de salida con el tiempo lleno; puntos, viaje y filas puntuadas se conservan.
  function respawn() {
    player = newPlayer(startRow());
    tripMs = TRIP_MS;
    phase = "playing";
  }
  // ── Saltos ──
  // La celda lógica cambia en el instante de la pulsación; la animación solo es visual.
  function hop(d: HopDir) {
    let x = player.x;
    let row = player.row;
    if (d === "left") x = Math.max(0, x - CELL);
    if (d === "right") x = Math.min(MAX_X, x + CELL);
    if (d === "up") row = Math.max(ROW_NORTH, row - 1);
    if (d === "down") row = Math.min(ROW_SOUTH, row + 1);
    if (x === player.x && row === player.row) return false;
    // El rozón se evalúa antes de mover, con las posiciones de este instante.
    rozon(row);
    player = {
      x,
      row,
      hop: HOP_MS,
      hopDir: d,
      offX: player.x - x,
      offY: (player.row - row) * CELL,
    };
    // Avance: 10 × racha por cada fila nueva del viaje.
    const reached = rowsFromStart(row);
    if (reached > progress) {
      addScore(POINTS_ROW * streak * (reached - progress));
      progress = reached;
    }
    if (row === goalRow()) arrive();
    return true;
  }
  // Como mucho un rozón por salto: fila de origen o de destino, solo en la autopista.
  function rozon(toRow: number) {
    const hit = [player.row, toRow].some((row) => {
      const lane = laneAt(lanes, row);
      return lane && isRoad(row) && rozonOf(lane, player.x);
    });
    if (!hit) return;
    streak = Math.min(STREAK_MAX, streak + 1);
    streakMs = STREAK_MS;
    addScore(POINTS_ROZON * streak);
    rozonFx.push({
      x: player.x + CELL / 2,
      y: player.row * CELL,
      text: `ROZÓN x${streak}`,
      life: ROZON_FX_MS,
    });
  }
  // Llegada: 100 × viaje + 10 por segundo entero restante, y volteo de 600 ms con todo congelado.
  function arrive() {
    addScore(
      POINTS_ARRIVAL * trip + POINTS_PER_SECOND * Math.floor(tripMs / 1000),
    );
    player.hop = 0;
    queued = null;
    phase = "flipping";
    phaseMs = FLIP_MS;
  }
  // Fin del volteo: el estado reflejado coincide con la última imagen de la animación.
  function flip() {
    mirrorLanes(lanes);
    player.x = W - player.x - CELL;
    heading = heading === "up" ? "down" : "up";
    trip += 1;
    progress = 0;
    tripMs = TRIP_MS;
    phase = "playing";
  }
  // Teclado y mando comparten press: arranque desde la espera y búfer durante la animación.
  function press(code: string) {
    const d = KEY_HOPS[code];
    if (!d) return;
    if (phase === "ready") {
      if (hop(d)) phase = "playing";
      return;
    }
    if (phase !== "playing") return;
    if (player.hop > 0) queued = d;
    else hop(d);
  }
  // ── Update ──
  function updateParticles(dt: number) {
    for (const p of particles) {
      p.x += (p.vx * dt) / 1000;
      p.y += (p.vy * dt) / 1000;
      p.life -= dt;
    }
    particles = particles.filter((p) => p.life > 0);
    for (const f of rozonFx) f.life -= dt;
    rozonFx = rozonFx.filter((f) => f.life > 0);
  }
  // Arrastre del río y muertes con la celda lógica actual (también durante el salto).
  function checkPlayer(dt: number) {
    const lane = laneAt(lanes, player.row);
    if (lane && isRiver(player.row)) {
      if (supportOf(lane, player.x) < 0) return loseLife();
      player.x += (laneSpeed(lane, trip) * dt) / 1000;
      const c = player.x + CELL / 2;
      if (c < 0 || c > W) return loseLife();
    }
    if (lane && isRoad(player.row) && hitsVehicle(lane, player.x))
      return loseLife();
  }
  function update(dt: number) {
    // En el volteo todo se congela, también la caducidad de la racha.
    if (phase === "flipping") {
      phaseMs -= dt;
      if (phaseMs <= 0) flip();
      return;
    }
    updateParticles(dt);
    stepLanes(lanes, dt, trip);
    if (phase === "dying") {
      phaseMs -= dt;
      if (phaseMs <= 0) respawn();
      return;
    }
    if (phase !== "playing") return;
    if (player.hop > 0) {
      player.hop = Math.max(0, player.hop - dt);
      if (player.hop === 0 && queued) {
        const d = queued;
        queued = null;
        hop(d);
      }
    }
    if (phase !== "playing") return;
    checkPlayer(dt);
    if (phase !== "playing") return;
    if (streakMs > 0) {
      streakMs = Math.max(0, streakMs - dt);
      if (streakMs === 0) streak = 1;
    }
    tripMs -= dt;
    if (tripMs <= 0) loseLife();
  }
  // ── Draw ── (sin HUD ni overlays: los pinta la plataforma)
  function draw(c: CanvasRenderingContext2D) {
    // En pausa se dibuja la fase en la que se pausó.
    const shown = phase === "paused" ? resumeTo : phase;
    c.fillStyle = skin.palette.bg;
    c.fillRect(0, 0, W, H);
    c.save();
    if (shown === "flipping") {
      // scaleX = cos(π × t): a mitad se ve de canto y luego reflejado, igual que el estado final.
      const t = 1 - Math.max(0, phaseMs) / FLIP_MS;
      c.beginPath();
      c.rect(0, 0, W, STATUS_Y);
      c.clip();
      c.translate(W / 2, 0);
      c.scale(Math.cos(Math.PI * t), 1);
      c.translate(-W / 2, 0);
    }
    drawBoard(c, lanes, skin);
    for (const lane of lanes) drawLane(c, lane, skin);
    if (shown !== "dying" && shown !== "gameover") drawPlayer(c, player, skin);
    drawParticles(c, particles, DYING_MS, skin);
    drawRozonFx(c, rozonFx, skin);
    c.restore();
    if (shown === "ready") drawPrompt(c, skin);
    drawStatus(c, { tripMs, heading, streak, streakMs }, skin);
  }
  // ── Loop ── (en gameover siguen los carriles y las partículas)
  function loop(ts: number) {
    if (destroyed || phase === "paused") {
      rafId = null;
      return;
    }
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT);
    lastTime = ts;
    update(dt);
    draw(ctx);
    emit();
    rafId = requestAnimationFrame(loop);
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
  // preventDefault solo en las flechas y solo mientras se juega; nunca escribiendo en un input.
  const onKeyDown = (e: KeyboardEvent) => {
    if (isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (phase === "paused" || phase === "gameover") return;
    if (ARROWS.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    press(e.code);
  };
  window.addEventListener("keydown", onKeyDown);
  init();
  emit();
  draw(ctx);
  start();
  return {
    setSkin(id) {
      if (destroyed) return;
      skin = SKINS[id];
      // En pausa el loop está parado: se repinta una vez.
      if (phase === "paused") draw(ctx);
    },
    input(action, pressed) {
      const code = ACTION_KEYS[action];
      // Cada toque es un salto; soltar no hace nada.
      if (destroyed || !code || !pressed) return;
      press(code);
    },
    pause() {
      if (destroyed || phase === "paused" || phase === "gameover") return;
      resumeTo = phase;
      phase = "paused";
      queued = null;
      stop();
    },
    resume() {
      if (destroyed || phase !== "paused") return;
      phase = resumeTo;
      start();
    },
    restart() {
      if (destroyed) return;
      init();
      sent = { score: -1, lives: -1, level: -1 };
      gameOverSent = false;
      emit();
      draw(ctx);
      start();
    },
    end() {
      if (destroyed || phase === "gameover") return;
      gameOver();
      emit();
      // Desde la pausa el loop está parado: en gameover siguen los carriles.
      if (rafId === null) start();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      window.removeEventListener("keydown", onKeyDown);
    },
  };
}

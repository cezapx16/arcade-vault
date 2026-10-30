import { DEFAULT_SKIN, type SkinId } from "@/lib/games/skins";
import {
  H,
  MAX_DT,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  POWERUP_GUARANTEED_KILLS,
  RESPAWN_DELAY,
  SAFE_DIST,
  SKINS,
  W,
} from "./constants";
import {
  Asteroid,
  Bullet,
  dist,
  glow,
  Particle,
  PowerUp,
  rand,
  Ship,
  type Keys,
} from "./entities";
export type AsteroidsCallbacks = {
  onScore: (score: number) => void; // solo cuando cambia
  onLives: (lives: number) => void; // solo cuando cambia
  onLevel: (level: number) => void; // solo cuando cambia
  onGameOver: (score: number) => void; // una vez por partida
};
export type AsteroidsGame = {
  pause: () => void; // detiene el loop y limpia las teclas pulsadas
  resume: () => void; // reanuda sin salto de dt (reinicia lastTime)
  restart: () => void; // initGame() y vuelve a emitir score/lives/level iniciales
  end: () => void; // fuerza game over con la puntuación actual → onGameOver
  destroy: () => void; // cancela rAF y quita listeners; idempotente
  setSkin: (id: SkinId) => void; // cambia colores y glow desde el siguiente frame, sin tocar la partida
};
type State = "playing" | "dead" | "gameover";
// Teclas de juego cuya acción por defecto (scroll, activar botón enfocado) se bloquea.
const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "Space"]);
const isTypingTarget = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
  skinId: SkinId = DEFAULT_SKIN,
): AsteroidsGame {
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
  // ── Input ──
  const keys: Keys = {};
  const justPressed: Keys = {};
  const pressed = (code: string) => {
    const val = justPressed[code];
    justPressed[code] = false;
    return val;
  };
  const clearKeys = () => {
    for (const k in keys) delete keys[k];
    for (const k in justPressed) delete justPressed[k];
  };
  // ── Estado del juego ──
  let ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let state: State = "playing";
  let deadTimer = 0;
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;
  // ── Control del loop y avisos a React ──
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let paused = false;
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
  function spawnAsteroids(count: number) {
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }
  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = 3;
    level = 1;
    state = "playing";
    spawnAsteroids(4);
  }
  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }
  function explode(
    x: number,
    y: number,
    count = 8,
    rgb = skin.palette.particle,
  ) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y, rgb));
  }
  function killShip() {
    explode(ship.x, ship.y, 14, skin.palette.shipParticle);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      state = "gameover";
    } else {
      state = "dead";
      deadTimer = RESPAWN_DELAY;
    }
  }
  // ── Update ──
  function update(dt: number) {
    // Sin reinicio con Espacio: el game over lo gestiona React con onGameOver.
    if (state === "gameover") {
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      return;
    }
    if (state === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }
    // Disparar
    if (pressed("Space")) bullets.push(...ship.tryShoot());
    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));
    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);
    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }
    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= POWERUP_GUARANTEED_KILLS;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);
    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }
    // Nivel completado
    if (asteroids.length === 0) nextLevel();
  }
  // ── Draw ── (sin HUD ni overlay de GAME OVER: los pinta la plataforma)
  function draw(c: CanvasRenderingContext2D) {
    c.fillStyle = skin.palette.bg;
    c.fillRect(0, 0, W, H);
    particles.forEach((p) => p.draw(c, skin));
    asteroids.forEach((a) => a.draw(c, skin));
    powerUps.forEach((p) => p.draw(c, skin));
    bullets.forEach((b) => b.draw(c, skin));
    ship.draw(c, skin);
    // Indicador del triple disparo: es jugabilidad, no HUD.
    if (ship.tripleShot > 0) {
      c.save();
      glow(c, skin.palette.powerUp, skin.glow.indicator);
      c.fillStyle = skin.palette.powerUp;
      c.font = "15px monospace";
      c.textAlign = "left";
      c.textBaseline = "alphabetic";
      c.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 26);
      c.restore();
    }
  }
  // ── Loop ──
  function loop(ts: number) {
    if (destroyed || paused) return;
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
    lastTime = ts;
    update(dt);
    draw(ctx);
    emit();
    rafId = requestAnimationFrame(loop);
  }
  function start() {
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
    if (paused) return;
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys[e.code] = false;
    if (isTypingTarget(e.target) || state === "gameover") return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  initGame();
  emit();
  start();
  return {
    setSkin(id) {
      if (destroyed) return;
      skin = SKINS[id];
      // En pausa el loop está parado: se repinta una vez para que el cambio se vea ya.
      if (paused) draw(ctx);
    },
    pause() {
      if (destroyed || paused) return;
      paused = true;
      stop();
      clearKeys();
    },
    resume() {
      if (destroyed || !paused) return;
      paused = false;
      start();
    },
    restart() {
      if (destroyed) return;
      initGame();
      clearKeys();
      sent = { score: -1, lives: -1, level: -1 };
      gameOverSent = false;
      emit();
    },
    end() {
      if (destroyed || state === "gameover") return;
      state = "gameover";
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

// Port 1:1 de references/02-asteroids/game.js. Mundo lógico fijo: el canvas se escala por CSS.
export const W = 800;
export const H = 600;
// ── Asteroides (índice = tamaño 1, 2, 3) ──
export const RADII = [0, 16, 30, 50];
export const SPEEDS = [0, 85, 55, 32];
export const POINTS = [0, 100, 50, 20];
export const SAFE_DIST = 130; // distancia mínima al centro al generar asteroides
// ── Power-up de triple disparo ──
export const POWERUP_DROP_CHANCE = 0.15;
export const POWERUP_DURATION = 5;
export const POWERUP_TTL = 12;
export const POWERUP_GUARANTEED_KILLS = 5;
export const TRIPLE_SPREAD = 0.18;
// ── Nave y balas ──
export const SHIP_ROT = 3.5; // rad/s
export const SHIP_THRUST = 260; // px/s²
export const SHIP_DRAG = 0.987;
export const SHIP_RADIUS = 12;
export const SHIP_NOSE = 21;
export const SHIP_INVINCIBLE = 3;
export const SHOOT_COOLDOWN = 0.2;
export const BULLET_SPEED = 520;
export const BULLET_TTL = 1.1;
export const RESPAWN_DELAY = 2;
export const MAX_DT = 0.05;
// Paleta del original (blanco). El canvas no lee variables CSS, por eso van en hex.
export const PALETTE = {
  bg: "#000",
  ship: "#fff",
  flame: "rgba(255, 130, 0, 0.85)",
  asteroid: "#fff",
  bullet: "#fff",
  powerUp: "#0ff",
  particle: "255,255,255", // rgb para rgba con alpha
} as const;

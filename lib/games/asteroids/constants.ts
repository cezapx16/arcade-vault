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
// Paleta neón de la plataforma: hex de los tokens de app/globals.css (el canvas no lee variables CSS).
// Como en la portada de ROCAS, la nave es lo único amarillo; lo que mata es cian y lo que se recoge, magenta.
export const PALETTE = {
  bg: "#000",
  ship: "#f5ff00", // --yellow
  flame: "#ff006e", // --magenta
  asteroid: "#00f5ff", // --cyan
  bullet: "#e6e9ff", // --ink, con halo amarillo de la nave
  powerUp: "#ff006e", // --magenta
  particle: "0,245,255", // rgb de --cyan, para rgba con alpha
  shipParticle: "245,255,0", // rgb de --yellow: la explosión de la nave
} as const;
// Radio del glow (shadowBlur) en px lógicos; glow() lo escala por el devicePixelRatio.
export const GLOW = {
  ship: 14,
  flame: 10,
  asteroid: 8,
  bullet: 8,
  powerUp: 16,
  particle: 0, // sin glow: con ~150 partículas a dpr 2 el frame pasa de ~0,7 ms a ~6 ms
  indicator: 6,
} as const;

import type { SkinId } from "@/lib/games/skins";
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
// ── Skins ── (presentación: colores y glow; las reglas no cambian)
// Paleta neón de la plataforma: hex de los tokens de app/globals.css (el canvas no lee variables CSS).
// Como en la portada de ROCAS, la nave es lo único amarillo; lo que mata es cian y lo que se recoge, magenta.
const NEON_PALETTE = {
  bg: "#000",
  ship: "#f5ff00", // --yellow
  flame: "#ff006e", // --magenta
  asteroid: "#00f5ff", // --cyan
  bullet: "#e6e9ff", // --ink, con halo amarillo de la nave
  powerUp: "#ff006e", // --magenta
  particle: "0,245,255", // rgb de --cyan, para rgba con alpha
  shipParticle: "245,255,0", // rgb de --yellow: la explosión de la nave
};
// Radio del glow (shadowBlur) en px lógicos; glow() lo escala por el devicePixelRatio.
const NEON_GLOW = {
  ship: 14,
  flame: 10,
  asteroid: 8,
  bullet: 8,
  powerUp: 16,
  particle: 0, // sin glow: con ~150 partículas a dpr 2 el frame pasa de ~0,7 ms a ~6 ms
  indicator: 6,
};
export type Palette = { [K in keyof typeof NEON_PALETTE]: string };
export type Glow = { [K in keyof typeof NEON_GLOW]: number };
export type Skin = { palette: Palette; glow: Glow };
const NO_GLOW: Glow = {
  ship: 0,
  flame: 0,
  asteroid: 0,
  bullet: 0,
  powerUp: 0,
  particle: 0,
  indicator: 0,
};
export const SKINS: Record<SkinId, Skin> = {
  // Vector monocromo del original: todo blanco salvo el power-up cian y la llama naranja.
  clasico: {
    palette: {
      bg: "#000", // game.js original
      ship: "#fff", // game.js original
      flame: "rgba(255,130,0,0.85)", // game.js original
      asteroid: "#fff", // game.js original (como la nave: se distinguen por la forma)
      bullet: "#fff", // game.js original
      powerUp: "#0ff", // game.js original (y el indicador 3x del HUD)
      particle: "255,255,255", // game.js original
      shipParticle: "255,255,255", // game.js original
    },
    glow: NO_GLOW,
  },
  neon: { palette: NEON_PALETTE, glow: NEON_GLOW },
  // Monitor vectorial de fósforo verde P1: tres luminosidades de un solo verde.
  // Nave y balas lo más caliente, el power-up a media luz y las rocas lo más apagado.
  retro: {
    palette: {
      bg: "#020a04", // negro con tinte de fósforo
      ship: "#d8ffe2", // fósforo verde saturado al máximo
      flame: "#33ff66", // fósforo verde
      asteroid: "#1fa346", // fósforo verde apagado
      bullet: "#d8ffe2", // fósforo verde saturado al máximo
      powerUp: "#33ff66", // fósforo verde
      particle: "31,163,70", // rgb del verde apagado
      shipParticle: "216,255,226", // rgb del verde saturado
    },
    glow: {
      ship: 4,
      flame: 3,
      asteroid: 2,
      bullet: 3,
      powerUp: 4,
      particle: 0,
      indicator: 2,
    },
  },
  // Pastel sobre noche ciruela: nave mantequilla, rocas azul polvo y power-up rosa.
  pastel: {
    palette: {
      bg: "#0d0b14", // noche ciruela
      ship: "#fff3a8", // mantequilla
      flame: "#ffc8a2", // melocotón
      asteroid: "#a8e6f0", // azul polvo
      bullet: "#f4f1ff", // lavanda casi blanca
      powerUp: "#ffb3d1", // rosa chicle
      particle: "168,230,240", // rgb del azul polvo
      shipParticle: "255,243,168", // rgb de la mantequilla
    },
    glow: {
      ship: 6,
      flame: 5,
      asteroid: 4,
      bullet: 4,
      powerUp: 6,
      particle: 0,
      indicator: 4,
    },
  },
};

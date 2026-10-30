import type { SkinId } from "@/lib/games/skins";
import type { BlockColor } from "./levels";
// Port 1:1 de references/started-games/04-arkanoid/game.js. Mundo lógico fijo: el canvas se escala por CSS.
export const W = 800;
export const H = 600;
// ── Paleta y pelota ──
export const PADDLE_SPEED = 400; // px/s con ← →
export const PADDLE = { y: 560, w: 81, h: 14 } as const;
export const PADDLE_CATCH = 8; // px por debajo del borde superior que aún cuentan como contacto
export const BALL_SIZE = 16;
export const BASE_BALL_VX = 200;
export const BASE_BALL_VY = -300;
// ── Bloques (rejilla de 10 × 6) ──
export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2; // 80
export const BLOCKS_ORIGIN_Y = 80;
// ── Reglas ──
export const POINTS_PER_BLOCK = 10;
export const START_LIVES = 3;
export const SPEED_STEP = 1.1; // multiplicador por nivel a partir del 6
export const MAX_SPEED = 2.0;
export const EXPLOSION_DURATION = 150; // ms
export const MAX_DT = 50; // ms: límite del dt, único cambio sobre la física del original
// ── Skins ── (presentación: colores y glow; las reglas no cambian)
export type Palette = {
  bg: string;
  paddle: string;
  paddleCore: string; // núcleo del tubo de la paleta
  ball: string;
  ballGlow: string; // color del halo de la pelota
  blockFillAlpha: number; // opacidad del relleno del bloque (1 = macizo)
  blockEdge: string; // filo superior del bloque
  blocks: Record<BlockColor, string>; // #rrggbb: la explosión los aclara con tint()
};
export type Glow = {
  paddle: number;
  ball: number;
  block: number;
  explosion: number;
};
export type Skin = { palette: Palette; glow: Glow };
export const SKINS: Record<SkinId, Skin> = {
  // Colores del original: los nombres CSS de levels.js/game.js en hex, bloques macizos y sin glow.
  clasico: {
    palette: {
      bg: "#000000", // game.js original
      paddle: "#ffffff", // game.js original
      paddleCore: "#ffffff", // sin núcleo: paleta maciza
      ball: "#ffffff", // game.js original
      ballGlow: "#ffffff",
      blockFillAlpha: 1, // bloque macizo, como el sprite original
      blockEdge: "rgba(255,255,255,0)", // sin filo
      blocks: {
        red: "#ff0000", // levels.js original: red
        yellow: "#ffff00", // levels.js original: yellow
        cyan: "#00ffff", // levels.js original: cyan
        magenta: "#ff00ff", // levels.js original: magenta
        hotpink: "#ff69b4", // levels.js original: hotpink
        green: "#008000", // levels.js original: green
        gray: "#808080", // levels.js original: gray
      },
    },
    glow: { paddle: 0, ball: 0, block: 0, explosion: 0 },
  },
  // Paleta neón de la plataforma: hex de los tokens de app/globals.css (el canvas no lee variables CSS).
  // Los nombres de color del original se conservan en levels.ts; solo cambia el hex al que apuntan.
  // Lo que brilla es lo que se mueve (paleta, pelota, explosiones); los bloques son tubos de neón apagados:
  // cristal tintado con un filo encendido, sin shadowBlur.
  neon: {
    palette: {
      bg: "#000",
      paddle: "#00f5ff", // --cyan (color de BLOQUE BUSTER)
      paddleCore: "#e6fdff", // núcleo blanco del tubo de neón
      ball: "#e6e9ff", // --ink
      ballGlow: "#00f5ff", // halo cyan: la pelota pertenece a la paleta
      blockFillAlpha: 0.22, // cristal tintado del bloque
      blockEdge: "rgba(255,255,255,0.45)", // filo superior encendido
      blocks: {
        red: "#ff7700", // naranja de cover-tetro: --bronze (#d97a3a) quedaba mate junto al neón
        yellow: "#f5ff00", // --yellow
        cyan: "#00f5ff", // --cyan
        magenta: "#ff006e", // --magenta
        hotpink: "#b44dff", // violeta de cover-tetro, aclarado: --gold se confundía con --yellow (filas contiguas en la pirámide)
        green: "#00ff88", // --green
        gray: "#c7d0e0", // --silver
      },
    },
    // Radio del glow (shadowBlur) en px lógicos; glow() lo escala por el devicePixelRatio.
    glow: {
      paddle: 16,
      ball: 14,
      block: 0, // sin glow: 60 shadowBlur por frame (ver Riesgos de la spec); el filo encendido hace de neón
      explosion: 18,
    },
  },
  // Pantalla LCD de consola portátil 8-bit (verde oliva): los bloques se separan por luminosidad.
  retro: {
    palette: {
      bg: "#071407", // LCD apagado
      paddle: "#eefcc8", // LCD verde, píxel encendido al máximo
      paddleCore: "#ffffff",
      ball: "#ffffff", // píxel encendido
      ballGlow: "#9bbc0f", // LCD verde claro
      blockFillAlpha: 0.85, // casi macizo: píxeles de LCD
      blockEdge: "rgba(7,20,7,0.55)", // rejilla oscura del LCD
      blocks: {
        red: "#a6c832", // LCD verde medio-claro
        yellow: "#d8f282", // LCD verde muy claro
        cyan: "#c0e050", // LCD verde claro
        magenta: "#7aa014", // LCD verde medio
        hotpink: "#e9fbb4", // LCD verde casi blanco
        green: "#8bac0f", // LCD verde (paleta 8-bit clásica)
        gray: "#5e8a10", // LCD verde oscuro
      },
    },
    glow: { paddle: 3, ball: 4, block: 0, explosion: 4 },
  },
  // Pastel sobre noche índigo: la paleta conserva el cian de BLOQUE BUSTER, en suave.
  pastel: {
    palette: {
      bg: "#0c0d16", // noche índigo
      paddle: "#a8ecf5", // cian pastel (color de BLOQUE BUSTER)
      paddleCore: "#f2fdff",
      ball: "#f4f1ff", // lavanda casi blanca
      ballGlow: "#a8ecf5",
      blockFillAlpha: 0.3, // caramelo translúcido
      blockEdge: "rgba(255,255,255,0.4)",
      blocks: {
        red: "#ffc4a0", // melocotón
        yellow: "#fff3a0", // vainilla
        cyan: "#a8d8ff", // cielo
        magenta: "#ffb0cc", // rosa chicle
        hotpink: "#d8b8ff", // lila
        green: "#b0f0c0", // menta
        gray: "#dce0ea", // plata
      },
    },
    glow: { paddle: 6, ball: 6, block: 0, explosion: 6 },
  },
};
// Explosión: una fase cada 37,5 ms. El bloque se hincha, se aclara y se apaga.
export const EXPLOSION_FRAMES = [
  { scale: 1.0, alpha: 1.0, flash: 0.6 }, // destello casi blanco
  { scale: 1.15, alpha: 0.75, flash: 0.25 },
  { scale: 1.3, alpha: 0.45, flash: 0 },
  { scale: 1.45, alpha: 0.2, flash: 0 },
] as const;

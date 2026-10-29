// Atlas de la fila pixel art de fruits.png (fruta del Snake de Google, vía spriters-resource).
// public/games/serpentina/fruits.png es esa fila recortada (y = 136–295 del original): 3790×160.
// Las coordenadas vienen de sprites.js; los nombres están corregidos (los originales no coincidían).
export const FRUITS_SRC = "/games/serpentina/fruits.png";
export const FRUIT_H = 160;
export const FRUITS = {
  apple: { x: 34, w: 110 },
  banana: { x: 186, w: 150 },
  pineapple: { x: 378, w: 110 }, // también es la fruta bonus
  grape: { x: 540, w: 130 },
  pumpkin: { x: 712, w: 130 },
  turnip: { x: 894, w: 110 },
  eggplant: { x: 1066, w: 110 },
  strawberry: { x: 1228, w: 130 },
  cherry: { x: 1400, w: 130 },
  carrot: { x: 1582, w: 110 },
  mushroom: { x: 1734, w: 150 },
  broccoli: { x: 1906, w: 150 },
  watermelon: { x: 2068, w: 170 },
  pepper: { x: 2250, w: 140 },
  kiwi: { x: 2432, w: 130 },
  lemon: { x: 2604, w: 130 },
  orange: { x: 2786, w: 110 },
  peach: { x: 2948, w: 130 },
  peanut: { x: 3110, w: 150 },
  raspberry: { x: 3302, w: 110 },
  tomato: { x: 3454, w: 150 },
  bowl: { x: 3637, w: 130 },
} as const;
export type FruitName = keyof typeof FRUITS;
export const FRUIT_NAMES = Object.keys(FRUITS) as FruitName[];
// Carga la hoja de fruta. Rechaza si la imagen no carga (el motor dibuja entonces un círculo).
export function loadFruits(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar ${FRUITS_SRC}`));
    img.src = FRUITS_SRC;
  });
}

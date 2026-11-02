// Densidad de píxeles del búfer de los canvas de juego (SPEC 13).
// Por encima de 2 no se aprecia en un canvas de 800×600 escalado por CSS, y el coste crece con el cuadrado.
export const MAX_DPR = 2;
// devicePixelRatio limitado: el búfer nunca pasa de 1600×1200.
export const pixelRatio = () => Math.min(window.devicePixelRatio || 1, MAX_DPR);

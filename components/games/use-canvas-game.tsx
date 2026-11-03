"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { formatHud, type HudKey, type HudRefs } from "@/components/games/hud";
import type { GameAction } from "@/lib/games/input";
import type { SkinId } from "@/lib/games/skins";
import { useSkin } from "@/lib/skin";
export type CanvasEngine = {
  pause: () => void;
  resume: () => void;
  restart: () => void;
  end: () => void;
  destroy: () => void;
  setSkin: (id: SkinId) => void; // cambia colores y glow en caliente, sin reiniciar la partida
  input: (action: GameAction, pressed: boolean) => void; // mando táctil: mismas reglas que el teclado
};
export type HudCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (score: number) => void;
};
const isTypingTarget = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
// Dispositivos táctiles: se muestra el mando en pantalla. El teclado funciona siempre.
const TOUCH_QUERY = "(pointer: coarse)";
const subscribeTouch = (onChange: () => void) => {
  const mql = window.matchMedia(TOUCH_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
};
const getTouch = () => window.matchMedia(TOUCH_QUERY).matches;
// En el servidor se asume sin táctil; el mando aparece tras la hidratación, sin mismatch.
const getServerTouch = () => false;
// Monta un motor de canvas en el CRT y expone su estado para el shell.
// El HUD no es estado: el motor escribe PUNTUACIÓN, VIDAS y NIVEL en `hudRefs` y React no renderiza.
// `create` debe ser estable (una función de módulo), o el motor se recrea en cada render.
// El skin se guarda por juego (`gameId`) y se aplica en caliente con engine.setSkin.
export function useCanvasGame(
  gameId: string,
  create: (
    canvas: HTMLCanvasElement,
    callbacks: HudCallbacks,
    skin: SkinId,
  ) => CanvasEngine,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const [skin, setSkin] = useSkin(gameId);
  // El motor nace con el skin actual, pero el skin no es dependencia de su creación:
  // cambiarlo no debe recrear el motor ni reiniciar la partida.
  const skinRef = useRef(skin);
  const scoreRef = useRef<HTMLDivElement>(null);
  const livesRef = useRef<HTMLDivElement>(null);
  const levelRef = useRef<HTMLDivElement>(null);
  const hudRefs: HudRefs = {
    score: scoreRef,
    lives: livesRef,
    level: levelRef,
  };
  const [paused, setPaused] = useState(false);
  // null = partida en curso; al terminar, la puntuación final (abre el modal).
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const touch = useSyncExternalStore(subscribeTouch, getTouch, getServerTouch);
  // Un motor por montaje: con el doble montaje de StrictMode se destruye el primero.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const refs: HudRefs = { score: scoreRef, lives: livesRef, level: levelRef };
    const write = (k: HudKey, n: number) => {
      const node = refs[k].current;
      if (node) node.textContent = formatHud[k](n);
    };
    const engine = create(
      canvas,
      {
        onScore: (score) => write("score", score),
        onLives: (lives) => write("lives", lives),
        onLevel: (level) => write("level", level),
        onGameOver: (score) => setFinalScore(score),
      },
      skinRef.current,
    );
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [create]);
  useEffect(() => {
    skinRef.current = skin;
    engineRef.current?.setSkin(skin);
  }, [skin]);
  // Única fuente de verdad de la pausa: botón, P/Escape y cambio de pestaña.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (paused) engine.pause();
    else engine.resume();
  }, [paused]);
  const over = finalScore !== null;
  useEffect(() => {
    if (over) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "KeyP" && e.code !== "Escape") return;
      if (e.repeat || isTypingTarget(e.target)) return;
      setPaused((p) => !p);
    };
    const onVisibility = () => {
      if (document.hidden) setPaused(true);
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [over]);
  const restart = () => {
    engineRef.current?.restart();
    setFinalScore(null);
    setPaused(false);
  };
  return {
    canvasRef,
    hudRefs,
    paused,
    finalScore,
    touch,
    togglePause: () => setPaused((p) => !p),
    end: () => engineRef.current?.end(),
    input: (action: GameAction, pressed: boolean) =>
      engineRef.current?.input(action, pressed),
    restart,
    skin,
    setSkin,
  };
}
// El canvas del juego dentro del CRT.
export function CanvasScreen({
  canvasRef,
  label,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  label: string;
}) {
  return <canvas ref={canvasRef} className="game-canvas" aria-label={label} />;
}

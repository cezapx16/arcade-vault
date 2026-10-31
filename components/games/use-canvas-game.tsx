"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
type Hud = { score: number; lives: number; level: number };
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
// `create` debe ser estable (una función de módulo), o el motor se recrea en cada render.
// El skin se guarda por juego (`gameId`) y se aplica en caliente con engine.setSkin.
export function useCanvasGame(
  gameId: string,
  create: (
    canvas: HTMLCanvasElement,
    callbacks: HudCallbacks,
    skin: SkinId,
  ) => CanvasEngine,
  initialHud: Hud,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const [skin, setSkin] = useSkin(gameId);
  // El motor nace con el skin actual, pero el skin no es dependencia de su creación:
  // cambiarlo no debe recrear el motor ni reiniciar la partida.
  const skinRef = useRef(skin);
  const [hud, setHud] = useState(initialHud);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const touch = useSyncExternalStore(subscribeTouch, getTouch, getServerTouch);
  // Un motor por montaje: con el doble montaje de StrictMode se destruye el primero.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = create(
      canvas,
      {
        onScore: (score) => setHud((h) => ({ ...h, score })),
        onLives: (lives) => setHud((h) => ({ ...h, lives })),
        onLevel: (level) => setHud((h) => ({ ...h, level })),
        onGameOver: () => setOver(true),
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
    setOver(false);
    setPaused(false);
  };
  return {
    canvasRef,
    hud,
    paused,
    over,
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

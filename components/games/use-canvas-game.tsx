"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { SkinId } from "@/lib/games/skins";
import { useSkin } from "@/lib/skin";
export type CanvasEngine = {
  pause: () => void;
  resume: () => void;
  restart: () => void;
  end: () => void;
  destroy: () => void;
  setSkin: (id: SkinId) => void; // cambia colores y glow en caliente, sin reiniciar la partida
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
// Dispositivos sin teclado (táctiles): el juego no se puede controlar y el motor no se crea.
const NO_KEYBOARD_QUERY = "(hover: none) and (pointer: coarse)";
const subscribeNoKeyboard = (onChange: () => void) => {
  const mql = window.matchMedia(NO_KEYBOARD_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
};
const getNoKeyboard = () => window.matchMedia(NO_KEYBOARD_QUERY).matches;
// En el servidor se asume teclado; en la hidratación se corrige sin mismatch.
const getServerNoKeyboard = () => false;
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
  const noKeyboard = useSyncExternalStore(
    subscribeNoKeyboard,
    getNoKeyboard,
    getServerNoKeyboard,
  );
  // Un motor por montaje: con el doble montaje de StrictMode se destruye el primero.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (noKeyboard || !canvas) return;
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
  }, [create, noKeyboard]);
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
    noKeyboard,
    togglePause: () => setPaused((p) => !p),
    end: () => engineRef.current?.end(),
    restart,
    skin,
    setSkin,
  };
}
// Aviso "REQUIERE TECLADO" en táctil o el canvas del juego.
export function CanvasScreen({
  canvasRef,
  noKeyboard,
  label,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  noKeyboard: boolean;
  label: string;
}) {
  if (noKeyboard)
    return (
      <div className="crt-content">
        <div>
          <div className="pixel neon-magenta text-[14px] leading-relaxed sm:text-[18px]">
            REQUIERE TECLADO
          </div>
          <div className="mono mt-2.5 text-[11px] tracking-[0.16em] text-ink-dim">
            JUEGA DESDE UN ORDENADOR
          </div>
        </div>
      </div>
    );
  return <canvas ref={canvasRef} className="game-canvas" aria-label={label} />;
}

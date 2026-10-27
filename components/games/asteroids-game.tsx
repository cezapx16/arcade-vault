"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Game } from "@/app/data/games";
import { GameShell } from "@/components/games/game-shell";
import {
  createAsteroidsGame,
  type AsteroidsGame as Engine,
} from "@/lib/games/asteroids/engine";
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
// ROCAS: monta el motor de Asteroids en el CRT y conecta su estado con el shell.
export function AsteroidsGame({ game }: { game: Game }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [hud, setHud] = useState({ score: 0, lives: 3, level: 1 });
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
    const engine = createAsteroidsGame(canvas, {
      onScore: (score) => setHud((h) => ({ ...h, score })),
      onLives: (lives) => setHud((h) => ({ ...h, lives })),
      onLevel: (level) => setHud((h) => ({ ...h, level })),
      onGameOver: () => setOver(true),
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [noKeyboard]);
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
  return (
    <GameShell
      game={game}
      hud={hud}
      paused={paused}
      over={over}
      onTogglePause={() => setPaused((p) => !p)}
      onEnd={() => engineRef.current?.end()}
      onRestart={restart}
    >
      {noKeyboard ? (
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
      ) : (
        <canvas
          ref={canvasRef}
          className="game-canvas"
          aria-label={`${game.title}: área de juego`}
        />
      )}
    </GameShell>
  );
}

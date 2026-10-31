"use client";
import type { Game } from "@/app/data/games";
import { GameShell } from "@/components/games/game-shell";
import { TouchPad } from "@/components/games/touch-pad";
import {
  CanvasScreen,
  useCanvasGame,
} from "@/components/games/use-canvas-game";
import { createAsteroidsGame } from "@/lib/games/asteroids/engine";
import type { TouchLayout } from "@/lib/games/input";
const INITIAL_HUD = { score: 0, lives: 3, level: 1 };
// Mando táctil: ← → giran, ↑ impulsa y FUEGO dispara (se mantienen).
const TOUCH: TouchLayout = {
  dpad: ["left", "up", "right"],
  buttons: [{ action: "a", label: "FUEGO" }],
};
// ROCAS: monta el motor de Asteroids en el CRT y conecta su estado con el shell.
export function AsteroidsGame({ game }: { game: Game }) {
  const {
    canvasRef,
    hud,
    paused,
    over,
    touch,
    togglePause,
    end,
    input,
    restart,
    skin,
    setSkin,
  } = useCanvasGame(game.id, createAsteroidsGame, INITIAL_HUD);
  return (
    <GameShell
      game={game}
      hud={hud}
      paused={paused}
      over={over}
      onTogglePause={togglePause}
      onEnd={end}
      onRestart={restart}
      skin={skin}
      onSkinChange={setSkin}
      controls={
        touch && (
          <TouchPad layout={TOUCH} onInput={input} disabled={paused || over} />
        )
      }
    >
      <CanvasScreen
        canvasRef={canvasRef}
        label={`${game.title}: área de juego`}
      />
    </GameShell>
  );
}

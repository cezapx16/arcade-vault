"use client";
import type { Game } from "@/app/data/games";
import { GameShell } from "@/components/games/game-shell";
import { TouchPad } from "@/components/games/touch-pad";
import {
  CanvasScreen,
  useCanvasGame,
} from "@/components/games/use-canvas-game";
import type { TouchLayout } from "@/lib/games/input";
import { createTetrisGame } from "@/lib/games/tetris/engine";
const INITIAL_HUD = { score: 0, lives: 1, level: 1 };
// Mando táctil: ← ↓ → con autorrepetición, ROTAR y SOLTAR.
const TOUCH: TouchLayout = {
  dpad: ["left", "down", "right"],
  buttons: [
    { action: "b", label: "SOLTAR" },
    { action: "a", label: "ROTAR" },
  ],
  repeat: ["left", "right", "down"],
};
// CAÍDA: monta el motor de Tetris en el CRT y conecta su estado con el shell.
export function TetrisGame({ game }: { game: Game }) {
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
  } = useCanvasGame(game.id, createTetrisGame, INITIAL_HUD);
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

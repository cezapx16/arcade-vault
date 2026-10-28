"use client";
import type { Game } from "@/app/data/games";
import { GameShell } from "@/components/games/game-shell";
import {
  CanvasScreen,
  useCanvasGame,
} from "@/components/games/use-canvas-game";
import { createTetrisGame } from "@/lib/games/tetris/engine";
const INITIAL_HUD = { score: 0, lives: 1, level: 1 };
// CAÍDA: monta el motor de Tetris en el CRT y conecta su estado con el shell.
export function TetrisGame({ game }: { game: Game }) {
  const {
    canvasRef,
    hud,
    paused,
    over,
    noKeyboard,
    togglePause,
    end,
    restart,
  } = useCanvasGame(createTetrisGame, INITIAL_HUD);
  return (
    <GameShell
      game={game}
      hud={hud}
      paused={paused}
      over={over}
      onTogglePause={togglePause}
      onEnd={end}
      onRestart={restart}
    >
      <CanvasScreen
        canvasRef={canvasRef}
        noKeyboard={noKeyboard}
        label={`${game.title}: área de juego`}
      />
    </GameShell>
  );
}

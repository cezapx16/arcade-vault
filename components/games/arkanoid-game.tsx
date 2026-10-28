"use client";
import type { Game } from "@/app/data/games";
import { GameShell } from "@/components/games/game-shell";
import {
  CanvasScreen,
  useCanvasGame,
} from "@/components/games/use-canvas-game";
import { createArkanoidGame } from "@/lib/games/arkanoid/engine";
const INITIAL_HUD = { score: 0, lives: 3, level: 1 };
// BLOQUE BUSTER: monta el motor de Arkanoid en el CRT y conecta su estado con el shell.
export function ArkanoidGame({ game }: { game: Game }) {
  const {
    canvasRef,
    hud,
    paused,
    over,
    noKeyboard,
    togglePause,
    end,
    restart,
  } = useCanvasGame(createArkanoidGame, INITIAL_HUD);
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

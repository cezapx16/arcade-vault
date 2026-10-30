"use client";
import type { Game } from "@/app/data/games";
import { GameShell } from "@/components/games/game-shell";
import {
  CanvasScreen,
  useCanvasGame,
} from "@/components/games/use-canvas-game";
import { createAsteroidsGame } from "@/lib/games/asteroids/engine";
const INITIAL_HUD = { score: 0, lives: 3, level: 1 };
// ROCAS: monta el motor de Asteroids en el CRT y conecta su estado con el shell.
export function AsteroidsGame({ game }: { game: Game }) {
  const {
    canvasRef,
    hud,
    paused,
    over,
    noKeyboard,
    togglePause,
    end,
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
    >
      <CanvasScreen
        canvasRef={canvasRef}
        noKeyboard={noKeyboard}
        label={`${game.title}: área de juego`}
      />
    </GameShell>
  );
}

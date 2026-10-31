"use client";
import type { Game } from "@/app/data/games";
import { GameShell } from "@/components/games/game-shell";
import { TouchPad } from "@/components/games/touch-pad";
import {
  CanvasScreen,
  useCanvasGame,
} from "@/components/games/use-canvas-game";
import type { TouchLayout } from "@/lib/games/input";
import { createSnakeGame } from "@/lib/games/snake/engine";
const INITIAL_HUD = { score: 0, lives: 3, level: 1 };
// Mando táctil: las cuatro flechas, un giro por toque.
const TOUCH: TouchLayout = {
  dpad: ["up", "left", "down", "right"],
  buttons: [],
};
// SERPENTINA: monta el motor de Snake en el CRT y conecta su estado con el shell.
export function SnakeGame({ game }: { game: Game }) {
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
  } = useCanvasGame(game.id, createSnakeGame, INITIAL_HUD);
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

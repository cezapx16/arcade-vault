"use client";
import type { Game } from "@/app/data/games";
import { GameShell } from "@/components/games/game-shell";
import { TouchPad } from "@/components/games/touch-pad";
import {
  CanvasScreen,
  useCanvasGame,
} from "@/components/games/use-canvas-game";
import { createArkanoidGame } from "@/lib/games/arkanoid/engine";
import type { TouchLayout } from "@/lib/games/input";
const INITIAL_HUD = { score: 0, lives: 3, level: 1 };
// Mando táctil: ← → mantenidas. Arrastrar el dedo sobre el canvas también mueve la paleta.
const TOUCH: TouchLayout = { dpad: ["left", "right"], buttons: [] };
// BLOQUE BUSTER: monta el motor de Arkanoid en el CRT y conecta su estado con el shell.
export function ArkanoidGame({ game }: { game: Game }) {
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
  } = useCanvasGame(game.id, createArkanoidGame, INITIAL_HUD);
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

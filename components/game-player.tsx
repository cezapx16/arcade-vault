"use client";

import { useEffect, useState } from "react";
import type { Game } from "@/app/data/games";
import { GameShell } from "@/components/games/game-shell";

// Partida simulada (placeholder hasta que existan juegos reales), copiada de la referencia.
const INITIAL_RUN = { score: 0, level: 1 };

export function GamePlayer({ game }: { game: Game }) {
  const [run, setRun] = useState(INITIAL_RUN);
  const [lives, setLives] = useState(3);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (over || paused) return;
    const t = setInterval(() => {
      const inc = Math.floor(10 + Math.random() * 90);
      setRun((r) => {
        const next = r.score + inc;
        return {
          score: next,
          level: next % 2500 < 100 ? r.level + 1 : r.level,
        };
      });
    }, 220);
    return () => clearInterval(t);
  }, [over, paused]);

  const restart = () => {
    setRun(INITIAL_RUN);
    setLives(3);
    setPaused(false);
    setOver(false);
  };

  return (
    <GameShell
      game={game}
      hud={{ score: run.score, lives, level: run.level }}
      paused={paused}
      over={over}
      onTogglePause={() => setPaused((p) => !p)}
      onEnd={() => setOver(true)}
      onRestart={restart}
    >
      <div className="game-arena">
        <div className="grid-floor"></div>
        <div className="enemy e1"></div>
        <div className="enemy e2"></div>
        <div className="enemy e3"></div>
        <div className="player-ship"></div>
      </div>
    </GameShell>
  );
}

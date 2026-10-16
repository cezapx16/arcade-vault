"use client";

import Link from "next/link";
import { useState } from "react";
import { GAMES } from "@/app/data/games";
import { seedFor, seededScores } from "@/app/data/scores";
import { useUser } from "@/lib/session";

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (n: number) => n.toLocaleString("es-ES");

export function HallOfFame() {
  const user = useUser();
  const [tab, setTab] = useState(GAMES[0].id);
  const rows = seededScores(seedFor(tab), 12);
  const game = GAMES.find((g) => g.id === tab)!;
  // Marca falsa del usuario, mismo cálculo que la referencia.
  const youRank = Math.floor(8 + (tab.length % 4));
  const youScore = rows[5].score - 2400 || 9999;

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel text-[10px]">LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA</p>
      </div>

      <div className="hall-tabs">
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            aria-pressed={tab === g.id}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      <div className="podium">
        <div className="podium-slot silver">
          <div className="rank-num">02</div>
          <div className="name">{rows[1].name}</div>
          <div className="score">{fmt(rows[1].score)}</div>
          <div className="date">{rows[1].date}</div>
        </div>
        <div className="podium-slot gold">
          <div className="pixel text-[9px] text-gold tracking-[0.18em]!">CAMPEÓN</div>
          <div className="rank-num mt-1 text-[36px]!">01</div>
          <div className="name">{rows[0].name}</div>
          <div className="score text-[20px]!">{fmt(rows[0].score)}</div>
          <div className="date">{rows[0].date}</div>
        </div>
        <div className="podium-slot bronze">
          <div className="rank-num">03</div>
          <div className="name">{rows[2].name}</div>
          <div className="score">{fmt(rows[2].score)}</div>
          <div className="date">{rows[2].date}</div>
        </div>
      </div>

      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {rows.map((r, i) => (
          // La key incluye la pestaña para que la cascada se repita al cambiar de juego.
          <div
            key={`${tab}-${i}`}
            className={"tr" + (i < 3 ? ` top${i + 1}` : "")}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="rk">#{pad(r.rank)}</div>
            <div className="pl">{r.name}</div>
            <div className="sc">{fmt(r.score)}</div>
            <div className="dt">{r.date}</div>
          </div>
        ))}
        {user && (
          <>
            <div className="tr you-label">▸ TU MEJOR MARCA EN {game.title}</div>
            <div className="tr you" style={{ animationDelay: `${rows.length * 50 + 50}ms` }}>
              <div className="rk text-yellow!">#{pad(youRank)}</div>
              <div className="pl text-yellow!">{user.name}</div>
              <div className="sc text-yellow! [text-shadow:0_0_6px_rgba(245,255,0,0.5)]!">{fmt(youScore)}</div>
              <div className="dt">11/05/2026</div>
            </div>
          </>
        )}
      </div>

      <div className="mt-8 text-center">
        <Link href="/" className="btn lg text-center">VOLVER A LA BIBLIOTECA</Link>
      </div>
    </div>
  );
}

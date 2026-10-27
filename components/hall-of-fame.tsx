"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LeaderboardState } from "@/components/leaderboard-state";
import { formatScoreDate } from "@/lib/data/format";
import type { Leaderboard, LeaderboardRow } from "@/lib/data/scores";
import { useUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnv } from "@/lib/supabase/env";
const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (n: number) => n.toLocaleString("es-ES");
type PlayerBest = { rank: number; score: number; date: string };
export function HallOfFame({
  games,
  rankings,
}: {
  games: { id: string; title: string }[];
  rankings: Record<string, Leaderboard>;
}) {
  const user = useUser();
  const [tab, setTab] = useState(games[0]?.id ?? "");
  const rows = rankings[tab] ?? null;
  const game = games.find((g) => g.id === tab);
  const best = usePlayerBest(tab, user?.name);
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel text-[10px]">
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>
      <div className="hall-tabs">
        {games.map((g) => (
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
      {rows === null || rows.length === 0 ? (
        <div className="hall-table">
          {rows === null ? (
            <LeaderboardState kind="unavailable" />
          ) : (
            <LeaderboardState kind="empty" playHref={`/games/${tab}/play`} />
          )}
        </div>
      ) : (
        <>
          <Podium rows={rows} />
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
            {user && best && game && (
              <>
                <div className="tr you-label">
                  ▸ TU MEJOR MARCA EN {game.title}
                </div>
                <div
                  className="tr you"
                  style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
                >
                  <div className="rk text-yellow!">#{pad(best.rank)}</div>
                  <div className="pl text-yellow!">{user.name}</div>
                  <div className="sc text-yellow! [text-shadow:0_0_6px_rgba(245,255,0,0.5)]!">
                    {fmt(best.score)}
                  </div>
                  <div className="dt">{best.date}</div>
                </div>
              </>
            )}
          </div>
        </>
      )}
      <div className="mt-8 text-center">
        <Link href="/games" className="btn lg text-center">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
// Solo pinta las posiciones del podio que existan.
function Podium({ rows }: { rows: LeaderboardRow[] }) {
  const [first, second, third] = rows;
  return (
    <div className="podium">
      {second && (
        <div className="podium-slot silver">
          <div className="rank-num">02</div>
          <div className="name">{second.name}</div>
          <div className="score">{fmt(second.score)}</div>
          <div className="date">{second.date}</div>
        </div>
      )}
      {first && (
        <div className="podium-slot gold">
          <div className="pixel text-[9px] text-gold tracking-[0.18em]!">
            CAMPEÓN
          </div>
          <div className="rank-num mt-1 text-[36px]!">01</div>
          <div className="name">{first.name}</div>
          <div className="score text-[20px]!">{fmt(first.score)}</div>
          <div className="date">{first.date}</div>
        </div>
      )}
      {third && (
        <div className="podium-slot bronze">
          <div className="rank-num">03</div>
          <div className="name">{third.name}</div>
          <div className="score">{fmt(third.score)}</div>
          <div className="date">{third.date}</div>
        </div>
      )}
    </div>
  );
}
// Marca del usuario en el juego activo (player_best). null sin usuario, sin filas o si el RPC falla.
function usePlayerBest(
  gameId: string,
  name: string | undefined,
): PlayerBest | null {
  const key = name ? `${gameId}|${name}` : null;
  const [result, setResult] = useState<{
    key: string;
    best: PlayerBest | null;
  } | null>(null);
  useEffect(() => {
    // Sin Supabase configurado no hay marca que buscar (y no se ensucia la consola).
    if (!key || !name || !getSupabaseEnv()) return;
    let cancelled = false;
    (async () => {
      let best: PlayerBest | null = null;
      try {
        const { data, error } = await createClient().rpc("player_best", {
          p_game: gameId,
          p_name: name,
        });
        if (error) throw error;
        const row = data[0];
        if (row)
          best = {
            rank: row.rank,
            score: row.score,
            date: formatScoreDate(row.created_at),
          };
      } catch {
        // Si el RPC falla, no se muestra el bloque.
      }
      if (!cancelled) setResult({ key, best });
    })();
    return () => {
      cancelled = true;
    };
  }, [key, gameId, name]);
  // Evita mostrar la marca de la pestaña anterior mientras llega la nueva.
  return result && result.key === key ? result.best : null;
}

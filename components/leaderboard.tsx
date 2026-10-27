import { LeaderboardState } from "@/components/leaderboard-state";
import { getLeaderboard } from "@/lib/data/scores";

export async function Leaderboard({ gameId }: { gameId: string }) {
  const rows = await getLeaderboard(gameId, 10);

  return (
    <div className="leaderboard">
      <h3>TOP 10 · MEJORES PUNTUACIONES</h3>
      {rows === null ? (
        <LeaderboardState kind="unavailable" />
      ) : rows.length === 0 ? (
        <LeaderboardState kind="empty" playHref={`/games/${gameId}/play`} />
      ) : (
        rows.map((r) => (
          <div
            key={r.rank}
            className={"lb-row" + (r.rank <= 3 ? ` top${r.rank}` : "")}
          >
            <span className="rk">{String(r.rank).padStart(2, "0")}</span>
            <span className="pl">{r.name}</span>
            <span className="sc">{r.score.toLocaleString("es-ES")}</span>
          </div>
        ))
      )}
    </div>
  );
}

// Mientras llega el ranking: el marco con filas atenuadas, sin cambiar la altura.
export function LeaderboardSkeleton() {
  return (
    <div className="leaderboard" aria-busy="true">
      <h3>TOP 10 · MEJORES PUNTUACIONES</h3>
      <div className="lb-ghost">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="lb-row">
            <span className="rk">{String(i + 1).padStart(2, "0")}</span>
            <span className="pl">· · · · · ·</span>
            <span className="sc">-------</span>
          </div>
        ))}
      </div>
    </div>
  );
}

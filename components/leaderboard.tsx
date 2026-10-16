import { seedFor, seededScores } from "@/app/data/scores";

export function Leaderboard({ gameId }: { gameId: string }) {
  const rows = seededScores(seedFor(gameId), 10);

  return (
    <div className="leaderboard">
      <h3>TOP 10 · MEJORES PUNTUACIONES</h3>
      {rows.map((r) => (
        <div key={r.rank} className={"lb-row" + (r.rank <= 3 ? ` top${r.rank}` : "")}>
          <span className="rk">{String(r.rank).padStart(2, "0")}</span>
          <span className="pl">{r.name}</span>
          <span className="sc">{r.score.toLocaleString("es-ES")}</span>
        </div>
      ))}
    </div>
  );
}

import Link from "next/link";
// Estados del ranking sin filas: vacío (nadie ha jugado) o no disponible (Supabase caído).
// Sin dependencias de servidor para poder usarlo también desde el Salón de la Fama.
export function LeaderboardState({
  kind,
  playHref,
}: {
  kind: "empty" | "unavailable";
  playHref?: string;
}) {
  if (kind === "unavailable") {
    return (
      <div className="lb-state down" role="status">
        <div className="lb-static" aria-hidden="true"></div>
        <div className="lb-state-title pixel">RANKING NO DISPONIBLE</div>
        <p className="lb-state-text">
          No se pudo cargar el ranking. Vuelve a intentarlo en unos minutos.
        </p>
      </div>
    );
  }
  return (
    <div className="lb-state empty" role="status">
      <div className="lb-ghost" aria-hidden="true">
        {["01", "02", "03"].map((rk, i) => (
          <div key={rk} className="lb-row">
            <span className="rk">{rk}</span>
            <span className="pl">
              {i === 0 ? <span className="lb-caret">_</span> : "· · · · · ·"}
            </span>
            <span className="sc">-------</span>
          </div>
        ))}
      </div>
      <div className="lb-state-title pixel">SIN PUNTUACIONES TODAVÍA</div>
      <p className="lb-state-text">
        Nadie ha jugado aún. La primera partida se queda el puesto 01.
      </p>
      {playHref && (
        <Link href={playHref} className="btn text-center">
          JUGAR AHORA
        </Link>
      )}
    </div>
  );
}

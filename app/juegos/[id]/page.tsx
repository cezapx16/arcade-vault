import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GAMES, getGame } from "@/app/data/games";
import { Leaderboard } from "@/components/leaderboard";
import { ScreenLoading } from "@/components/screen-loading";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

const BTN_COLOR = { cyan: "", green: "", magenta: "magenta", yellow: "yellow" } as const;

// params se lee dentro de <Suspense>: con Partial Prefetching el App Shell es
// común a todos los juegos y no puede depender de la URL.
export default function GameDetailPage({ params }: PageProps<"/juegos/[id]">) {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <GameDetail params={params} />
    </Suspense>
  );
}

async function GameDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  return (
    <div className="av-detail fade-in">
      <div className="flex min-w-0 flex-col gap-6">
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover}></div>
        </div>
        <Leaderboard gameId={game.id} />
      </div>

      <div className="detail-info">
        <h2 className="neon-cyan">{game.title}</h2>
        <div className="detail-tags">
          <span>{game.cat}</span>
          <span>1 JUGADOR</span>
        </div>
        <p>{game.long}</p>
        <div className="stat-strip">
          <div>
            <div className="l">Mejor puntuación</div>
            <div className="v">{game.best.toLocaleString("es-ES")}</div>
          </div>
          <div>
            <div className="l">Partidas</div>
            <div className="v">{game.plays}</div>
          </div>
          <div>
            <div className="l">Categoría</div>
            <div className="v">{game.cat}</div>
          </div>
        </div>
        <div className="detail-actions">
          <Link href={`/juegos/${game.id}/jugar`} className={("btn lg pulse text-center " + BTN_COLOR[game.color]).trim()}>
            JUGAR AHORA
          </Link>
          <Link href="/salon" className="btn ghost lg text-center">
            VER SALÓN
          </Link>
        </div>
      </div>
    </div>
  );
}

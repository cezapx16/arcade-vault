import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GAMES, getGame } from "@/app/data/games";
import { GamePlayer } from "@/components/game-player";
import { ScreenLoading } from "@/components/screen-loading";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

// params se lee dentro de <Suspense> (ver /games/[id]/page.tsx).
export default function PlayPage({ params }: PageProps<"/games/[id]/play">) {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <Player params={params} />
    </Suspense>
  );
}

async function Player({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}

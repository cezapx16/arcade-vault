import { notFound } from "next/navigation";
import { getGame } from "@/lib/data/games";
import { TetrisGame } from "@/components/games/tetris-game";
// Ruta estática: tiene prioridad sobre /games/[id]/play, que sigue con la partida simulada.
// No lee params, así que no necesita <Suspense> con Cache Components.
export default async function CaidaPlayPage() {
  const game = await getGame("caida");
  if (!game) notFound();
  return <TetrisGame game={game} />;
}

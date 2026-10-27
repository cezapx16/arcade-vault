import { notFound } from "next/navigation";
import { getGame } from "@/lib/data/games";
import { AsteroidsGame } from "@/components/games/asteroids-game";
// Ruta estática: tiene prioridad sobre /games/[id]/play, que sigue con la partida simulada.
// No lee params, así que no necesita <Suspense> con Cache Components.
export default async function RocasPlayPage() {
  const game = await getGame("rocas");
  if (!game) notFound();
  return <AsteroidsGame game={game} />;
}

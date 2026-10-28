import { notFound } from "next/navigation";
import { getGame } from "@/lib/data/games";
import { ArkanoidGame } from "@/components/games/arkanoid-game";
// Ruta estática: tiene prioridad sobre /games/[id]/play, que sigue con la partida simulada.
// No lee params, así que no necesita <Suspense> con Cache Components.
export default async function BloqueBusterPlayPage() {
  const game = await getGame("bloque-buster");
  if (!game) notFound();
  return <ArkanoidGame game={game} />;
}

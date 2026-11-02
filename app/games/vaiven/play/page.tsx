import { notFound } from "next/navigation";
import { getGame } from "@/lib/data/games";
import { HopperGame } from "@/components/games/hopper-game";
// Ruta estática: tiene prioridad sobre /games/[id]/play, que sigue con la partida simulada.
// No lee params, así que no necesita <Suspense> con Cache Components.
export default async function VaivenPlayPage() {
  const game = await getGame("vaiven");
  if (!game) notFound();
  return <HopperGame game={game} />;
}

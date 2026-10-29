import { notFound } from "next/navigation";
import { getGame } from "@/lib/data/games";
import { SnakeGame } from "@/components/games/snake-game";
// Ruta estática: tiene prioridad sobre /games/[id]/play, que sigue con la partida simulada.
// No lee params, así que no necesita <Suspense> con Cache Components.
export default async function SerpentinaPlayPage() {
  const game = await getGame("serpentina");
  if (!game) notFound();
  return <SnakeGame game={game} />;
}

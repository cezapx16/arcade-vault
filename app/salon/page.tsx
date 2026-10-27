import { HallOfFame } from "@/components/hall-of-fame";
import { getGames } from "@/lib/data/games";
import { getLeaderboard, type Leaderboard } from "@/lib/data/scores";
export default async function SalonPage() {
  const games = await getGames();
  // Cada ranking se cachea por separado (tag scores-<id>) para que updateTag refresque solo su pestaña.
  const boards = await Promise.all(games.map((g) => getLeaderboard(g.id, 12)));
  const rankings: Record<string, Leaderboard> = Object.fromEntries(
    games.map((g, i) => [g.id, boards[i]]),
  );
  return (
    <HallOfFame
      games={games.map((g) => ({ id: g.id, title: g.title }))}
      rankings={rankings}
    />
  );
}

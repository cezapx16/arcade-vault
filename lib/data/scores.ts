import { cacheLife, cacheTag } from "next/cache";
import { formatScoreDate } from "@/lib/data/format";
import { createPublicClient } from "@/lib/supabase/public";
export type LeaderboardRow = {
  rank: number;
  name: string;
  score: number;
  date: string; // dd/mm/aaaa
};
export type Leaderboard = LeaderboardRow[] | null; // null = RANKING NO DISPONIBLE
// Mejor puntuación de cada jugador en un juego, ordenada por posición.
export async function getLeaderboard(
  gameId: string,
  limit: number,
): Promise<Leaderboard> {
  "use cache";
  cacheTag(`scores-${gameId}`);
  const supabase = createPublicClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc("leaderboard", {
        p_game: gameId,
        p_limit: limit,
      });
      if (error) throw error;
      cacheLife("hours");
      return data.map((r) => ({
        rank: r.rank,
        name: r.name,
        score: r.score,
        date: formatScoreDate(r.created_at),
      }));
    } catch (error) {
      console.error(`[scores] Supabase no disponible (${gameId}):`, error);
    }
  }
  cacheLife("minutes");
  return null;
}

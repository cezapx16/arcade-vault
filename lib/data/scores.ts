import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
export type LeaderboardRow = {
  rank: number;
  name: string;
  score: number;
  date: string; // dd/mm/aaaa
};
export type Leaderboard = LeaderboardRow[] | null; // null = RANKING NO DISPONIBLE
// timestamptz → dd/mm/aaaa (UTC)
export function formatScoreDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const mon = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${mon}/${d.getUTCFullYear()}`;
}
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

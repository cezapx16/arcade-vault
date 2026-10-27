import { cacheLife, cacheTag } from "next/cache";
import {
  GAMES,
  type GameCategory,
  type GameColor,
  type GameWithStats,
} from "@/app/data/games";
import { createPublicClient } from "@/lib/supabase/public";
// Catálogo sin Supabase: los juegos de app/data/games.ts con las estadísticas a 0.
function fallbackGames(): GameWithStats[] {
  return GAMES.map((g) => ({ ...g, best: 0, plays: 0 }));
}
// Catálogo con best y plays, en el orden de sort_order.
export async function getGames(): Promise<GameWithStats[]> {
  "use cache";
  cacheTag("games", "game-stats");
  const supabase = createPublicClient();
  if (supabase) {
    try {
      const [games, stats] = await Promise.all([
        supabase
          .from("games")
          .select("id, title, short, long, cat, cover, color")
          .order("sort_order"),
        supabase.from("game_stats").select("game_id, best, plays"),
      ]);
      if (games.error) throw games.error;
      if (stats.error) throw stats.error;
      const byId = new Map(stats.data.map((s) => [s.game_id, s]));
      cacheLife("hours");
      return games.data.map((g) => ({
        ...g,
        cat: g.cat as GameCategory,
        cover: g.cover as `cover-${string}`,
        color: g.color as GameColor,
        best: byId.get(g.id)?.best ?? 0,
        plays: byId.get(g.id)?.plays ?? 0,
      }));
    } catch (error) {
      console.error("[games] Supabase no disponible:", error);
    }
  }
  // Vida corta para que el respaldo no se quede cacheado cuando Supabase vuelva.
  cacheLife("minutes");
  return fallbackGames();
}
export async function getGame(id: string): Promise<GameWithStats | undefined> {
  const games = await getGames();
  return games.find((g) => g.id === id);
}
// 15600 → "15.6K"
export function formatPlays(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

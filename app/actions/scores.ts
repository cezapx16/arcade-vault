"use server";
import { updateTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
export type SubmitScoreResult =
  | { ok: true }
  | { ok: false; error: "DATOS NO VÁLIDOS" | "NO SE PUDO GUARDAR" };
const GAME_ID = /^[a-z0-9-]{1,32}$/;
const MAX_SCORE = 9_999_999;
// Guarda una puntuación como anon. Las mismas reglas las imponen los check de la tabla.
export async function submitScore(input: {
  gameId: string;
  name: string;
  score: number;
}): Promise<SubmitScoreResult> {
  const gameId = typeof input?.gameId === "string" ? input.gameId : "";
  const name =
    typeof input?.name === "string" ? input.name.trim().toUpperCase() : "";
  const score = input?.score;
  if (
    !GAME_ID.test(gameId) ||
    name.length < 1 ||
    name.length > 10 ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > MAX_SCORE
  ) {
    return { ok: false, error: "DATOS NO VÁLIDOS" };
  }
  const supabase = createPublicClient();
  if (!supabase) {
    console.error(
      "[scores] faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
    return { ok: false, error: "NO SE PUDO GUARDAR" };
  }
  try {
    const { error } = await supabase
      .from("scores")
      .insert({ game_id: gameId, name, score });
    if (error) throw error;
  } catch (error) {
    console.error("[scores] no se pudo guardar la puntuación:", error);
    return { ok: false, error: "NO SE PUDO GUARDAR" };
  }
  // Read-your-own-writes: el ranking del juego y best/plays se ven al momento.
  updateTag(`scores-${gameId}`);
  updateTag("game-stats");
  return { ok: true };
}

export type SupabaseEnv = { url: string; publishableKey: string };

// Devuelve las variables públicas de Supabase, o null si falta alguna.
// Se leen con el nombre literal para que Next las inyecte en el bundle del cliente.
export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

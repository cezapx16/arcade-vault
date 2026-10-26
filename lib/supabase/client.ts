import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";
// Cliente de Supabase para componentes "use client". Se crea bajo demanda.
export function createClient() {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en el entorno",
    );
  }
  return createBrowserClient<Database>(env.url, env.publishableKey);
}

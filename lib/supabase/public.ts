import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";
// Cliente de Supabase sin cookies ni sesión: sirve dentro de "use cache" y en Server Actions
// que actúan como anon. Devuelve null si faltan las variables.
export function createPublicClient(): SupabaseClient<Database> | null {
  const env = getSupabaseEnv();
  if (!env) return null;
  return createClient<Database>(env.url, env.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Dentro de "use cache" Next guarda cada fetch en .next/cache/fetch-cache y lo reutiliza
    // entre builds. La caché la llevan las funciones "use cache"; las peticiones van siempre a red.
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

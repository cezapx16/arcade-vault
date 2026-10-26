import { connection } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
type HealthResponse =
  | { ok: true; db: "ok"; auth: "ok"; time: string } // time = resultado de health_check()
  | { ok: false; error: string };
function reply(body: HealthResponse, status = 200) {
  return Response.json(body, { status });
}
export async function GET() {
  // Con Cache Components, sin esto la respuesta sin variables se prerenderizaría en el build.
  await connection();
  const env = getSupabaseEnv();
  if (!env) {
    console.error(
      "[health] faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
    return reply({ ok: false, error: "SERVICIO NO CONFIGURADO" }, 500);
  }
  try {
    const supabase = await createClient();
    const { data: time, error } = await supabase.rpc("health_check");
    if (error) throw error;
    const auth = await fetch(`${env.url}/auth/v1/health`, {
      headers: { apikey: env.publishableKey },
      cache: "no-store",
    });
    if (!auth.ok) throw new Error(`Auth respondió ${auth.status}`);
    return reply({ ok: true, db: "ok", auth: "ok", time });
  } catch (error) {
    console.error("[health] Supabase no disponible:", error);
    return reply({ ok: false, error: "SUPABASE NO DISPONIBLE" }, 502);
  }
}

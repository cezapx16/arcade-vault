import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
// Canjea el enlace del correo de confirmación (plantilla "Confirm signup":
// {{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email) e inicia la sesión.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  let ok = false;
  if (tokenHash && type && getSupabaseEnv()) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
      });
      if (error) console.error("[auth/confirm] verifyOtp:", error.message);
      ok = !error;
    } catch (error) {
      console.error("[auth/confirm] Supabase no disponible:", error);
    }
  }
  // redirect fuera del try: lanza un error interno que no hay que capturar.
  redirect(ok ? "/" : "/login?error=enlace");
}

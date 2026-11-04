import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";
import { AuthCardFromUrl } from "@/components/auth-card-from-url";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
export const metadata: Metadata = {
  title: "Acceso · Arcade Vault",
};
// Con sesión no hay nada que hacer aquí: a la home. getClaims lee cookies, así que
// va dentro del <Suspense> (con Cache Components no puede ir en el prerender).
async function LoginGate() {
  let signedIn = false;
  if (getSupabaseEnv()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getClaims();
      signedIn = Boolean(data?.claims);
    } catch (error) {
      console.error("[login] no se pudo comprobar la sesión:", error);
    }
  }
  if (signedIn) redirect("/");
  return <AuthCardFromUrl />;
}
// useSearchParams y las cookies necesitan <Suspense> con Cache Components; el fallback
// (pestaña ENTRAR) es lo que se prerenderiza.
export default function LoginPage() {
  return (
    <div className="av-auth-wrap fade-in">
      <Suspense fallback={<AuthCard />}>
        <LoginGate />
      </Suspense>
    </div>
  );
}

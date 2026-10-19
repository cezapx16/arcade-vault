import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";
import { AuthCardFromUrl } from "@/components/auth-card-from-url";

export const metadata: Metadata = {
  title: "Acceso · Arcade Vault",
};

// useSearchParams necesita <Suspense> con Cache Components; el fallback
// (pestaña ENTRAR) es lo que se prerenderiza.
export default function LoginPage() {
  return (
    <div className="av-auth-wrap fade-in">
      <Suspense fallback={<AuthCard />}>
        <AuthCardFromUrl />
      </Suspense>
    </div>
  );
}

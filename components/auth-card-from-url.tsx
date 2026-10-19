"use client";

import { useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/auth-card";

// /login?tab=registro abre la pestaña REGISTRO; cualquier otro valor, ENTRAR.
// Solo se lee al entrar: cambiar de pestaña no actualiza la URL.
export function AuthCardFromUrl() {
  const tab = useSearchParams().get("tab");
  return <AuthCard initialMode={tab === "registro" ? "register" : "login"} />;
}

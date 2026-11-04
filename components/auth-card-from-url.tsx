"use client";
import { useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
// /login?tab=registro abre la pestaña REGISTRO; cualquier otro valor, ENTRAR.
// /login?error=enlace viene de /auth/confirm cuando el enlace del correo falla.
// Solo se lee al entrar: cambiar de pestaña no actualiza la URL.
export function AuthCardFromUrl() {
  const params = useSearchParams();
  const tab = params.get("tab");
  const error =
    params.get("error") === "enlace"
      ? "EL ENLACE NO ES VÁLIDO O HA CADUCADO"
      : undefined;
  return (
    <AuthCard
      initialMode={tab === "registro" ? "register" : "login"}
      initialError={error}
    />
  );
}

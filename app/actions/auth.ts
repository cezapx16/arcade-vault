"use server";
import { isAuthError, type AuthError } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/site-url";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
export type AuthState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "ok"; name: string } // signIn correcto, con el alias de profiles
  | { status: "check-email"; email: string }; // signUp correcto o email ya registrado
const ALIAS = /^[A-Z0-9_]{1,10}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
// Mensajes de la tarjeta: nunca se muestra el texto en inglés de Supabase.
const MSG = {
  aliasInvalid: "ALIAS: 1–10 LETRAS, NÚMEROS O _",
  aliasTaken: "ESE ALIAS YA ESTÁ EN USO",
  emailInvalid: "INTRODUCE UN EMAIL VÁLIDO",
  passwordShort: "LA CONTRASEÑA NECESITA 8 CARACTERES",
  passwordMismatch: "LAS CONTRASEÑAS NO COINCIDEN",
  badCredentials: "EMAIL O CONTRASEÑA INCORRECTOS",
  notConfirmed: "CONFIRMA TU EMAIL ANTES DE ENTRAR",
  rateLimit: "DEMASIADOS INTENTOS, ESPERA UN POCO",
  unavailable: "SERVICIO NO DISPONIBLE",
} as const;
const fail = (message: string): AuthState => ({ status: "error", message });
function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
// Traduce los errores conocidos de Supabase Auth; el resto es "SERVICIO NO DISPONIBLE".
function authMessage(error: AuthError): string {
  if (error.status === 429) return MSG.rateLimit;
  switch (error.code) {
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return MSG.rateLimit;
    case "weak_password":
      return MSG.passwordShort;
    case "invalid_credentials":
      return MSG.badCredentials;
    case "email_not_confirmed":
      return MSG.notConfirmed;
    default:
      return MSG.unavailable;
  }
}
export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const name = field(formData, "alias").trim().toUpperCase();
  const email = field(formData, "email").trim();
  const password = field(formData, "password");
  const password2 = field(formData, "password2");
  if (!ALIAS.test(name)) return fail(MSG.aliasInvalid);
  if (!EMAIL.test(email)) return fail(MSG.emailInvalid);
  if (password.length < MIN_PASSWORD) return fail(MSG.passwordShort);
  if (password !== password2) return fail(MSG.passwordMismatch);
  if (!getSupabaseEnv()) return fail(MSG.unavailable);
  // Origen fijo para el enlace del correo: nunca sale de las cabeceras (SPEC 17).
  const siteUrl = getSiteUrl();
  if (!siteUrl) {
    console.error("[auth] signUp: falta SITE_URL");
    return fail(MSG.unavailable);
  }
  try {
    const supabase = await createClient();
    const available = await supabase.rpc("alias_available", { p_name: name });
    if (available.error) throw available.error;
    if (!available.data) return fail(MSG.aliasTaken);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }, // alias ya en mayúsculas; lo lee el trigger
        emailRedirectTo: `${siteUrl}/auth/confirm`,
      },
    });
    if (error) {
      // Si el trigger choca con el unique de profiles (registro simultáneo), Supabase
      // solo devuelve un error genérico: se vuelve a mirar si el alias sigue libre.
      if (error.status === 500) {
        const again = await supabase.rpc("alias_available", { p_name: name });
        if (again.data === false) return fail(MSG.aliasTaken);
      }
      console.error("[auth] signUp:", error.code, error.message);
      // Anti-enumeración (SPEC 17): un email ya registrado responde igual que uno nuevo.
      if (
        error.code === "user_already_exists" ||
        error.code === "email_exists"
      ) {
        return { status: "check-email", email };
      }
      return fail(authMessage(error));
    }
    // Con la confirmación activada, un email ya registrado llega aquí sin error y con
    // data.user.identities vacío: también "check-email", para no revelar que tiene cuenta.
    return { status: "check-email", email };
  } catch (error) {
    console.error("[auth] signUp: Supabase no disponible:", error);
    return fail(isAuthError(error) ? authMessage(error) : MSG.unavailable);
  }
}
export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = field(formData, "email").trim();
  const password = field(formData, "password");
  if (!email || !password) return fail(MSG.badCredentials);
  if (!getSupabaseEnv()) return fail(MSG.unavailable);
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error("[auth] signIn:", error.code, error.message);
      return fail(authMessage(error));
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", data.user.id)
      .maybeSingle();
    return { status: "ok", name: profile?.name ?? "JUGADOR" };
  } catch (error) {
    console.error("[auth] signIn: Supabase no disponible:", error);
    return fail(isAuthError(error) ? authMessage(error) : MSG.unavailable);
  }
}
export async function signOut(): Promise<void> {
  if (!getSupabaseEnv()) return;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error("[auth] signOut:", error);
  }
}

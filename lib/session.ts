"use client";
import { useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnv } from "@/lib/supabase/env";
export type User = { name: string };
// Clave de la sesión simulada anterior (SPEC 01); se borra al cargar.
const LEGACY_USER_KEY = "av_user";
const NO_PROFILE_NAME = "JUGADOR";
// Copia en memoria del usuario: es el snapshot estable que exige useSyncExternalStore.
// Sale de la sesión de Supabase Auth (cookies) y del alias de public.profiles.
let current: User | null = null;
let started = false;
let seq = 0; // solo aplica la última lectura si se solapan varias
const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}
function client() {
  return getSupabaseEnv() ? createClient() : null;
}
async function load(): Promise<void> {
  const mine = ++seq;
  let next: User | null = null;
  try {
    const supabase = client();
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .maybeSingle();
        next = { name: profile?.name ?? NO_PROFILE_NAME };
      }
    }
  } catch (error) {
    console.error("[session] no se pudo leer la sesión:", error);
  }
  if (mine !== seq) return;
  if (next?.name === current?.name) return;
  current = next;
  notify();
}
// Primer subscribe: limpia la clave antigua, lee la sesión y escucha cambios de Auth.
function start() {
  started = true;
  try {
    localStorage.removeItem(LEGACY_USER_KEY);
  } catch {}
  void load();
  // Sin await dentro del callback: Supabase recomienda no llamar a su API desde él.
  client()?.auth.onAuthStateChange(() => {
    setTimeout(() => void load(), 0);
  });
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) start();
  return () => {
    listeners.delete(listener);
  };
}
function getSnapshot(): User | null {
  return current;
}
function getServerSnapshot(): User | null {
  return null;
}
export function useUser(): User | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
// Vuelve a leer sesión + perfil. Hay que llamarla tras signIn/signOut (Server Actions):
// las cookies las cambia el servidor y onAuthStateChange del cliente no se entera.
export function refreshUser(): Promise<void> {
  return load();
}

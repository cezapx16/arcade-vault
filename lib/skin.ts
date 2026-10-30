"use client";
import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_SKIN, isSkinId, type SkinId } from "@/lib/games/skins";
// Skin elegido por juego, solo en el cliente: localStorage `av_skin_<gameId>`.
// Mismo patrón que lib/session.ts: copia en memoria como snapshot estable de useSyncExternalStore,
// y si localStorage está bloqueado el skin sigue funcionando durante la visita.
const PREFIX = "av_skin_";
const current = new Map<string, SkinId>();
const listeners = new Set<() => void>();
function readSkin(gameId: string): SkinId {
  try {
    const value = localStorage.getItem(PREFIX + gameId);
    return isSkinId(value) ? value : DEFAULT_SKIN;
  } catch {
    return DEFAULT_SKIN;
  }
}
function notify() {
  listeners.forEach((l) => l());
}
function onStorage(e: StorageEvent) {
  if (e.key === null) current.clear();
  else if (e.key.startsWith(PREFIX)) current.delete(e.key.slice(PREFIX.length));
  else return;
  notify();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}
function getSkin(gameId: string): SkinId {
  let skin = current.get(gameId);
  if (skin === undefined) {
    skin = readSkin(gameId);
    current.set(gameId, skin);
  }
  return skin;
}
const getServerSkin = (): SkinId => DEFAULT_SKIN;
export function setSkin(gameId: string, skin: SkinId) {
  current.set(gameId, skin);
  try {
    localStorage.setItem(PREFIX + gameId, skin);
  } catch {}
  notify();
}
export function useSkin(gameId: string): [SkinId, (skin: SkinId) => void] {
  const skin = useSyncExternalStore(
    subscribe,
    () => getSkin(gameId),
    getServerSkin,
  );
  const set = useCallback((s: SkinId) => setSkin(gameId, s), [gameId]);
  return [skin, set];
}

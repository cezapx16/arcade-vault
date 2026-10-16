"use client";

import { useSyncExternalStore } from "react";

export type User = { name: string };
export type SavedScore = { game: string; score: number; name: string; at: number };

const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";

// Copia en memoria del usuario: es el snapshot estable que exige
// useSyncExternalStore y permite seguir con sesión si localStorage está bloqueado.
let current: User | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function readUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null") as User | null;
  } catch {
    return null;
  }
}

function notify() {
  listeners.forEach((l) => l());
}

function onStorage(e: StorageEvent) {
  if (e.key !== USER_KEY && e.key !== null) return;
  current = readUser();
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

function getSnapshot(): User | null {
  if (!loaded) {
    current = readUser();
    loaded = true;
  }
  return current;
}

function getServerSnapshot(): User | null {
  return null;
}

export function useUser(): User | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function signIn(user: User) {
  current = user;
  loaded = true;
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
  notify();
}

export function signOut() {
  current = null;
  loaded = true;
  try {
    localStorage.removeItem(USER_KEY);
  } catch {}
  notify();
}

export function saveScore(entry: Omit<SavedScore, "at">) {
  try {
    const all = JSON.parse(localStorage.getItem(SCORES_KEY) || "[]") as SavedScore[];
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(SCORES_KEY, JSON.stringify(all));
  } catch {}
}

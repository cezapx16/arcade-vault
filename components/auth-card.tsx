"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signIn } from "@/lib/session";

export type Mode = "login" | "register";

// Sesión de prueba: no hay validación real, cualquier envío inicia sesión.
export function AuthCard({ initialMode = "login" }: { initialMode?: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [username, setUsername] = useState("");

  const enter = (name: string) => {
    signIn({ name });
    router.push("/");
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    enter(username.trim().toUpperCase());
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="mark"></div>
        <h2 className="neon-cyan">ACCESO AL VAULT</h2>
      </div>

      <div className="auth-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          className={mode === "login" ? "on" : ""}
          onClick={() => setMode("login")}
        >
          ENTRAR
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "register"}
          className={mode === "register" ? "on" : ""}
          onClick={() => setMode("register")}
        >
          REGISTRO
        </button>
      </div>

      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="auth-user">Usuario</label>
          <input
            id="auth-user"
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        {mode === "register" && (
          <div className="field">
            <label htmlFor="auth-email">Email</label>
            <input id="auth-email" type="email" required autoComplete="email" />
          </div>
        )}
        <div className="field">
          <label htmlFor="auth-pass">Contraseña</label>
          <input
            id="auth-pass"
            type="password"
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>
        {mode === "register" && (
          <div className="field">
            <label htmlFor="auth-pass2">Confirmar contraseña</label>
            <input id="auth-pass2" type="password" required autoComplete="new-password" />
          </div>
        )}
        <button type="submit" className="btn lg mt-2 w-full">
          {mode === "login" ? "ENTRAR" : "CREAR CUENTA"}
        </button>
      </form>

      <div className="auth-divider">O CONTINÚA CON</div>
      <div className="social">
        <button type="button" className="btn ghost" onClick={() => enter("JUGADOR_1")}>GOOGLE</button>
        <button type="button" className="btn ghost" onClick={() => enter("JUGADOR_1")}>GITHUB</button>
      </div>
    </div>
  );
}

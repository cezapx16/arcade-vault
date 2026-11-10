"use client";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { signIn, signUp, type AuthState } from "@/app/actions/auth";
import { refreshUser } from "@/lib/session";
export type Mode = "login" | "register";
const IDLE: AuthState = { status: "idle" };
// Cada pestaña es un formulario con su propio useActionState: al cambiar de pestaña
// se desmonta y su error o la pantalla "REVISA TU CORREO" desaparecen.
export function AuthCard({
  initialMode = "login",
  initialError,
}: {
  initialMode?: Mode;
  initialError?: string;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
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
      {mode === "login" ? (
        <LoginForm initialError={initialError} />
      ) : (
        <RegisterForm onDone={() => setMode("login")} />
      )}
      <div className="auth-divider">O CONTINÚA CON</div>
      <div className="social">
        <button type="button" className="btn ghost" disabled>
          GOOGLE <span className="soon">PRÓXIMAMENTE</span>
        </button>
        <button type="button" className="btn ghost" disabled>
          GITHUB <span className="soon">PRÓXIMAMENTE</span>
        </button>
      </div>
    </div>
  );
}
function AuthError({ message }: { message: string }) {
  return (
    <p className="auth-error" role="alert">
      {message}
    </p>
  );
}
function LoginForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(signIn, IDLE);
  // Las cookies las puso el servidor: se relee la sesión antes de salir de /login.
  useEffect(() => {
    if (state.status !== "ok") return;
    void refreshUser().then(() => router.replace("/"));
  }, [state, router]);
  const error =
    state.status === "error"
      ? state.message
      : state.status === "idle"
        ? initialError
        : undefined;
  return (
    <form action={action} noValidate>
      {error && <AuthError message={error} />}
      <div className="field">
        <label htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>
      <div className="field">
        <label htmlFor="auth-pass">Contraseña</label>
        <input
          id="auth-pass"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <button
        type="submit"
        className="btn lg mt-2 w-full"
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? "PROCESANDO…" : "ENTRAR"}
      </button>
    </form>
  );
}
function RegisterForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(signUp, IDLE);
  // Controlados para que no se vacíen al volver con un error (React reinicia el form).
  const [alias, setAlias] = useState("");
  const [email, setEmail] = useState("");
  if (state.status === "check-email") {
    return (
      <div className="auth-sent" role="status">
        <h3 className="neon-cyan">REVISA TU CORREO</h3>
        <p>
          Si ese email no tenía cuenta, te hemos enviado un enlace de
          confirmación a<strong>{state.email}</strong>
          Ábrelo para activar tu cuenta y vuelve para entrar.
        </p>
        <button type="button" className="btn lg w-full" onClick={onDone}>
          IR A ENTRAR
        </button>
      </div>
    );
  }
  return (
    <form action={action} noValidate>
      {state.status === "error" && <AuthError message={state.message} />}
      <div className="field">
        <label htmlFor="auth-alias">Alias</label>
        <input
          id="auth-alias"
          name="alias"
          required
          maxLength={10}
          autoComplete="username"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="auth-pass">Contraseña</label>
        <input
          id="auth-pass"
          name="password"
          type="password"
          required
          autoComplete="new-password"
        />
      </div>
      <div className="field">
        <label htmlFor="auth-pass2">Confirmar contraseña</label>
        <input
          id="auth-pass2"
          name="password2"
          type="password"
          required
          autoComplete="new-password"
        />
      </div>
      <button
        type="submit"
        className="btn lg mt-2 w-full"
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? "PROCESANDO…" : "CREAR CUENTA"}
      </button>
    </form>
  );
}

"use client";

import { useId, useState, type FormEvent } from "react";

type Status = "idle" | "sending" | "sent" | "error";

const EMPTY = { name: "", email: "", msg: "", website: "" };

// Formulario de contacto de /about. Si falta algún campo hace shake y no envía.
export function ContactForm() {
  const id = useId();
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState<Status>("idle");
  const [shake, setShake] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.msg.trim()) {
      setShake(true);
      return;
    }
    setStatus("sent");
  };

  const reset = () => {
    setForm(EMPTY);
    setStatus("idle");
  };

  return (
    <form
      className={"contact-form" + (shake ? " shake" : "")}
      onSubmit={onSubmit}
      onAnimationEnd={(e) => e.target === e.currentTarget && setShake(false)}
      noValidate
    >
      {status !== "sent" ? (
        <>
          <div className="field">
            <label htmlFor={id + "-name"}>NOMBRE</label>
            <input
              id={id + "-name"}
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="px_kai"
            />
          </div>
          <div className="field">
            <label htmlFor={id + "-email"}>CORREO ELECTRÓNICO</label>
            <input
              id={id + "-email"}
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jugador@vault.gg"
            />
          </div>
          <div className="field">
            <label htmlFor={id + "-msg"}>MENSAJE</label>
            <textarea
              id={id + "-msg"}
              name="msg"
              rows={5}
              value={form.msg}
              onChange={(e) => setForm({ ...form, msg: e.target.value })}
              placeholder="Cuéntanos qué tienes en mente…"
            ></textarea>
          </div>
          {/* Honeypot: invisible para personas; si llega relleno, es un bot */}
          <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
            <label htmlFor={id + "-website"}>Web</label>
            <input
              id={id + "-website"}
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </div>
          <button className="btn xl press w-full" type="submit">▶  ENVIAR MENSAJE</button>
        </>
      ) : (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span><span className="dot y"></span><span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line"><span className="prompt">vault@arcade:~$</span> ./send_message --to=team</div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {form.name.trim().toUpperCase()}.
              <span className="caret">_</span>
            </div>
            <div className="mt-[18px]">
              <button className="btn ghost" type="button" onClick={reset}>ENVIAR OTRO MENSAJE</button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

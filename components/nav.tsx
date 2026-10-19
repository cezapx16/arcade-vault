"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut, useUser } from "@/lib/session";

type Section = "inicio" | "biblioteca" | "salon" | "login";

function sectionOf(pathname: string): Section | null {
  if (pathname === "/") return "inicio";
  if (pathname === "/games" || pathname.startsWith("/games/")) return "biblioteca";
  if (pathname === "/salon") return "salon";
  if (pathname === "/login") return "login";
  return null;
}

export function Nav() {
  const pathname = usePathname();
  const user = useUser();
  const [open, setOpen] = useState(false);
  const section = sectionOf(pathname);
  const cls = (name: Section) => (section === name ? "active" : "");
  const close = () => setOpen(false);

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={cls("inicio")}>Inicio</Link>
          <Link href="/games" className={cls("biblioteca")}>Biblioteca</Link>
          <Link href="/salon" className={cls("salon")}>Salón de la Fama</Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <button className="btn ghost auth-btn" onClick={signOut} title="Cerrar sesión">
            {user.name} ▾
          </button>
        ) : (
          <Link href="/login" className="btn auth-btn text-center">Iniciar Sesión</Link>
        )}
        <button className="btn ghost hamburger" onClick={() => setOpen(true)} aria-label="Menú" aria-expanded={open}>
          ≡
        </button>
      </nav>

      <div className={"av-mobile-backdrop" + (open ? " open" : "")} onClick={close}></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")} inert={!open}>
        <div className="pixel neon-cyan mb-4 text-[11px]">MENÚ</div>
        <Link href="/" className={cls("inicio")} onClick={close}>Inicio</Link>
        <Link href="/games" className={cls("biblioteca")} onClick={close}>Biblioteca</Link>
        <Link href="/salon" className={cls("salon")} onClick={close}>Salón de la Fama</Link>
        <Link href="/login" className={cls("login")} onClick={close}>
          {user ? "Cuenta" : "Iniciar Sesión"}
        </Link>
        <div className="flex-1"></div>
        <div className="pixel text-[9px] text-ink-faint tracking-[0.16em]!">CRÉDITOS · 03</div>
      </aside>
    </>
  );
}

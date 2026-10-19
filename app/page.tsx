import type { Metadata } from "next";
import Link from "next/link";
import { GAMES } from "@/app/data/games";
import { FeatureIcon, type FeatureKind } from "@/components/home/feature-icon";
import { FloatingSilhouettes } from "@/components/home/floating-silhouettes";
import { MiniCard } from "@/components/home/mini-card";
import { Reveal } from "@/components/home/reveal";

export const metadata: Metadata = {
  title: "Arcade Vault · Portal Retro",
};

const FEATURES: { i: FeatureKind; t: string; d: string; c: string }[] = [
  { i: "GAMEPAD", t: "JUEGOS CLÁSICOS", d: "Arkanoid, Tetris, Snake y muchos más. Los mejores arcades de todos los tiempos en un solo lugar.", c: "cyan" },
  { i: "FREE", t: "100% GRATIS", d: "Sin suscripciones, sin pagos ocultos. Todos los juegos disponibles de forma gratuita.", c: "yellow" },
  { i: "TROPHY", t: "LADDER BOARDS", d: "Compite con jugadores de todo el mundo. Escala el ranking y demuestra quién es el mejor.", c: "magenta" },
  { i: "ROCKET", t: "SIEMPRE CRECIENDO", d: "Agregamos nuevos juegos constantemente. Vuelve seguido, siempre habrá algo nuevo que jugar.", c: "green" },
];

export default function Home() {
  return (
    <div className="home fade-in">
      {/* HERO */}
      <section className="home-hero">
        <FloatingSilhouettes />
        <div className="home-hero-inner">
          <div className="hero-eyebrow pixel neon-yellow">
            ▸ INSERTA UNA MONEDA<span className="blink">_</span>
          </div>
          <h1 className="home-title">
            <span className="line-1">EL ARCADE</span>
            <span className="line-2">CLÁSICO ESTÁ</span>
            <span className="line-3">DE VUELTA</span>
          </h1>
          <p className="home-sub">
            Juega los mejores clásicos directamente en tu navegador.
            <br />
            Sin descargas. Sin costo. Solo diversión.
          </p>
          <div className="home-ctas">
            <Link href="/games" className="btn xl pulse text-center">▶  EXPLORAR JUEGOS</Link>
            <Link href="/login?tab=registro" className="btn xl magenta text-center">✦  CREAR CUENTA</Link>
          </div>
          <div className="hero-scroll" aria-hidden="true">
            <span>DESLIZA</span>
            <span className="arrow">▼</span>
          </div>
        </div>
      </section>

      {/* WHY */}
      <Reveal className="home-section">
        <div className="section-head">
          <div className="kicker pixel neon-magenta">{"// 01"}</div>
          <h2 className="section-title">¿POR QUÉ ARCADE VAULT?</h2>
          <div className="section-rule"></div>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <div key={f.i} className={"feature-card " + f.c} style={{ transitionDelay: i * 80 + "ms" }}>
              <FeatureIcon kind={f.i} />
              <div className="ft-title pixel">{f.t}</div>
              <div className="ft-desc">{f.d}</div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* GAMES PREVIEW */}
      <Reveal className="home-section">
        <div className="section-head">
          <div className="kicker pixel neon-cyan">{"// 02"}</div>
          <h2 className="section-title">JUEGOS DISPONIBLES AHORA</h2>
          <div className="section-rule"></div>
        </div>
        <div className="mini-rail">
          {GAMES.slice(0, 6).map((g) => (
            <MiniCard key={g.id} game={g} />
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link href="/games" className="btn lg text-center">VER TODOS LOS JUEGOS →</Link>
        </div>
      </Reveal>
    </div>
  );
}

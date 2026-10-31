"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { submitScore, type SubmitScoreResult } from "@/app/actions/scores";
import type { Game } from "@/app/data/games";
import { SKIN_IDS, SKIN_LABELS, type SkinId } from "@/lib/games/skins";
import { useUser } from "@/lib/session";
type GameShellProps = {
  game: Game;
  hud: { score: number; lives: number; level: number };
  paused: boolean;
  over: boolean;
  onTogglePause: () => void;
  onEnd: () => void; // botón FIN
  onRestart: () => void; // botón JUGAR DE NUEVO del modal
  // Skin del canvas y su selector (se guarda por juego). Sin ellos no hay selector (partida simulada).
  skin?: SkinId;
  onSkinChange?: (skin: SkinId) => void;
  controls?: ReactNode; // mando táctil bajo el CRT; sin él el shell es igual que siempre
  children: ReactNode; // contenido de .crt-screen
};
// Capa de presentación compartida por todos los juegos: HUD, CRT, pausa y modal de fin.
// El estado de la partida lo lleva quien la usa; aquí solo vive el nombre y el guardado.
export function GameShell({
  game,
  hud,
  paused,
  over,
  onTogglePause,
  onEnd,
  onRestart,
  skin,
  onSkinChange,
  controls,
  children,
}: GameShellProps) {
  const user = useUser();
  // null = el jugador aún no ha escrito nada: se muestra el usuario o INVITADO.
  const [typedName, setTypedName] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const name = typedName ?? user?.name ?? "INVITADO";
  const { score, lives, level } = hud;
  const restart = () => {
    setSaved(false);
    setSaveError(null);
    onRestart();
  };
  const save = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    let result: SubmitScoreResult;
    try {
      result = await submitScore({ gameId: game.id, name, score });
    } catch {
      // Fallo de red al llamar a la Server Action.
      result = { ok: false, error: "NO SE PUDO GUARDAR" };
    }
    setSaving(false);
    if (result.ok) setSaved(true);
    else setSaveError(result.error);
  };
  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div className="flex flex-wrap gap-6">
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v text-ink!">{name}</div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button
            className="btn yellow"
            onClick={onTogglePause}
            disabled={over}
          >
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={onEnd}>
            FIN
          </button>
          <Link href={`/games/${game.id}`} className="btn ghost text-center">
            SALIR
          </Link>
        </div>
      </div>
      {skin && onSkinChange && (
        <div className="skin-bar" role="group" aria-labelledby="skin-bar-label">
          <span id="skin-bar-label" className="skin-bar-label">
            Skin
          </span>
          {SKIN_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className="skin-btn"
              aria-pressed={skin === id}
              onClick={(e) => {
                onSkinChange(id);
                // Sin foco en el botón: Espacio y las flechas siguen llegando al juego.
                e.currentTarget.blur();
              }}
            >
              {SKIN_LABELS[id]}
            </button>
          ))}
        </div>
      )}
      <div className="crt">
        <div className="crt-screen">
          {children}
          {paused && (
            <div className="crt-content z-5 bg-black/60">
              <div>
                <div className="pixel neon-yellow text-[22px]">EN PAUSA</div>
                <div className="mono mt-2.5 text-[11px] tracking-[0.16em] text-ink-dim">
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
      {controls}
      {over && (
        <div className="modal-bd">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-over-title"
          >
            <h2 id="game-over-title">FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <>
                <div className="input-row">
                  <input
                    disabled={saving}
                    value={name}
                    onChange={(e) =>
                      setTypedName(e.target.value.toUpperCase().slice(0, 10))
                    }
                    placeholder="TUS INICIALES"
                    aria-label="Tus iniciales"
                  />
                  <button
                    className="btn yellow"
                    onClick={save}
                    disabled={saving}
                    aria-busy={saving}
                  >
                    {saving ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
                  </button>
                </div>
                {saveError && (
                  <div className="toast-error" role="alert">
                    ▸ {saveError}
                  </div>
                )}
              </>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/" className="btn magenta text-center">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

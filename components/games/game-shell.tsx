"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { submitScore, type SubmitScoreResult } from "@/app/actions/scores";
import type { Game } from "@/app/data/games";
import { formatHud, type Hud, type HudRefs } from "@/components/games/hud";
import { SKIN_IDS, SKIN_LABELS, type SkinId } from "@/lib/games/skins";
import { useUser } from "@/lib/session";
// Guardado de la puntuación: un solo estado en lugar de saved/saving/saveError.
type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved" }
  | { status: "error"; error: string };
type GameShellProps = {
  game: Game;
  hud: Hud; // valores que pinta React; en los juegos reales, el HUD inicial (constante)
  hudRefs?: HudRefs; // si llegan, el motor escribe ahí PUNTUACIÓN, VIDAS y NIVEL sin pasar por React
  paused: boolean;
  finalScore: number | null; // null = partida en curso; si no, abre el modal con esta puntuación
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
  hudRefs,
  paused,
  finalScore,
  onTogglePause,
  onEnd,
  onRestart,
  skin,
  onSkinChange,
  controls,
  children,
}: GameShellProps) {
  const user = useUser();
  const router = useRouter();
  const hasControls = Boolean(controls);
  // Con mando táctil el player va a pantalla completa: el CSS oculta la barra de navegación.
  // Va en un efecto (no en un :has del CSS) para que se quite al salir aunque la ruta
  // quede montada y oculta (Cache Components conserva las rutas visitadas).
  useEffect(() => {
    if (!hasControls) return;
    const root = document.documentElement;
    root.dataset.touchPlayer = "";
    return () => {
      delete root.dataset.touchPlayer;
    };
  }, [hasControls]);
  // null = el jugador aún no ha escrito nada: se muestra el usuario o INVITADO.
  const [typedName, setTypedName] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>({ status: "idle" });
  const saving = save.status === "saving";
  const name = typedName ?? user?.name ?? "INVITADO";
  const { score, lives, level } = hud;
  const restart = () => {
    setSave({ status: "idle" });
    onRestart();
  };
  const saveScore = async () => {
    if (saving || finalScore === null) return;
    setSave({ status: "saving" });
    let result: SubmitScoreResult;
    try {
      result = await submitScore({ gameId: game.id, name, score: finalScore });
    } catch {
      // Fallo de red al llamar a la Server Action.
      result = { ok: false, error: "NO SE PUDO GUARDAR" };
    }
    setSave(
      result.ok
        ? { status: "saved" }
        : { status: "error", error: result.error },
    );
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
            <div className="v" ref={hudRefs?.score}>
              {formatHud.score(score)}
            </div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v" ref={hudRefs?.lives}>
              {formatHud.lives(lives)}
            </div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v" ref={hudRefs?.level}>
              {formatHud.level(level)}
            </div>
          </div>
        </div>
        <div className="hud-actions">
          <button
            className="btn yellow"
            onClick={onTogglePause}
            disabled={finalScore !== null}
          >
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={onEnd}>
            FIN
          </button>
          <Link href={`/games/${game.id}`} className="btn ghost text-center">
            SALIR
          </Link>
          {/* Con mando táctil la barra de navegación se oculta: REGRESAR la sustituye. */}
          {controls && (
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                if (window.history.length > 1) router.back();
                else router.push("/games");
              }}
            >
              REGRESAR
            </button>
          )}
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
      {finalScore !== null && (
        <div className="modal-bd">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-over-title"
          >
            <h2 id="game-over-title">FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{formatHud.score(finalScore)}</div>
            {save.status !== "saved" ? (
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
                    onClick={saveScore}
                    disabled={saving}
                    aria-busy={saving}
                  >
                    {saving ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
                  </button>
                </div>
                {save.status === "error" && (
                  <div className="toast-error" role="alert">
                    ▸ {save.error}
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

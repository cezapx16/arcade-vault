import Link from "next/link";

export default function NotFound() {
  return (
    <div className="fade-in flex flex-col items-center px-4 py-24 text-center">
      <div className="pixel neon-magenta flicker text-[clamp(28px,7vw,56px)]">GAME OVER</div>
      <div className="pixel mt-6 text-[12px] text-ink-dim">
        JUEGO NO ENCONTRADO <span className="animate-[blink_1.2s_steps(1,end)_infinite]">_</span>
      </div>
      <p className="mt-4 max-w-md font-mono text-[13px] text-ink-faint">
        Este cartucho no existe en el Vault. Vuelve a la biblioteca y elige otro.
      </p>
      <Link href="/" className="btn lg mt-10 text-center">
        VOLVER A LA BIBLIOTECA
      </Link>
    </div>
  );
}

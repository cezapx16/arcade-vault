export function ScreenLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="pixel neon-cyan text-[12px]">
        CARGANDO <span className="animate-[blink_1.2s_steps(1,end)_infinite]">_</span>
      </div>
    </div>
  );
}

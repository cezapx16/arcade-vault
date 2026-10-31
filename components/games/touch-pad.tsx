"use client";
import { useEffect, useState } from "react";
import {
  DIR_LABELS,
  REPEAT_DELAY,
  REPEAT_INTERVAL,
  type GameAction,
  type TouchLayout,
} from "@/lib/games/input";
type Emit = (action: GameAction, pressed: boolean) => void;
type Held = { pointerId: number; el: HTMLElement; timer: number | null };
// Estado del mando fuera de React: qué botón tiene qué dedo y sus autorrepeticiones.
// El aspecto pulsado se marca en el propio botón (data-pressed) para no renderizar en cada toque.
function createPadController() {
  const held = new Map<GameAction, Held>();
  let emit: Emit = () => {};
  const clearTimer = (h: Held) => {
    if (h.timer === null) return;
    window.clearTimeout(h.timer);
    window.clearInterval(h.timer);
    h.timer = null;
  };
  const release = (action: GameAction, pointerId?: number) => {
    const h = held.get(action);
    if (!h || (pointerId !== undefined && h.pointerId !== pointerId)) return;
    held.delete(action);
    clearTimer(h);
    h.el.dataset.pressed = "false";
    emit(action, false);
  };
  return {
    setEmit(fn: Emit) {
      emit = fn;
    },
    press(
      action: GameAction,
      pointerId: number,
      el: HTMLElement,
      repeat: boolean,
    ) {
      if (held.has(action)) return; // un dedo por botón
      const h: Held = { pointerId, el, timer: null };
      held.set(action, h);
      el.dataset.pressed = "true";
      emit(action, true);
      if (!repeat) return;
      h.timer = window.setTimeout(() => {
        h.timer = window.setInterval(() => emit(action, true), REPEAT_INTERVAL);
      }, REPEAT_DELAY);
    },
    release,
    releaseAll() {
      for (const action of [...held.keys()]) release(action);
    },
  };
}
// Mando virtual: cruceta a la izquierda y botones de acción a la derecha.
// Cada botón sigue su propio puntero, así que varios dedos a la vez funcionan.
export function TouchPad({
  layout,
  onInput,
  disabled,
}: {
  layout: TouchLayout;
  onInput: Emit;
  disabled: boolean; // pausa o fin de partida: suelta todo e ignora toques
}) {
  const [pad] = useState(createPadController);
  useEffect(() => {
    pad.setEmit(onInput);
  }, [pad, onInput]);
  useEffect(() => {
    if (disabled) pad.releaseAll();
  }, [pad, disabled]);
  useEffect(() => () => pad.releaseAll(), [pad]);
  const handlers = (action: GameAction) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      // Sin foco ni eventos de ratón emulados: el toque solo llega al juego.
      e.preventDefault();
      if (disabled) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      pad.press(
        action,
        e.pointerId,
        e.currentTarget,
        layout.repeat?.includes(action) ?? false,
      );
    },
    onPointerUp: (e: React.PointerEvent) => pad.release(action, e.pointerId),
    onPointerCancel: (e: React.PointerEvent) =>
      pad.release(action, e.pointerId),
    onLostPointerCapture: (e: React.PointerEvent) =>
      pad.release(action, e.pointerId),
  });
  return (
    <div
      className="touch-pad"
      data-disabled={disabled}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="touch-dpad" role="group" aria-label="Cruceta">
        <span className="touch-hub" aria-hidden="true" />
        {layout.dpad.map((dir) => (
          <button
            key={dir}
            type="button"
            tabIndex={-1}
            className="touch-btn"
            data-dir={dir}
            data-pressed="false"
            aria-label={DIR_LABELS[dir]}
            {...handlers(dir)}
          />
        ))}
      </div>
      {layout.buttons.length > 0 && (
        <div className="touch-actions" role="group" aria-label="Acciones">
          {layout.buttons.map(({ action, label }) => (
            <div key={action} className="touch-action">
              <button
                type="button"
                tabIndex={-1}
                className="touch-btn action"
                data-action={action}
                data-pressed="false"
                aria-label={label.charAt(0) + label.slice(1).toLowerCase()}
                {...handlers(action)}
              />
              <span className="touch-label" aria-hidden="true">
                {label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

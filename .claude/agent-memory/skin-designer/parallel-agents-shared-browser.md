---
name: parallel-agents-shared-browser
description: Con varios skin-designer en paralelo, el navegador Playwright, el localStorage y el dev server en :3000 son compartidos
metadata:
  type: project
---

Cuando se lanzan varios skin-designer en paralelo (uno por juego) comparten el mismo navegador Playwright (la misma pestaña), el mismo `localStorage` y el `npm run dev` del puerto 3000.

**Why:** el 2026-10-30, revisando bloque-buster, el skin cambió solo (evento `storage` de otra pestaña) y la página saltó a /games/serpentina/play porque el otro agente la estaba usando.

**How to apply:** en ejecuciones paralelas, reutiliza el dev server existente (no lo arranques ni lo pares), no cierres el navegador, haz las comprobaciones de Playwright en una sola evaluación seguida y no interpretes un cambio de skin inesperado como bug sin descartar la otra pestaña. Evita `npm run build` mientras el otro agente use el dev server (comparten `.next`); usa `npx tsc --noEmit` + eslint por rutas.

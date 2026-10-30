# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault is an online platform for playing arcade games and competing for the highest score. The README, specs, UI copy and code comments are in Spanish — answer the user in Spanish.

Current state (specs 01–09): visual MVP (home, library, game detail, player, Hall of Fame, login, about), contact form via Resend, Supabase integration, real leaderboards backed by Supabase, and four real canvas games. The rest of the catalog still uses the simulated player.

| Game id         | Title         | Engine                 | Component                             |
| --------------- | ------------- | ---------------------- | ------------------------------------- |
| `rocas`         | ROCAS         | `lib/games/asteroids/` | `components/games/asteroids-game.tsx` |
| `caida`         | CAÍDA         | `lib/games/tetris/`    | `components/games/tetris-game.tsx`    |
| `bloque-buster` | BLOQUE BUSTER | `lib/games/arkanoid/`  | `components/games/arkanoid-game.tsx`  |
| `serpentina`    | SERPENTINA    | `lib/games/snake/`     | `components/games/snake-game.tsx`     |

## Workflow: Spec Driven Design

- Write a spec before implementing any feature. Specs live in `specs/NN-slug.md` (template in `.claude/skills/spec/template.md`); each carries an **Estado** (Draft → Aprobado → Implementado).
- Skills (in `.claude/skills/`, also mirrored in `.agents/skills/`; `spec`/`spec-impl` come from https://github.com/Klerith/fernando-skills, tracked in `skills-lock.json`):
  - `/spec` — design a spec through questions and write it to `specs/`.
  - `/spec-impl` — implement an approved spec step by step. It creates the branch `spec-NN-slug` automatically (`specs/.spec-config.yml` → `AutoCreateBranch: true`). One commit per step (`spec NN paso X: …`), then ask before continuing.
  - `/add-game` — project skill: writes the spec to port or add a playable game (from `references/started-games/` or a description). Its `integracion.md` is the contract every game must follow — read it before touching games.
  - `/frontend-design` — always use it to design UI (pages, components, and canvas palettes/glow).
- Subagents (in `.claude/agents/`):
  - `game-planner` — plans and decides which game fits the platform next (catalog in Supabase + code, `integracion.md` contract, category/color balance), proposes 3–5 candidates and recommends one to take to `/add-game`. It writes no code or specs. It keeps its own project memory (`memory: project`) of what it has suggested and its status (`sugerido`/`elegido`/`descartado`/`implementado`), and maintains `references/game-suggestions-todo.md` with games other people suggest plus its own candidates (`sugerido por: game-planner`). Use it when the user asks what game to add or relays someone's game suggestion (pass the full suggestion and who made it in the prompt).
  - `game-jam` — given a theme, designs one original canvas game and writes at least two complete Draft specs (same shape as specs 07–09) plus a `README.md` with open questions in `specs/game-jam/<game-id>/`. It works autonomously (decides with `/add-game`'s recommendations, chooses replace-simulated vs. new game), writes no code, keeps project memory of themes/games it generated, and adds each game to `references/game-suggestions-todo.md` (`sugerido por: game-jam`). Approved jam specs are moved to `specs/NN-…` before `/spec-impl`.
- Merge to `main` via PR per spec.

## Commands

- `npm run dev` — dev server (Turbopack)
- `npm run build` — production build; also the type-check (`tsconfig` has `noEmit`)
- `npm run lint` — ESLint 9 flat config (`eslint-config-next` core-web-vitals + typescript)

No test runner is configured. Verify UI changes in the browser (Playwright MCP is available).

A `PostToolUse` hook (`.claude/hooks/format-and-lint.mjs`) runs after every Write/Edit: strips blank lines from CSS, runs Prettier, and `eslint --fix` on JS/TS. Lint errors are reported back (exit 2) and must be fixed. Expect files to be reformatted after editing (no blank lines inside code).

## Stack and non-default configuration

- Next.js 16.4 (App Router, `app/` directory) with React 19.3 and TypeScript strict mode. Next.js APIs here differ from older versions — check `node_modules/next/dist/docs/` (`01-app/`, `03-architecture/`) before using an API.
- `next.config.ts` enables `cacheComponents`, `partialPrefetching`, `experimental.agentFeedback`, and disables `turbopackFileSystemCacheForDev` (the repo lives in OneDrive, which corrupts Turbopack's persistent cache). It also redirects the old Spanish routes `/juegos/:id[/jugar]` → `/games/:id[/play]`.
- With Cache Components on, data loading uses `"use cache"` + `cacheTag`/`cacheLife` and Suspense, not the old `fetch` cache options.
- Middleware is `proxy.ts` (Next 16 name), which refreshes the Supabase Auth session via `lib/supabase/proxy.ts`; it does not protect routes.
- Tailwind CSS v4 is loaded through a Turbopack loader rule (`@tailwindcss/turbopack` on `*.css`), not PostCSS. There is no `tailwind.config` or `postcss.config`; theme tokens live in `app/globals.css` under `@theme inline`.
- Layouts and pages use the global typed props helpers (e.g. `LayoutProps<"/">`, `PageProps<...>`) generated by Next into `.next/types`.
- Import alias `@/*` maps to the project root.

## Architecture

### Routes (`app/`)

- `/` home, `/games` library, `/games/[id]` detail + TOP 10, `/games/[id]/play` simulated player, `/salon` Hall of Fame, `/login`, `/about` (contact form).
- Real games have a static route `app/games/<id>/play/page.tsx` that takes precedence over `[id]/play` — never modify the dynamic one for a real game.
- `app/api/contact/route.ts` — POST, sends the contact email with Resend. `app/api/health/route.ts` — GET, checks Supabase DB + Auth (`500 SERVICIO NO CONFIGURADO` without env vars).
- `app/actions/scores.ts` — `submitScore` Server Action: validates (id `^[a-z0-9-]{1,32}$`, name 1–10 chars uppercased, integer score 0–9 999 999), inserts as `anon`, then `updateTag("scores-<id>")` and `updateTag("game-stats")`.

### Data

- `app/data/games.ts` — `Game` types and the `GAMES` catalog, used as fallback when Supabase is unavailable and as the seed source. `app/data/home.ts` — home content.
- `lib/data/games.ts` (`getGames`, `getGame`; tags `games`, `game-stats`) and `lib/data/scores.ts` (`getLeaderboard`; tag `scores-<id>`, `null` = ranking unavailable) — cached reads. `lib/data/format.ts` — formatters.
- The app degrades gracefully without Supabase: catalog falls back to `GAMES` with stats at 0, leaderboards show "NO DISPONIBLE".
- `lib/session.ts` — the player's "session" is local only (`localStorage` key `av_user`, exposed with `useSyncExternalStore`); Supabase Auth is not used yet.

### Supabase

- Project `kzkpuodqsexbszdlehap`, reached through the Supabase MCP (`.mcp.json`).
- Clients: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (SSR, `await createClient()`), `lib/supabase/public.ts` (no cookies, `cache: "no-store"` fetch — use it inside `"use cache"` and in anon Server Actions; returns `null` if env is missing). Env read in `lib/supabase/env.ts`.
- Schema: tables `games` and `scores` with RLS, view `game_stats` (best/plays), functions `leaderboard()` and `player_best()`, plus `health_check`.
- Migrations: SQL files `supabase/migrations/AAAAMMDDHHMMSS_name.sql`, committed, applied with MCP `apply_migration` (same name), checked with `list_migrations`, then review `get_advisors`. After any schema change regenerate `lib/supabase/database.types.ts` with `generate_typescript_types`.
- Env vars (`.env.example` → `.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`. Never put a `service_role`/`sb_secret_` key in `NEXT_PUBLIC_*`.

### Games (full contract in `.claude/skills/add-game/integracion.md`)

- Engine `lib/games/<engine>/` — plain TypeScript, no React: `constants.ts` (resolution, rules, `PALETTE`, `GLOW`), `entities.ts`, `engine.ts` exporting `create<Engine>Game(canvas, callbacks)` → `{ pause, resume, restart, end, destroy }`. Fixed 4:3 logical resolution (800×600) with HiDPI scaling, clamped `dt`, listeners on `window` removed in `destroy`, callbacks (`onScore`/`onLives`/`onLevel`/`onGameOver`) only on change, no HUD/pause/game-over drawn on canvas, `preventDefault` never while focus is in an input.
- Component `components/games/<engine>-game.tsx` — uses the shared `useCanvasGame` hook (`components/games/use-canvas-game.tsx`: engine lifecycle, pause via button/`P`/`Escape`/tab hidden, "REQUIERE TECLADO" on touch devices) and renders `<GameShell>` (`components/games/game-shell.tsx`: CRT, HUD, pause overlay, game-over modal, score saving through `submitScore`).
- A game that is in the `games` table and uses `GameShell` gets the TOP 10, Hall of Fame tab and stats for free — never create per-game ranking tables, actions or components.
- Canvas colors are hex copies of the `app/globals.css` tokens (the canvas cannot read CSS variables), with glow via `shadowBlur`. Port with original colors first, apply the neon palette in a later step.
- Game assets go in `public/games/<id>/`; the engine loads them before starting the loop.

### References (read-only)

- `references/templates/` — original JSX/HTML design prototypes the screens were built from.
- `references/started-games/` — original vanilla-JS games to port; `references/source-assets/` — raw assets (e.g. Snake fruit sprites).
- Exceptions (living docs, editable): `references/implemented-games.md` — catalog snapshot from the `games` table (real vs. simulated); `references/game-suggestions-todo.md` — TODO of people's game suggestions, maintained by `game-planner`.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault is an online platform for playing arcade games and competing for the highest score. The README, specs, UI copy and code comments are in Spanish — answer the user in Spanish.

Current state (specs 01–15): visual MVP (home, library, game detail, player, Hall of Fame, login, about), contact form via Resend, Supabase integration, real leaderboards backed by Supabase, real accounts with Supabase Auth (email + password, email confirmation, unique arcade alias; spec 15), and five real canvas games playable with keyboard or on touch devices (virtual pad), each with 4 skins, canvas performance limits (spec 13) and zero React commits during play (spec 14). The rest of the catalog still uses the simulated player. Spec 11 (touch pad styled as the Gamepad MK-II, assets in `references/gamepad-assets/`) is not reflected in the code yet (`touch-pad.tsx` keeps the spec 10 look).

| Game id         | Title         | Engine                 | Component                             |
| --------------- | ------------- | ---------------------- | ------------------------------------- |
| `rocas`         | ROCAS         | `lib/games/asteroids/` | `components/games/asteroids-game.tsx` |
| `caida`         | CAÍDA         | `lib/games/tetris/`    | `components/games/tetris-game.tsx`    |
| `bloque-buster` | BLOQUE BUSTER | `lib/games/arkanoid/`  | `components/games/arkanoid-game.tsx`  |
| `serpentina`    | SERPENTINA    | `lib/games/snake/`     | `components/games/snake-game.tsx`     |
| `vaiven`        | VAIVÉN        | `lib/games/hopper/`    | `components/games/hopper-game.tsx`    |

## Workflow: Spec Driven Design

- Write a spec before implementing any feature. Specs live in `specs/NN-slug.md` (template in `.claude/skills/spec/template.md`); each carries an **Estado** (Draft → Aprobado → Implementado). Supporting material goes in a folder next to the spec (e.g. `specs/13-rendimiento-vaiven/` before/after captures); `specs/game-jam/<game-id>/` holds Draft specs from `game-jam` (moved to `specs/NN-…` once approved) and `specs/perf/<id>/` holds `game-performance-booster` measurements.
- Skills (`.claude/skills/<name>/SKILL.md`; all user-invoked only, `disable-model-invocation: true`. `spec`/`spec-impl` come from https://github.com/Klerith/fernando-skills, tracked in `skills-lock.json` and mirrored in `.agents/skills/`):
  - `/spec` — design a spec through questions and write it to `specs/`.
  - `/spec-impl` — implement an approved spec step by step on branch `spec-NN-slug` (auto-created, `specs/.spec-config.yml`), one commit per step (`spec NN paso X: …`), asking before continuing.
  - `/spec-impl-game` — `/spec-impl` for a game spec, then runs `skin-designer` and then `mobile-porter` (sequentially, stops if the first fails).
  - `/add-game` — writes the spec to port or add a playable game (from `references/started-games/` or a description). Its `integracion.md` is the contract every game must follow — read it before touching games.
  - `/frontend-design` (global skill, not in the repo) — always use it to design UI (pages, components, and canvas palettes/glow).
- Subagents (`.claude/agents/<name>.md` has the full definition; each keeps project memory in `.claude/agent-memory/<name>/`):
  - `game-planner` — recommends the next game to add and keeps `references/game-suggestions-todo.md` (also for relaying people's suggestions). No code.
  - `game-jam` — from a theme, designs an original game as Draft specs in `specs/game-jam/<game-id>/`. No code.
  - `skin-designer` — makes every real game have the 4 skins (`clasico`, `neon`, `retro`, `pastel`) readable on dark; status in `references/game-with-themes.md`.
  - `mobile-porter` — ports new real games to touch/mobile per spec 10, verified with Playwright; status in `references/mobile-status.md`.
  - `game-performance-booster` — audits and fixes a game's performance per specs 13–14, measuring before/after; status in `references/performance-status.md`.
  - `security-auditor` — read-only security audit of the Supabase database (advisors, RLS, policies, grants, `security definer`, migration drift, logs) and the app (secrets, headers, Server Actions, routes, dependencies); modes `completa`/`db`/`app`; proposes fixes as specs; status in `references/security/security-status.md`.
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
- Security headers (spec 16): `next.config.ts` sends `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` and `Permissions-Policy: camera=(), microphone=(), geolocation=()` on every route (`headers()` with `source: "/(.*)"`) and sets `poweredByHeader: false`. No CSP or HSTS yet (README → Seguridad).
- Middleware is `proxy.ts` (Next 16 name), which refreshes the Supabase Auth session via `lib/supabase/proxy.ts`; it does not protect routes.
- Tailwind CSS v4 is loaded through a Turbopack loader rule (`@tailwindcss/turbopack` on `*.css`), not PostCSS. There is no `tailwind.config` or `postcss.config`; theme tokens live in `app/globals.css` under `@theme inline`.
- Layouts and pages use the global typed props helpers (e.g. `LayoutProps<"/">`, `PageProps<...>`) generated by Next into `.next/types`.
- Import alias `@/*` maps to the project root.

## Architecture

### Routes (`app/`)

- `/` home, `/games` library, `/games/[id]` detail + TOP 10, `/games/[id]/play` simulated player, `/salon` Hall of Fame, `/login`, `/about` (contact form).
- Real games have a static route `app/games/<id>/play/page.tsx` (`rocas`, `caida`, `bloque-buster`, `serpentina`, `vaiven`) that takes precedence over `[id]/play` — never modify the dynamic one for a real game.
- `app/api/contact/route.ts` — POST, sends the contact email with Resend. `app/api/health/route.ts` — GET, checks Supabase DB + Auth (`500 SERVICIO NO CONFIGURADO` without env vars).
- `app/actions/scores.ts` — `submitScore` Server Action: validates (id `^[a-z0-9-]{1,32}$`, name 1–10 chars uppercased, integer score 0–9 999 999), inserts as `anon`, then `updateTag("scores-<id>")` and `updateTag("game-stats")`.
- `app/actions/auth.ts` — `signUp`, `signIn`, `signOut` Server Actions (SSR client) used by `AuthCard` through `useActionState`; return `AuthState` (`idle` / `error` + Spanish message / `ok` + alias / `check-email` + email). Server-side validation; every Supabase error is mapped to a Spanish message (never show Supabase's English text). `signUp` checks `alias_available` first and passes the alias in `options.data.name` with `emailRedirectTo` = `${SITE_URL}/auth/confirm` (`getSiteUrl()` in `lib/site-url.ts`: server-only env, `http://localhost:3000` in development, `null` in production without it → "SERVICIO NO DISPONIBLE"; never built from request headers, spec 17). Anti-enumeration (spec 17): an already registered email returns `check-email` like a new one.
- `app/auth/confirm/route.ts` — GET, redeems the email link (`token_hash` + `type` → `verifyOtp`; only `type=email` is accepted, `ALLOWED_TYPES`), redirects to `/` or `/login?error=enlace`. Needs the manual dashboard setup documented in `README.md` → Autenticación (email template with `{{ .RedirectTo }}?token_hash=…&type=email`, Redirect URLs).
- `/login` checks `getClaims()` inside its `<Suspense>` (cookies + Cache Components) and redirects to `/` when signed in.

### Data

- `app/data/games.ts` — `Game` types and the `GAMES` catalog, used as fallback when Supabase is unavailable and as the seed source. `app/data/home.ts` — home content.
- `lib/data/games.ts` (`getGames`, `getGame`; tags `games`, `game-stats`) and `lib/data/scores.ts` (`getLeaderboard`; tag `scores-<id>`, `null` = ranking unavailable) — cached reads. `lib/data/format.ts` — formatters.
- The app degrades gracefully without Supabase: catalog falls back to `GAMES` with stats at 0, leaderboards show "NO DISPONIBLE".
- `lib/session.ts` — the player's session comes from Supabase Auth (browser client `getSession()` + alias from `profiles`, `JUGADOR` if there is no profile; `null` without Supabase env), exposed as `useUser(): { name } | null` with `useSyncExternalStore`. Call `refreshUser()` after the `signIn`/`signOut` actions: the server sets the cookies and the client's `onAuthStateChange` doesn't notice. It removes the old local-session key `av_user` on load. Routes are not protected and scores are not tied to the account (guests can still play and save).

### Supabase

- Project `kzkpuodqsexbszdlehap`, reached through the Supabase MCP (`.mcp.json`).
- Clients: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (SSR, `await createClient()`), `lib/supabase/public.ts` (no cookies, `cache: "no-store"` fetch — use it inside `"use cache"` and in anon Server Actions; returns `null` if env is missing). Env read in `lib/supabase/env.ts`.
- Schema: tables `games` and `scores` with RLS, view `game_stats` (best/plays), functions `leaderboard()` and `player_best()`, plus `health_check`. Auth: table `profiles` (`id` → `auth.users`, unique `name` `^[A-Z0-9_]{1,10}$`, public read, no client writes) filled by trigger `on_auth_user_created` → `handle_new_user()` (security definer, execute revoked) from `raw_user_meta_data->>'name'`, and `alias_available(p_name)` (security invoker, callable by anon).
- Migrations: SQL files `supabase/migrations/AAAAMMDDHHMMSS_name.sql`, committed, applied with MCP `apply_migration` (same name), checked with `list_migrations`, then review `get_advisors`. After any schema change regenerate `lib/supabase/database.types.ts` with `generate_typescript_types`.
- Env vars (`.env.example` → `.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`, `SITE_URL` (server-only, origin for the confirmation email link). Never put a `service_role`/`sb_secret_` key in `NEXT_PUBLIC_*`.

### Games (full contract in `.claude/skills/add-game/integracion.md`)

- Engine `lib/games/<engine>/` — plain TypeScript, no React: `constants.ts` (resolution, rules, `PALETTE`, `GLOW`, `SKINS`), `entities.ts`, `engine.ts` exporting `create<Engine>Game(canvas, callbacks)` → `{ pause, resume, restart, end, destroy, setSkin, input }`. Fixed 4:3 logical resolution (800×600) with HiDPI scaling through `pixelRatio()` (`lib/games/dpr.ts`, dpr capped at 2), clamped `dt`, listeners on `window` removed in `destroy`, callbacks (`onScore`/`onLives`/`onLevel`/`onGameOver`) only on change, no HUD/pause/game-over drawn on canvas, `preventDefault` never while focus is in an input.
- Component `components/games/<engine>-game.tsx` — uses the shared `useCanvasGame` hook (`components/games/use-canvas-game.tsx`: engine lifecycle, pause via button/`P`/`Escape`/tab hidden, `touch` = `(pointer: coarse)`, `input` forwarding to the engine, skin) and renders `<GameShell>` (`components/games/game-shell.tsx`: CRT, HUD, skin selector, pause overlay, game-over modal, score saving through `submitScore`, optional `controls` slot under the CRT).
- Re-renders (spec 14): no React commits during play. The HUD is written through `hudRefs` (`components/games/hud.ts`: `Hud`, `HudRefs`, `formatHud`), `useCanvasGame` only sets state on game over (`finalScore`), and callbacks passed to the engine/`TouchPad` are stable.
- Canvas performance (spec 13): no `shadowBlur`, gradients or canvas creation per frame for static or repeated elements; cache the static board off-screen and bake glow into sprites rebuilt in `setSkin` (reference: `lib/games/hopper/render-cache.ts`); no new arrays/objects per frame.
- Touch controls (spec 10): every engine exposes `input(action, pressed)` with `GameAction` from `lib/games/input.ts` (`up/down/left/right/a/b`), mapped to its key codes through the same internal function as the keyboard. Each component declares a `TouchLayout` and passes `controls={touch && <TouchPad … />}` (`components/games/touch-pad.tsx`: virtual d-pad + A/B buttons, Pointer Events, auto-repeat). Keyboard always keeps working.
- A game that is in the `games` table and uses `GameShell` gets the TOP 10, Hall of Fame tab and stats for free — never create per-game ranking tables, actions or components.
- Canvas colors are hex copies of the `app/globals.css` tokens (the canvas cannot read CSS variables). Port with original colors first, apply the neon palette in a later step.
- Skins (contract in `integracion.md` → Skins, maintained by `skin-designer`): shared types and color helpers in `lib/games/skins.ts` (`SkinId`, `SKIN_IDS`, `DEFAULT_SKIN` = `clasico`); each engine has `SKINS: Record<SkinId, { palette, glow }>` in `constants.ts` and `setSkin(id)` switches live without restarting; chosen in `GameShell` and stored by `useSkin` (`lib/skin.ts`) in `localStorage` `av_skin_<id>`.
- Game assets go in `public/games/<id>/`; the engine loads them before starting the loop.

### References (read-only)

- `references/templates/` — original JSX/HTML design prototypes the screens were built from.
- `references/started-games/` — original vanilla-JS games to port; `references/02-asteroids/`, `03-tetris/`, `04-arkanoid/` — port material; `references/source-assets/` — raw assets (e.g. Snake fruit sprites); `references/gamepad-assets/` — Gamepad MK-II art for spec 11.
- Exceptions (living docs, editable): `references/implemented-games.md` — catalog snapshot from the `games` table (real vs. simulated); `references/game-suggestions-todo.md` (`game-planner`/`game-jam`); `references/game-with-themes.md` (`skin-designer`); `references/mobile-status.md` (`mobile-porter`) and `references/performance-status.md` (`game-performance-booster`) — the last two don't exist yet, the agent creates them on its first run. `references/security/security-checklist.md` — security checklist status (spec 16); `references/security/security-status.md` (`security-auditor`, created on its first run).

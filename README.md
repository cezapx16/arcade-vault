## Arcade Vault

Es una plataforma para jugar online y competir por la mayor cantidad de puntos.

## Usa Spec Driven Design

Basado en /spec y /spec-impl

Siguiendo las buenas practicas recomendadas aquí:
https://github.com/Klerith/fernando-skills

## Skills usadas

```bash
npx skills@latest add Klerith/fernando-skills
```
## Commands

- `npm run dev` — dev server (Turbopack)
- `npm run build` — production build (also the type-check, since `tsconfig` has `noEmit`)
- `npm run lint` — ESLint 9 flat config (`eslint-config-next` core-web-vitals + typescript)
## Supabase

Supabase es el backend de base de datos y autenticación (proyecto `kzkpuodqsexbszdlehap`). Por ahora solo está la integración base: la app sigue usando `lib/session.ts` y los datos de `app/data/`.

### Variables de entorno

Copia `.env.example` a `.env.local` y rellena:

- `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto (`https://<ref>.supabase.co`).
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — publishable key (`sb_publishable_...`), en _Project Settings → API Keys_.

Nunca pongas la `service_role` ni una `sb_secret_...` en estas variables: las `NEXT_PUBLIC_*` llegan al navegador.

Si faltan, la app funciona igual y solo `GET /api/health` responde `500 SERVICIO NO CONFIGURADO`. Con ellas, `GET /api/health` comprueba la base de datos y Auth.

### Clientes

- `lib/supabase/client.ts` — para componentes `"use client"`.
- `lib/supabase/server.ts` — para Server Components, Route Handlers y Server Actions (`await createClient()`).
- `proxy.ts` — refresca la sesión de Auth en cada petición; no protege rutas.

### Migraciones

Las migraciones son archivos SQL en `supabase/migrations/` (`AAAAMMDDHHMMSS_nombre.sql`), versionados en git. Se aplican al proyecto remoto con el MCP de Supabase (`apply_migration`, con el mismo nombre que el archivo) y se comprueban con `list_migrations`. Después, revisa `get_advisors` (seguridad).

### Tipos

`lib/supabase/database.types.ts` se genera desde el esquema con `generate_typescript_types` del MCP. Regenéralo y sobrescribe el archivo cada vez que una migración cambie el esquema.

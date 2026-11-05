## Checklist de seguridad básico

  - [x] RLS: Row Level Security habilitado en ambas tablas: `games` y `scores` (también en `profiles`; comprobado el 2026-11-04)
  - [ ] Minimum password length — mínimo 8 caracteres (`signUp` ya lo exige con `MIN_PASSWORD`; falta confirmar el valor en el dashboard)
  - [ ] Leaked password protection — (el warning 4) desactivada: solo existe en plan Pro o superior; en plan Free el aviso queda aceptado (README → Seguridad)
  - [ ] Max signup rate — limitar signups por IP (anti-bot) (falta confirmar 30 cada 5 minutos en el dashboard; en la práctica es global, ver README → Seguridad)
  - [x] Headers de seguridad en Next.js (más `Permissions-Policy` y sin `X-Powered-By`)
  
  Ej:

```ts
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

// En la config de Next.js:
headers: async () => [
  { source: '/(.*)', headers: securityHeaders }
]
```

## Por el lado de Supabase:

- [x] TODO: vayan al panel de warnings y errores de Supabase (2026-11-04: resueltos los 2 avisos de `rls_auto_enable`; queda `auth_leaked_password_protection`; ninguno de rendimiento)
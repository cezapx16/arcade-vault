---
name: spec-impl-game
description: Implementa una spec de juego aprobada exactamente igual que /spec-impl (mismas fases, rama spec-NN-slug, paso a paso con pausas) y, al terminar el último paso, lanza en secuencia el subagente skin-designer y después mobile-porter sobre el juego recién implementado.
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Read, Glob, Grep, Edit, Write, AskUserQuestion, Agent, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*)
---

# /spec-impl-game — `/spec-impl` + skins + móvil

## Contexto de la sesión

Estado actual del repositorio:
!`git status --short`

Rama actual:
!`git branch --show-current`

Specs disponibles:
!`ls specs/ 2>/dev/null || echo "No existe la carpeta specs/"`

Configuración de creación de ramas:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (por defecto, sin archivo de configuración)"`

---

Este comando **no redefine** `/spec-impl`: lo reutiliza tal cual y le añade dos fases al final. Responde siempre en español.

El argumento recibido es: `$ARGUMENTS`

## Fase 0 — Cargar `/spec-impl`

Lee **entero** `.claude/skills/spec-impl/SKILL.md`. Sus fases 1 a 4 son las fases 1 a 4 de este comando y se siguen al pie de la letra (identificar la spec, validar que el estado significa "Aprobado", crear o retomar la rama `spec-NN-slug`, mostrar el resumen y implementar paso a paso con pausas), con estas equivalencias:

- Su `$ARGUMENTS` es el argumento recibido aquí.
- Su "contexto de sesión" es el bloque de arriba (los comandos `!` de aquel archivo no se ejecutan al leerlo).
- **Commits:** en este proyecto manda `CLAUDE.md`: un commit por paso (`spec NN paso X: …`) y preguntar antes de seguir con el siguiente.
- Su mensaje "When finishing the last step" **no se muestra**: lo sustituyen las fases 5 y 6 de este archivo.

Si no puedes leer ese archivo, para y díselo al usuario. No improvises las fases.

## Comprobación extra en la Fase 1 — ¿Es una spec de juego?

Tras localizar la spec, confirma que es de un juego real: su slug empieza por `juego-` o su plan crea o modifica `lib/games/<motor>/` y `app/games/<id>/play/page.tsx`. Si no lo es, para:

```
❌ Esta spec no es de un juego, así que no hay skins ni mando táctil que añadir.
Usa /spec-impl <spec> para implementarla.
```

Si lo es, anota para la Fase 5 el **id** del juego (`app/games/<id>/`), el **motor** (`lib/games/<motor>/`) y el componente (`components/games/<motor>-game.tsx`).

## Fase 5 — Agentes en secuencia (skins → móvil)

Empieza cuando el último paso del plan está implementado, con su commit, y el usuario ha confirmado el diff.

1. **Árbol limpio.** Ejecuta `git status --short`. Si hay cambios, enséñalos y pide que se haga commit antes: los agentes hacen sus propios commits y no deben mezclarse con los pasos de la spec.
2. **`skin-designer`.** Lánzalo con la herramienta `Agent` (`subagent_type: "skin-designer"`). En el prompt incluye: id, motor, componente, ruta de la spec, rama activa y estas órdenes: trabajar solo ese juego, en la rama actual, sin push ni PR, siguiendo su proceso completo (auditoría, 4 skins, verificación, commit `skins <id>: …`, memoria y `references/game-with-themes.md`).
3. **Esperar.** Los subagentes corren en segundo plano: **no lances el siguiente hasta recibir la notificación de que `skin-designer` terminó**. Nunca inventes ni anticipes su resultado. Cuando llegue, resume al usuario sus commits y su verificación.
   - Si falló, no terminó, o dejó `npm run build` / `npm run lint` con errores: **para aquí**, explica qué pasó y no lances `mobile-porter`.
4. **`mobile-porter`.** Lánzalo con `Agent` (`subagent_type: "mobile-porter"`) con el mismo contexto más un resumen de lo que cambió `skin-designer` (archivos y commits). Órdenes: solo ese juego, rama actual, sin push ni PR, proceso completo (auditoría, mando, verificación en escritorio y móvil vertical/horizontal, commit `mobile <id>: …`, memoria y `references/mobile-status.md`).
5. **Esperar** su notificación igual que en el punto 3 y resumir su resultado.

**Nunca** lances los dos agentes en paralelo ni en la misma llamada.

## Fase 6 — Cierre

Muestra:

```
✅ Spec implementada, skins y móvil completados.

Spec:  specs/NN-slug.md
Rama:  spec-NN-slug
Juego: <id> (lib/games/<motor>/)

Commits de la spec:      <lista>
Commits de skin-designer: <lista>
Commits de mobile-porter: <lista>

Pendiente de verificar a mano: <lo que los agentes no pudieron verificar>

Siguiente paso: verifica los criterios de aceptación uno a uno. Si todos pasan,
cambia el estado de la spec a "Implementado", haz el commit final y abre la PR a main.
```

## Resumen del comportamiento esperado

```
/spec-impl-game 12-juego-<motor>-<id>   (estado: Aprobado)

  Fase 0  →  Lee .claude/skills/spec-impl/SKILL.md
  Fase 1  →  Encuentra la spec y confirma que es de un juego (id, motor)
  Fase 2  →  Estado "Aprobado" → ✅ sigue
  Fase 3  →  Rama spec-12-juego-<motor>-<id>, resumen de la spec
  Fase 4  →  Paso a paso, un commit por paso, pausa entre pasos
  Fase 5  →  skin-designer → (espera) → mobile-porter → (espera)
  Fase 6  →  Resumen y recordatorio de criterios / Implementado / PR

/spec-impl-game 10   (no es de juego, o no está Aprobado)

  →  Para en la Fase 1 o 2 sin tocar git ni código
```

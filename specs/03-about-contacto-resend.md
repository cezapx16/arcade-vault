# SPEC 03 — Página About y formulario de contacto con Resend

> **Estado:** aprobado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-10-20
> **Objetivo:** Crear `/about` idéntica a `references/templates/home-about/about.jsx` y hacer que su formulario de contacto envíe un correo real con Resend a través de `POST /api/contact`.

## Por qué existe esta spec

La SPEC 02 dejó fuera `about.jsx` y el enlace del Nav. El prototipo solo simula el envío: muestra el terminal de éxito sin mandar nada. Esta spec porta la pantalla tal cual y añade el primer código de servidor del proyecto, un Route Handler que llama a Resend.

## Alcance

**Entra:**

- Ruta `/about` con las 3 partes de `about.jsx`, en el mismo orden y con los mismos textos en español:
  1. Hero: kicker "▸ ACERCA DE", título "ACERCA DE ARCADE VAULT", párrafo de misión y 3 tarjetas `.highlight` (HEART magenta, BROWSER cyan, PLANT green) con iconos pixel SVG.
  2. Divisor `.about-divider` con 24 píxeles animados (`animationDelay` de `i * 80` ms).
  3. Contacto: kicker "▸ CONTACTO", título "CONTÁCTANOS", subtítulo, 3 tips con LED y formulario NOMBRE · CORREO ELECTRÓNICO · MENSAJE.
- Aparición al hacer scroll (`.reveal` → `.in`) del divisor y del bloque de contacto, reutilizando `components/home/reveal.tsx`.
- Formulario con estados: editando, enviando, éxito (terminal `VAULT-OS // TERMINAL`) y error.
- Validación en cliente igual que la referencia: si algún campo está vacío, el formulario hace `shake` y no se envía.
- Route Handler `POST /api/contact` que valida los datos en servidor y envía el correo con el SDK `resend`.
- Campo honeypot oculto contra bots.
- Variables de entorno en `.env.local` (ignorado por git) y plantilla `.env.example` versionada.
- Nav: enlace **Sobre nosotros** después de Salón de la Fama, en escritorio y en el panel móvil, activo (cyan) en `/about`.
- Portar a `app/globals.css` el bloque CSS `ABOUT PAGE` de `references/templates/home-about/styles.css` (líneas 1071–1150).
- `metadata` de la página con el título "Sobre nosotros · Arcade Vault".

**Fuera de alcance (specs futuras):**

- Correo de confirmación automático al usuario que escribe.
- Dominio propio verificado en Resend. Por ahora el remitente es `onboarding@resend.dev`.
- Rate limiting o CAPTCHA.
- Plantilla HTML o React Email para el correo. Se envía texto plano.
- Guardar los mensajes en base de datos.
- Tests automatizados del endpoint.
- Cambiar los textos del template (el título de la página sigue diciendo "ACERCA DE"; solo el Nav dice "Sobre nosotros").

## Modelo de datos

Cuerpo de la petición a `POST /api/contact` (JSON):

```ts
// app/api/contact/route.ts
type ContactPayload = {
  name: string;    // trim, 1–80 caracteres
  email: string;   // trim, formato email, máx. 254 caracteres
  msg: string;     // trim, 1–2000 caracteres
  website: string; // honeypot: debe llegar vacío
};
```

Respuesta (siempre JSON):

```ts
type ContactResponse = { ok: true } | { ok: false; error: string };
```

| Caso | Código | Cuerpo |
| ---- | ------ | ------ |
| Enviado | 200 | `{ ok: true }` |
| Honeypot relleno | 200 | `{ ok: true }` (no se envía nada) |
| JSON inválido o datos que no pasan la validación | 400 | `{ ok: false, error: "DATOS INVÁLIDOS" }` |
| Falta `RESEND_API_KEY`, `CONTACT_TO_EMAIL` o `CONTACT_FROM_EMAIL` | 500 | `{ ok: false, error: "SERVICIO NO CONFIGURADO" }` |
| Resend devuelve error | 502 | `{ ok: false, error: "NO SE PUDO ENVIAR EL MENSAJE" }` |

El texto de `error` se muestra tal cual en la UI. Nunca incluye detalles internos de Resend; esos solo van a `console.error` en el servidor.

Variables de entorno:

```bash
# .env.local (no versionado)
RESEND_API_KEY=            # la rellena el usuario más adelante
CONTACT_TO_EMAIL=cdaniel.my1608@gmail.com
CONTACT_FROM_EMAIL="Arcade Vault <onboarding@resend.dev>"
```

`.env.example` tiene las mismas tres claves, con `CONTACT_FROM_EMAIL` rellena y las otras dos vacías.

Correo enviado:

- `from`: `CONTACT_FROM_EMAIL`.
- `to`: `CONTACT_TO_EMAIL`.
- `replyTo`: el `email` del usuario.
- `subject`: `[Arcade Vault] Nuevo mensaje de {name}`.
- `text`: nombre, correo y mensaje, uno por línea, con etiquetas `Nombre:`, `Correo:` y `Mensaje:`.

Estado del formulario en cliente:

```ts
type Status = "idle" | "sending" | "sent" | "error";
const [form, setForm] = useState({ name: "", email: "", msg: "", website: "" });
```

## Plan de implementación

1. **CSS de About.**
   - Copiar a `app/globals.css` el bloque `ABOUT PAGE` (líneas 1071–1150 de `references/templates/home-about/styles.css`), incluidos `@keyframes pxblink` y `@keyframes shake`.
   - Antes de pegar, comprobar con grep que no existen ya esos selectores ni keyframes.
   - No tocar el cambio sin commitear que ya hay en `.hero-scroll`.
2. **`Reveal` con etiqueta configurable.**
   - `components/home/reveal.tsx` acepta `as?: "section" | "div"` (por defecto `"section"`).
   - El divisor usa `div` con `aria-hidden`. La Home no cambia.
3. **Página `/about`, parte estática.**
   - `components/about/highlight-icon.tsx`: `HighlightIcon` (HEART, BROWSER, PLANT), portado del template.
   - `app/about/page.tsx` (Server Component): `<div className="about fade-in">` con hero, tarjetas, divisor y la columna `.contact-intro`.
   - En lugar del formulario, un hueco temporal. Añadir `metadata`.
4. **Nav con "Sobre nosotros".**
   - `components/nav.tsx`: nueva sección `"about"` activa en `/about`.
   - Enlace **Sobre nosotros** después de Salón de la Fama, en `.links` y en el panel móvil (antes de Iniciar Sesión / Cuenta).
5. **Formulario en cliente (sin envío real).**
   - `components/about/contact-form.tsx` (client): campos, `shake` si hay vacíos, honeypot oculto (`name="website"`, fuera de pantalla, `tabIndex={-1}`, `autoComplete="off"`, `aria-hidden`).
   - Terminal de éxito con el nombre en mayúsculas y botón ENVIAR OTRO MENSAJE, que resetea el formulario.
   - En este paso, el envío pasa directamente a `"sent"`, como el template. Sustituir el hueco del paso 3.
6. **Dependencia y entorno.**
   - `npm install resend`.
   - Crear `.env.local` y `.env.example` según el modelo de datos.
   - Añadir `!.env.example` a `.gitignore` para que se pueda versionar.
7. **Route Handler `app/api/contact/route.ts`.**
   - Leer antes `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` y `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`.
   - Exportar solo `POST`.
   - Orden: parsear JSON → honeypot → validar → comprobar variables de entorno → `new Resend(key).emails.send(...)` → responder según la tabla.
   - El cliente de Resend se crea dentro del handler, así el build no falla aunque falte la clave.
8. **Conectar el formulario al endpoint.**
   - Al enviar: `status = "sending"`, botón deshabilitado con el texto "▶  TRANSMITIENDO…" y `fetch("/api/contact", { method: "POST", ... })`.
   - Si `ok: true`, pasa a `"sent"` y muestra el terminal.
   - Si falla, pasa a `"error"`: debajo del botón aparece una línea en magenta, `[ERROR] {error}`. Si el `fetch` lanza, el texto es "SIN CONEXIÓN CON EL SERVIDOR". Los datos escritos se conservan y se puede reintentar.
   - Validación en cliente con los mismos límites que el servidor (`maxLength` en los inputs).

Estilos en todos los pasos: mismas reglas que las SPEC 01 y 02. Se reutilizan las clases portadas y lo nuevo (honeypot, línea de error) se hace con Tailwind usando los tokens del tema. Los `style` inline calculados (`transitionDelay`, `animationDelay`) se mantienen inline.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores, con y sin `RESEND_API_KEY` definida.
- [ ] `npm run lint` termina sin errores.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en `/about`.
- [ ] `/about` muestra hero, 3 tarjetas, divisor de 24 píxeles y bloque de contacto, en ese orden y con los textos del template.
- [ ] El divisor y el bloque de contacto aparecen con transición la primera vez que entran en pantalla.
- [ ] El Nav muestra Inicio · Biblioteca · Salón de la Fama · Sobre nosotros, en escritorio y en el panel móvil.
- [ ] Sobre nosotros está activo (cyan) solo en `/about`.
- [ ] Enviar con algún campo vacío hace `shake` y no lanza ninguna petición de red.
- [ ] Durante el envío, el botón muestra "▶  TRANSMITIENDO…" y está deshabilitado.
- [ ] Sin `RESEND_API_KEY`, enviar el formulario muestra `[ERROR] SERVICIO NO CONFIGURADO` y conserva los datos escritos.
- [ ] Con una `RESEND_API_KEY` válida, enviar el formulario muestra el terminal con "GRACIAS, {NOMBRE}." y llega un correo a `cdaniel.my1608@gmail.com`.
- [ ] El correo recibido tiene el asunto `[Arcade Vault] Nuevo mensaje de {name}` y, al pulsar "Responder", el destinatario es el correo que escribió el usuario.
- [ ] ENVIAR OTRO MENSAJE vuelve al formulario vacío.
- [ ] `curl -X POST /api/contact` con `{"name":"a","email":"no-es-email","msg":"x","website":""}` devuelve 400.
- [ ] `curl -X POST /api/contact` con el honeypot `website` relleno devuelve 200 y no se envía ningún correo.
- [ ] `GET /api/contact` devuelve 405.
- [ ] `.env.local` no aparece en `git status`. `.env.example` sí se puede añadir.
- [ ] `grep -rn "RESEND_API_KEY" components app/about` no da resultados (la clave solo se usa en el Route Handler).
- [ ] A 375px de ancho, `/about` no tiene scroll horizontal, las tarjetas pasan a 1 columna y el contacto apila intro y formulario.
- [ ] Revisión visual manual de `/about` en escritorio y móvil contra `references/templates/home-about/arcade-vault-standalone.html`: colores, tipografías, neón, animaciones y terminal coinciden.

## Decisiones

- **Sí:** ruta `/about`. Sigue la línea de la SPEC 02 de usar inglés en rutas nuevas. Confirmado por el usuario.
- **Sí:** el enlace del Nav dice "Sobre nosotros", no "Acerca de" como en `nav.jsx`. Lo pidió el usuario. El contenido de la página mantiene los textos del template.
- **Sí:** textos en español, idénticos a `about.jsx`. Confirmado por el usuario.
- **Sí:** Route Handler `POST /api/contact` que llama a Resend en servidor. Lo eligió el usuario.
- **No:** Server Action. Era una alternativa válida, pero el usuario prefirió un endpoint explícito.
- **No:** envío optimista. El terminal de éxito solo aparece si Resend aceptó el correo.
- **Sí:** destinatario `cdaniel.my1608@gmail.com`, leído de `CONTACT_TO_EMAIL`. Lo indicó el usuario. En variable de entorno para poder cambiarlo sin tocar código.
- **Sí:** remitente `onboarding@resend.dev` mientras no haya dominio verificado. Resend lo permite si el destinatario es el email de la cuenta.
- **Sí:** `RESEND_API_KEY` queda vacía en `.env.local`. El usuario la pondrá más adelante. Mientras tanto, el formulario muestra un error controlado.
- **Sí:** `.env.example` versionado, con la excepción `!.env.example` en `.gitignore`. Documenta qué variables hacen falta.
- **Sí:** `replyTo` con el email del usuario. Permite responder con un clic.
- **Sí:** validación en servidor a mano (longitudes y formato de email), sin zod. `resend` es la única dependencia nueva.
- **Sí:** honeypot `website`. Si viene relleno, responde 200 sin enviar, para no dar pistas al bot.
- **No:** rate limiting ni CAPTCHA. No hacen falta con el tráfico actual. Irían en otra spec.
- **No:** correo de confirmación al usuario. Con `onboarding@resend.dev` no se puede enviar a terceros.
- **Sí:** correo en texto plano. Evita inyectar HTML del usuario y no requiere plantillas.
- **Sí:** mensajes de error genéricos en la respuesta y el detalle solo en `console.error` del servidor. No se filtra información interna al cliente.
- **Sí:** reutilizar `Reveal` con la prop `as`, en lugar del `querySelectorAll(".reveal")` global del template. Misma razón que en la SPEC 02.
- **Sí:** la página es Server Component. Solo `ContactForm` y `Reveal` son client.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Con `onboarding@resend.dev`, Resend rechaza destinatarios que no sean el email de la cuenta | `CONTACT_TO_EMAIL` debe ser el email de la cuenta de Resend. Si no lo es, la UI muestra "NO SE PUDO ENVIAR EL MENSAJE" y el detalle queda en el log del servidor. |
| Instanciar `Resend` a nivel de módulo sin clave rompe el build | El cliente se crea dentro del handler, después de comprobar las variables de entorno. |
| `.gitignore` ignora `.env*` y por tanto también `.env.example` | Añadir `!.env.example` (paso 6). |
| Comillas o espacios en `CONTACT_FROM_EMAIL` mal leídos | El valor va entre comillas en `.env.local`. Se verifica con el criterio del correo recibido. |
| `@keyframes shake` o `pxblink` duplicados al pegar el CSS | Grep previo (paso 1). |
| Spam a pesar del honeypot | Aceptado por ahora. El rate limiting queda fuera de alcance. |
| Tocar sin querer el cambio sin commitear de `.hero-scroll` en `globals.css` | El paso 1 solo añade un bloque nuevo y no modifica reglas existentes. |

## Lo que **no** entra en esta spec

- Auto-respuesta al usuario.
- Dominio verificado en Resend.
- Rate limiting o CAPTCHA.
- Plantilla HTML del correo.
- Persistencia de mensajes.
- Tests automatizados.
- Cambiar los textos del template.

Cada uno de estos puntos, si se hace, irá en su propia spec.

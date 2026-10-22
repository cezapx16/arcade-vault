import { Resend } from "resend";

type ContactPayload = {
  name: string; // trim, 1–80 caracteres
  email: string; // trim, formato email, máx. 254 caracteres
  msg: string; // trim, 1–2000 caracteres
  website: string; // honeypot: debe llegar vacío
};

type ContactResponse = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function reply(body: ContactResponse, status = 200) {
  return Response.json(body, { status });
}

// Devuelve los campos ya recortados, o null si no pasan la validación.
function validate(body: Record<string, unknown>): ContactPayload | null {
  const { name, email, msg, website } = body;
  if (typeof name !== "string" || typeof email !== "string" || typeof msg !== "string") return null;
  if (website !== undefined && typeof website !== "string") return null;
  const data = { name: name.trim(), email: email.trim(), msg: msg.trim(), website: website ?? "" };
  if (data.name.length < 1 || data.name.length > 80) return null;
  if (data.email.length > 254 || !EMAIL_RE.test(data.email)) return null;
  if (data.msg.length < 1 || data.msg.length > 2000) return null;
  return data;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reply({ ok: false, error: "DATOS INVÁLIDOS" }, 400);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return reply({ ok: false, error: "DATOS INVÁLIDOS" }, 400);
  }

  // Honeypot relleno: respondemos como si se hubiera enviado, sin dar pistas al bot.
  const fields = body as Record<string, unknown>;
  if (typeof fields.website === "string" && fields.website !== "") return reply({ ok: true });

  const data = validate(fields);
  if (!data) return reply({ ok: false, error: "DATOS INVÁLIDOS" }, 400);

  const { RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL } = process.env;
  if (!RESEND_API_KEY || !CONTACT_TO_EMAIL || !CONTACT_FROM_EMAIL) {
    console.error("[api/contact] Faltan variables de entorno de Resend");
    return reply({ ok: false, error: "SERVICIO NO CONFIGURADO" }, 500);
  }

  // El cliente se crea aquí, no a nivel de módulo, para que el build no dependa de la clave.
  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: CONTACT_FROM_EMAIL,
      to: CONTACT_TO_EMAIL,
      replyTo: data.email,
      subject: `[Arcade Vault] Nuevo mensaje de ${data.name.replace(/\s+/g, " ")}`,
      text: `Nombre: ${data.name}\nCorreo: ${data.email}\nMensaje: ${data.msg}`,
    });
    if (error) {
      console.error("[api/contact] Resend rechazó el envío:", error);
      return reply({ ok: false, error: "NO SE PUDO ENVIAR EL MENSAJE" }, 502);
    }
  } catch (err) {
    console.error("[api/contact] Error al llamar a Resend:", err);
    return reply({ ok: false, error: "NO SE PUDO ENVIAR EL MENSAJE" }, 502);
  }

  return reply({ ok: true });
}

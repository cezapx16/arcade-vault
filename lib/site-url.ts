// Origen público de la app (sin barra final) para el enlace del correo de confirmación.
// Sale de SITE_URL (solo servidor), nunca de las cabeceras de la petición (SPEC 17).
// Sin un valor válido: http://localhost:3000 en desarrollo y null en producción.
const DEV_SITE_URL = "http://localhost:3000";
export function getSiteUrl(): string | null {
  const raw = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (raw) {
    try {
      const url = new URL(raw);
      if (url.protocol === "http:" || url.protocol === "https:") return raw;
    } catch {
      // URL mal escrita: se trata como si faltara.
    }
  }
  return process.env.NODE_ENV === "development" ? DEV_SITE_URL : null;
}

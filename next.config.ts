import type { NextConfig } from "next";
// Cabeceras de seguridad para todas las rutas (spec 16). CSP y HSTS quedan fuera.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];
const nextConfig: NextConfig = {
  /* config options here */
  poweredByHeader: false,
  experimental: {
    agentFeedback: true,
    // El repo vive en OneDrive, que renombra/bloquea archivos de .next/dev/cache y corrompe
    // la caché persistente de Turbopack (panic "Unable to open static sorted file").
    turbopackFileSystemCacheForDev: false,
  },
  cacheComponents: true,
  partialPrefetching: true,
  redirects() {
    return [
      { source: "/juegos/:id", destination: "/games/:id", permanent: true },
      {
        source: "/juegos/:id/jugar",
        destination: "/games/:id/play",
        permanent: true,
      },
    ];
  },
  headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};
export default nextConfig;

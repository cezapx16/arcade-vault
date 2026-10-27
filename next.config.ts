import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
      { source: "/juegos/:id/jugar", destination: "/games/:id/play", permanent: true },
    ];
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

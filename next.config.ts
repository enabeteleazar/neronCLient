import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Servie sous /mobile par Caddy : Next reecrit assets, liens et routeur.
  basePath: "/mobile",
  // App Router activé par défaut en Next.js 15
};

export default nextConfig;

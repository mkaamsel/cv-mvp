import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // pdf-parse and mammoth are complex CJS modules. Without this, Turbopack
  // tries to bundle them and breaks at runtime. This tells Next.js to load
  // them directly from node_modules instead of re-bundling.
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

export default nextConfig;

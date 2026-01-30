import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  
  // Required for better-sqlite3 and playwright
  serverExternalPackages: ["better-sqlite3", "playwright"],

  // Disable image optimization for simpler deployment
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

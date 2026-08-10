import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Kunci root ke folder proyek. Tanpa ini Turbopack menelusuri folder
    // di atasnya dan menemukan package-lock.json milik home directory.
    root: __dirname,
  },
};

export default nextConfig;

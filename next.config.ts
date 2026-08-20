import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle jadi folder mandiri (server + node_modules yang dipakai saja)
  // supaya image Docker kecil dan tidak butuh `npm install` lagi di server.
  output: "standalone",
  turbopack: {
    // Kunci root ke folder proyek. Tanpa ini Turbopack menelusuri folder
    // di atasnya dan menemukan package-lock.json milik home directory.
    root: __dirname,
  },
  experimental: {
    // Default Next.js untuk body Server Action cuma 1MB. Isi file tidak
    // lewat sini lagi (browser mengirim langsung ke Drive), tapi jalur
    // cadangan di src/lib/upload-client.ts masih memakainya untuk file
    // kecil. 4.5MB adalah plafon body request serverless di Vercel —
    // menaikkannya lebih dari ini tidak ada gunanya.
    serverActions: {
      bodySizeLimit: "4.5mb",
    },
  },
};

export default nextConfig;

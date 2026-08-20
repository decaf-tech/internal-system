import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle jadi folder mandiri (server + node_modules yang dipakai saja)
  // supaya image Docker kecil dan tidak butuh `npm install` lagi di server.
  //
  // Dimatikan di Vercel. Vercel merakit lambda-nya dari berkas trace
  // `.next/next-server.js.nft.json`; mode standalone menaruh hasil tracing
  // di `.next/standalone/` dan tidak pernah menulis berkas itu, jadi
  // buildernya berhenti dengan ENOENT. Dua mode ini tidak bisa hidup
  // bersamaan — sampai migrasi ke server sendiri selesai (PRD v3.4),
  // Vercel yang menang dan Docker memakai cabang satunya.
  output: process.env.VERCEL ? undefined : "standalone",
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
      // Server action membandingkan header Origin dengan Host/X-Forwarded-Host.
      // Cloudflare Tunnel jadi proxy di depan aplikasi (PRD v3.4 §6.1) — tanpa
      // ini, semua tombol yang menyimpan data diam-diam gagal di balik tunnel.
      allowedOrigins: ["decaf.id"],
    },
  },
};

export default nextConfig;

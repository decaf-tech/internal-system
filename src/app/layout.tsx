import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Lora, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Decaf · Sistem Internal",
  description: "Manajemen tim, klien, dan operasional Decaf.",
  // Ditambahkan supaya layar-penuh "Add to Home Screen" di iOS tidak
  // memakai judul panjang di bawah ikonnya.
  appleWebApp: { title: "Decaf", capable: true },
};

/**
 * `viewportFit: "cover"` yang membuat `env(safe-area-inset-*)` punya nilai
 * selain nol. Tanpa ini bilah menu bawah di iPhone berhimpitan dengan
 * garis gestur home — paddingnya sudah dituliskan di `nav.tsx` sejak awal,
 * cuma tidak pernah berlaku.
 */
export const viewport: Viewport = {
  themeColor: "#faf7f2",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${jakarta.variable} ${lora.variable} ${plexMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Mono, Sora } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

/**
 * Wordmark & semua judul — huruf yang tertulis di kartu palet brand
 * (`docs/brand/color-palette.jpeg`).
 *
 * Sora adalah geometric sans dengan terminal lurus dan rongga huruf
 * lebar; di berat 600–700 ia tegas tanpa jadi berat, dan bentuk "D"-nya
 * berkerabat dekat dengan "D" di lambang. Itu alasannya menggantikan
 * Fredoka, yang membulat dan ramah — pasangan dari palet krem yang lama.
 *
 * Sekaligus menggantikan Lora untuk judul: sekarang seluruh sistem cuma
 * memuat dua keluarga huruf teks (Sora + Plus Jakarta Sans) plus satu
 * monospace, turun dari empat.
 *
 * Berat tidak didaftarkan supaya yang terkirim berkas variabelnya — satu
 * berkas untuk 600 dan 700 yang dipakai `.display` dan `.wordmark`.
 */
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  /**
   * Dasar untuk semua URL relatif di metadata — `canonical` dan
   * `alternates.languages` milik situs publik yang dua bahasa (lihat
   * `marketingMetadata()` di `components/marketing/site.tsx`).
   *
   * Domainnya belum dibeli (PRD v3.4), jadi nilainya datang dari env var
   * dan jatuh ke localhost selama belum diisi. Menuliskan tebakan domain
   * di sini lebih buruk daripada localhost: yang salah akan diam-diam
   * terkirim ke mesin telusur sebagai alamat kanonik.
   */
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  // Akar sekarang halaman publik, jadi judul & deskripsi bawaan bicara ke
  // calon klien — versi Indonesia, bahasa bawaan situs. Halaman `/` dan
  // `/en` masing-masing menimpanya dengan judulnya sendiri, dan wilayah
  // backoffice mengambilnya kembali di layout-nya sendiri.
  title: "Decaf Tech — Transformasi Digital yang Memanusiakan",
  description:
    "Sistem custom yang Anda miliki, bukan Anda sewa. Rekap harian jadi satu klik, error pencatatan 0%, biaya server Rp 0/bulan.",
  // Ditambahkan supaya layar-penuh "Add to Home Screen" di iOS tidak
  // memakai judul panjang di bawah ikonnya.
  appleWebApp: { title: "Decaf Tech", capable: true },
};

/**
 * `viewportFit: "cover"` yang membuat `env(safe-area-inset-*)` punya nilai
 * selain nol. Tanpa ini bilah menu bawah di iPhone berhimpitan dengan
 * garis gestur home — paddingnya sudah dituliskan di `nav.tsx` sejak awal,
 * cuma tidak pernah berlaku.
 */
export const viewport: Viewport = {
  themeColor: "#f7f9fc",
  viewportFit: "cover",
};

/**
 * `lang="id"` di sini adalah bahasa bawaan dokumen: backoffice seluruhnya
 * berbahasa Indonesia, dan begitu juga situs publik di akar. Versi Inggris
 * situs publik (`/en`) menandai bahasanya sendiri di pembungkus isinya —
 * lihat `MarketingSite`. Layout ini tidak bisa melakukannya sendiri tanpa
 * membaca header rute, dan itu akan mencabut seluruh pohon dari render
 * statis demi satu atribut.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${jakarta.variable} ${plexMono.variable} ${sora.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        {/* Menandai `<html>` bahwa JavaScript hidup, SEBELUM cat
            pertama (`beforeInteractive` — Next menyuntikkannya ke
            `<head>`, dijalankan sebelum bodinya sendiri dirender).
            `.reveal`/`.reveal-pop` di globals.css cuma disembunyikan di
            bawah `html.js`; tanpa baris ini (atau kalau skripnya gagal
            dimuat) elemen-elemen itu tidak pernah tersembunyi sama
            sekali, jadi halaman publik tetap terbaca penuh tanpa
            JavaScript — cuma tanpa efek larutnya. Dipasang di layout
            akar (dipakai backoffice juga) supaya cukup satu skrip,
            bukan digandakan di tiap rute publik (`/`, `/en`); tidak
            berpengaruh apa-apa di backoffice karena tidak ada elemen
            `.reveal` di sana. */}
        <Script id="js-flag" strategy="beforeInteractive">
          {"document.documentElement.classList.add('js')"}
        </Script>
        {children}
      </body>
    </html>
  );
}

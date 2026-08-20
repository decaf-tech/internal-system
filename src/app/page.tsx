import { MarketingSite, marketingMetadata } from "@/components/marketing/site";

/**
 * Halaman publik Decaf — satu halaman gulir yang membawa alur yang sama
 * dengan pitch deck yang selama ini dipakai 1-on-1:
 *
 *   pain → biaya pain → hasil → kepemilikan → pertukaran nilai → langkah berikutnya
 *
 * Ini pintu depan; sistem internal tim pindah ke `/backoffice`.
 *
 * Bahasa Indonesia adalah versi bawaan situs, dan ia yang menempati akar.
 * Versi Inggrisnya berdiri sebagai rute tersendiri di `/en` — isi dan
 * susunannya sama persis, cuma teksnya yang berbeda. Lihat `copy.ts`.
 *
 * Satu-satunya komponen klien di seluruh halaman ini adalah tombol yang
 * membuka form sesi discovery (`DiscoveryButton`). Sisanya teks, tautan,
 * satu SVG, dan animasi gulir yang dijalankan CSS sendiri lewat
 * `animation-timeline: view()` — tanpa pustaka animasi, tanpa observer.
 * Anggarannya sengaja seketat itu: akan aneh menjual kecepatan lewat
 * halaman yang lambat.
 */
export const metadata = marketingMetadata("id");

export default function PublicHomePage() {
  return <MarketingSite lang="id" />;
}

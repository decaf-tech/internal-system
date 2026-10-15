import {
  MarketingSite,
  marketingMetadata,
  marketingViewport,
} from "@/components/marketing/site";

/**
 * Halaman publik Decaf, satu halaman gulir. Ini pintu depan; sistem
 * internal tim ada di `/backoffice`.
 *
 * Bahasa Indonesia adalah versi bawaan situs, dan ia yang menempati akar.
 * Versi Inggrisnya berdiri sebagai rute tersendiri di `/en`: isi dan
 * susunannya sama persis, cuma teksnya yang berbeda. Lihat `copy.ts`.
 *
 * Komponen kliennya cuma dua: form sesi discovery di seksi kontak dan
 * beacon analitik. Sisanya HTML statis dan gambar mascot lewat
 * `next/image`.
 */
export const viewport = marketingViewport;
export const metadata = marketingMetadata("id");

export default function PublicHomePage() {
  return <MarketingSite lang="id" />;
}

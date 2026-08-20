import { MarketingSite, marketingMetadata } from "@/components/marketing/site";

/**
 * Versi bahasa Inggris dari halaman publik di akar.
 *
 * Sengaja rute sendiri, bukan cookie atau deteksi `Accept-Language` di
 * proxy: alamatnya bisa dibagikan apa adanya, hasilnya bisa dirender
 * statis sepenuhnya, dan pengunjung tidak pernah dilempar ke bahasa yang
 * bukan pilihannya. Isinya di `copy-en.ts`.
 */
export const metadata = marketingMetadata("en");

export default function PublicHomePageEn() {
  return <MarketingSite lang="en" />;
}

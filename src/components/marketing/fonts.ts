import { Nunito } from "next/font/google";

/**
 * Huruf situs publik. Dimuat di sini, bukan di layout akar: `next/font`
 * memasang preload di setiap rute yang memakai modul ini, jadi kalau
 * dipanggil di layout akar, backoffice ikut mengunduh huruf yang tidak
 * pernah dipakainya.
 *
 * Berat tidak didaftarkan supaya yang terkirim berkas variabelnya: satu
 * berkas untuk 400 (teks), 600–700 (label, tombol), dan 800 (judul).
 */
export const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

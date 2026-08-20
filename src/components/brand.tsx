import Image from "next/image";
import markSrc from "../../public/brand/logo-icon.png";
import lockupSrc from "../../public/brand/logo-full-inverse.png";

/**
 * Logo Decaf Tech. Dipakai situs publik dan backoffice.
 *
 * Berkasnya diimpor, bukan ditulis sebagai string `"/brand/…"`: dengan
 * begitu lebar & tinggi aslinya ikut terbawa, jadi `next/image` bisa
 * memesan ruangnya sebelum gambarnya sampai — tanpa itu, bilah nav
 * tersentak setiap kali halaman dimuat.
 *
 * Kedua berkas sudah dipangkas sampai batas gambarnya (tadinya masing-
 * masing punya bingkai transparan lebar), jadi tinggi elemen di sini
 * sama dengan tinggi lambang yang benar-benar terlihat.
 */

/**
 * Lambang "D" saja. Punya gradien biru→mint sendiri, jadi ia tidak
 * berubah menuruti latar — aman di atas terang maupun gelap.
 *
 * `priority` disediakan untuk pemakaian di paruh atas layar (bilah nav,
 * hero): lambang yang muncul belakangan adalah hal pertama yang dilihat
 * pengunjung sebagai "halaman ini belum jadi".
 */
export function LogoMark({
  className = "",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={markSrc}
      alt=""
      aria-hidden
      priority={priority}
      className={`w-auto ${className}`}
    />
  );
}

/**
 * Lambang + tulisan "Decaf Tech" dalam satu gambar, versi tulisan terang.
 *
 * HANYA untuk latar gelap (`bg-night`). Belum ada versi tulisan gelap,
 * jadi di area terang pakai `LogoLockup` di bawah, yang merangkai
 * lambang dengan nama bertipografi Sora.
 */
export function LogoLockupInverse({ className = "" }: { className?: string }) {
  return (
    <Image
      src={lockupSrc}
      alt="Decaf Tech"
      className={`w-auto ${className}`}
    />
  );
}

/**
 * Lambang + nama, dirangkai sendiri — tulisannya teks sungguhan
 * (`.wordmark`, Sora Bold) yang mewarisi `color` dari induknya, bukan
 * gambar. Ini yang dipakai di latar terang selama versi tulisan gelap
 * dari lockup-nya belum ada.
 *
 * Sebagai bonus, nama brand-nya tetap bisa dipilih & dicari di halaman,
 * dan tidak ikut kabur kalau gambarnya gagal dimuat.
 *
 * `tagline`, kalau dipasang, menambah "EMPOWERING TECHNOLOGIES" di bawah
 * nama — persis susunan di `logo-full-inverse.png`, cuma versi teks untuk
 * latar terang. Disembunyikan di bawah `sm` dengan sengaja: di lebar
 * ponsel, baris tracked-caps ini lebih lebar dari wordmark-nya sendiri
 * (huruf renggang makan tempat), dan bilah nav sudah berbagi ruang dengan
 * tautan seksi, pengalih bahasa, dan tombol ajakan. Nama brand-nya sendiri
 * tidak pernah disembunyikan — yang hilang cuma baris keduanya.
 */
export function LogoLockup({
  className = "",
  markClassName = "h-7",
  textClassName = "text-xl",
  tagline = false,
  priority = false,
}: {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  tagline?: boolean;
  priority?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={markClassName} priority={priority} />
      <span className="flex flex-col justify-center leading-none">
        <span className={`wordmark ${textClassName}`}>Decaf Tech</span>
        {tagline && (
          <span className="mt-1 hidden font-mono text-[0.5625rem] font-medium tracking-[0.2em] text-ink-subtle uppercase sm:block">
            Empowering Technologies
          </span>
        )}
      </span>
    </span>
  );
}

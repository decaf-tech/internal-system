import Link from "next/link";
import { LogoLockup } from "@/components/brand";
import {
  COPY,
  discoveryProps,
  HOME,
  LANG_LABEL,
  LANG_NAME,
  LANGS,
  type Lang,
} from "./copy";
import { DiscoveryButton } from "./discovery";

/**
 * Potongan-potongan kecil yang dipakai berulang di seluruh halaman publik.
 * Dipisah dari `sections.tsx` supaya berkas seksinya berisi konten, bukan
 * pengulangan kelas Tailwind yang sama sepuluh kali.
 */

export function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Satu seksi halaman. `tone` menentukan latar — pergantian terang/gelap yang
 * memberi halaman iramanya, sama seperti pergantian slide terang/gelap di
 * deck aslinya.
 */
export function Section({
  id,
  tone = "canvas",
  children,
  className = "",
}: {
  id?: string;
  tone?: "canvas" | "muted" | "night";
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    canvas: "bg-canvas text-ink",
    muted: "bg-surface-muted text-ink",
    night: "bg-night text-ink-inverse",
  } as const;

  return (
    <section
      id={id}
      // scroll-mt menahan judul seksi dari tersembunyi di balik bilah nav
      // yang menempel saat dituju lewat tautan jangkar.
      className={`scroll-mt-16 py-20 sm:py-28 ${tones[tone]} ${className}`}
    >
      <Container>{children}</Container>
    </section>
  );
}

/**
 * `tone="light"` dipakai di seksi berlatar gelap: Tech Blue biasa cuma
 * mencapai 3,2:1 di sana, dan eyebrow adalah teks 11px — ambang paling
 * ketat yang ada di halaman ini. Lihat --color-accent-bright di globals.css.
 */
export function Eyebrow({
  children,
  tone = "dark",
}: {
  children: React.ReactNode;
  tone?: "dark" | "light";
}) {
  return (
    <p
      // `reveal` di jendela bawaan — sama dengan SectionTitle di bawahnya.
      // Keduanya sengaja berangkat bersamaan: label seksi dan judulnya
      // adalah satu benda yang kebetulan ditulis dalam dua elemen.
      className={`eyebrow reveal ${tone === "light" ? "text-accent-bright" : "text-accent"}`}
    >
      {children}
    </p>
  );
}

/**
 * Judul seksi — Sora, ukuran yang sama di seluruh halaman.
 *
 * `reveal` dipasang di sini, bukan di `Section`: animasinya digerakkan
 * posisi elemen di viewport, dan seksi yang tingginya melebihi layar
 * baru dianggap "masuk penuh" setelah digulir sepanjang tinggi seksinya
 * sendiri — judulnya baru selesai muncul jauh setelah dibaca. Elemen
 * yang lebih kecil dari layar (judul, kartu) tidak punya masalah itu.
 */
export function SectionTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`display reveal mt-3 text-3xl sm:text-4xl lg:text-[2.75rem] ${className}`}
    >
      {children}
    </h2>
  );
}

export function Lede({
  children,
  tone = "dark",
}: {
  children: React.ReactNode;
  tone?: "dark" | "light";
}) {
  return (
    <p
      // `reveal-late` menggeser jendelanya ke belakang jendela judul,
      // jadi kepala seksi terbaca sebagai dua ketukan (judul lalu
      // penjelasnya) alih-alih satu blok yang menyala serentak.
      className={`reveal reveal-late mt-4 max-w-2xl text-[0.9375rem] leading-relaxed sm:text-base ${
        tone === "light" ? "text-ink-inverse-muted" : "text-ink-muted"
      }`}
    >
      {children}
    </p>
  );
}

/**
 * Pengalih bahasa — dua tautan, bukan tombol.
 *
 * Karena tiap bahasa punya rutenya sendiri (`/` dan `/en`), berpindah
 * bahasa cuma soal berpindah halaman: tidak ada state, tidak ada cookie,
 * tidak ada JavaScript yang harus dimuat dulu sebelum tombolnya berfungsi.
 * Bahasa yang sedang aktif tetap dirender sebagai tautan supaya lebarnya
 * tidak berubah saat berpindah — ia cuma ditandai `aria-current` dan
 * diberi latar penuh.
 *
 * `hreflang` di sini membantu browser & mesin telusur mengenali bahwa dua
 * alamat ini adalah halaman yang sama dalam bahasa berbeda; pasangannya
 * ada di `alternates.languages` pada metadata tiap halaman.
 *
 * `<a>` biasa, BUKAN `next/link`: `Link` mencegat klik dan berpindah
 * lewat pengambilan payload React (navigasi lunak, lihat tab jaringan —
 * `GET /en?_rsc=…`), yang artinya dokumennya tidak pernah benar-benar
 * berganti di mata browser. Larut antar-halaman di globals.css
 * (`@view-transition { navigation: auto }`) cuma menyala untuk navigasi
 * LINTAS-DOKUMEN sungguhan — jadi kalau tautannya tetap `Link`, animasi
 * itu tidak akan pernah terpicu di sini walau kodenya benar. `<a>` biasa
 * memaksa muat ulang dokumen penuh, yang justru cocok: kedua bahasa
 * memang dua dokumen statis terpisah tanpa state yang perlu dibawa. */
function LanguageSwitch({ lang }: { lang: Lang }) {
  return (
    <div
      role="group"
      aria-label={COPY[lang].nav.language}
      // `ml-auto` cuma berlaku di bawah `sm`, saat baris tautan seksi di
      // sebelahnya disembunyikan (`hidden`) dan berhenti jadi elemen flex
      // yang mendorong sisanya ke kanan.
      className="ml-auto flex shrink-0 items-center gap-0.5 rounded-md border border-line bg-surface p-0.5 sm:ml-0"
    >
      {LANGS.map((code) => {
        const active = code === lang;
        return (
          <a
            key={code}
            href={HOME[code]}
            hrefLang={code}
            lang={code}
            title={LANG_NAME[code]}
            aria-current={active ? "true" : undefined}
            className={`rounded px-2.5 py-1.5 font-mono text-[0.6875rem] tracking-wider transition-colors ${
              active
                ? "bg-accent text-white"
                : "text-ink-subtle hover:bg-surface-muted hover:text-ink"
            }`}
          >
            {LANG_LABEL[code]}
          </a>
        );
      })}
    </div>
  );
}

/**
 * Bilah nav. Server component — tautan seksinya jangkar murni dan
 * pengalih bahasanya tautan biasa, jadi tidak ada satu baris JavaScript
 * pun yang perlu dikirim untuk membuat keduanya bekerja.
 *
 * Di layar sempit deretan tautannya digeser, bukan dilipat ke balik tombol
 * hamburger: lima tautan pendek muat digulir dengan ibu jari, dan menu yang
 * harus dibuka dulu menyembunyikan satu-satunya peta halaman ini.
 *
 * Pengalih bahasa TIDAK ikut disembunyikan di layar sempit seperti tombol
 * ajakannya. Pengunjung yang tidak berbahasa Indonesia tidak bisa membaca
 * apa pun di halaman ini sampai ia menemukannya — menaruhnya di balik
 * gulir horizontal berarti menaruh satu-satunya jalan keluar mereka di
 * tempat yang tidak terlihat.
 */
export function SiteNav({ lang }: { lang: Lang }) {
  const copy = COPY[lang];

  return (
    <header className="nav-elevate sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-md">
      {/* Garis kemajuan gulir, menimpa border bawah nav. Murni hiasan —
          `aria-hidden` karena posisi gulir bukan informasi yang bisa
          dibacakan berguna, dan pembaca layar punya caranya sendiri. */}
      <span aria-hidden className="scroll-progress" />

      <Container className="flex h-16 items-center gap-2 sm:gap-4">
        <Link href={HOME[lang]} className="shrink-0" aria-label={copy.nav.home}>
          <LogoLockup
            markClassName="h-8 sm:h-9"
            textClassName="text-base sm:text-xl"
            tagline
            priority
          />
        </Link>

        {/* Disembunyikan di bawah `sm`: setelah nama brand, pengalih
            bahasa, dan tombol ajakan berbagi 375px, sisa ruangnya cuma
            cukup untuk beberapa piksel baris ini — bukan nav yang bisa
            digulir, cuma coretan warna di tepi layar. Situs ini satu
            halaman gulir tunggal; di lebar ponsel jalan masuknya memang
            menggulir, bukan melompat lewat tautan. `mask-image`
            mengaburkan kedua tepi baris di layar yang lebih lega — isyarat
            visual bahwa masih ada tautan di luar layar untuk digulir. */}
        <nav
          aria-label={copy.nav.sections}
          className="-mx-2 hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto px-2 sm:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            maskImage:
              "linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)",
          }}
        >
          {copy.nav.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <LanguageSwitch lang={lang} />

        {/* Tidak lagi disembunyikan di bawah `sm` — ajakan utama situs ini
            tidak boleh menghilang justru di lebar layar yang paling
            banyak dipakai membukanya. Paddingnya menyempit di ponsel
            supaya baris nav di sebelahnya tetap kebagian ruang. */}
        <DiscoveryButton
          {...discoveryProps(lang)}
          className="btn btn-accent shrink-0 px-3 sm:px-5"
        >
          {copy.nav.cta}
        </DiscoveryButton>
      </Container>
    </header>
  );
}

export function SiteFooter({ lang }: { lang: Lang }) {
  const copy = COPY[lang];

  return (
    <footer className="border-t border-line bg-canvas py-10">
      <Container className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <LogoLockup markClassName="h-7" textClassName="text-xl" />
          <p className="mt-2 text-xs text-ink-subtle">{copy.footer.tagline}</p>
          {/* Slogan brand — pindahan dari layar pembuka sejak taglinenya
              (LogoLockup) diganti "Empowering Technologies". Tidak
              diterjemahkan, sama seperti nama. */}
          <p
            lang="en"
            className="mt-1.5 font-mono text-[0.625rem] tracking-[0.3em] text-ink-subtle uppercase"
          >
            Craft First <span className="text-accent">—</span> Tech Second
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-ink-subtle">
          <span>© {new Date().getFullYear()} Decaf Tech</span>
          {/* Pintu tim, bukan ajakan. Sengaja sekecil ini dan di paling
              bawah: pengunjung yang dituju halaman ini tidak punya akun.
              Backoffice-nya sendiri cuma berbahasa Indonesia — yang
              memakainya tim kami. */}
          <Link href="/backoffice" className="hover:text-ink-muted">
            {copy.footer.backoffice}
          </Link>
        </div>
      </Container>
    </footer>
  );
}

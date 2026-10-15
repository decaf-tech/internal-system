import Link from "next/link";
import { LogoLockupInverse } from "@/components/brand";
import { CONTACT } from "./content";
import { COPY, HOME, LANG_LABEL, LANG_NAME, LANGS, type Lang } from "./copy";

/**
 * Potongan yang dipakai berulang di seluruh halaman publik: pembungkus
 * lebar, bilah nav, dan footer.
 */

/**
 * Lebar isi 1200px, dengan gutter di LUAR lebar itu (`box-content`).
 * Begitu yang tertulis di canvas desainnya: di layar 1440 isinya tepat
 * 1200, dan gutter 16px di ponsel tidak memakan lebar isi di desktop.
 */
export function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto box-content max-w-[1200px] px-[clamp(16px,4vw,40px)] ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Pengalih bahasa: dua tautan, bukan tombol.
 *
 * Tiap bahasa punya rutenya sendiri (`/` dan `/en`), jadi berpindah
 * bahasa cuma soal berpindah halaman: tidak ada state, tidak ada cookie.
 * Bahasa yang aktif tetap dirender sebagai tautan supaya lebarnya tidak
 * berubah saat berpindah; ia cuma ditandai `aria-current` dan diberi
 * latar penuh.
 *
 * `<a>` biasa, BUKAN `next/link`: `Link` berpindah lewat payload React
 * (navigasi lunak), dan larut antar-halaman di globals.css
 * (`@view-transition { navigation: auto }`) cuma menyala untuk navigasi
 * lintas-dokumen sungguhan.
 */
function LanguageSwitch({ lang }: { lang: Lang }) {
  return (
    <div
      role="group"
      aria-label={COPY[lang].nav.language}
      className="flex rounded-full bg-night-soft p-[3px] text-[13px] font-bold"
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
            className={`rounded-full px-3 py-2.5 leading-none no-underline ${
              active
                ? "bg-ink-inverse text-ink hover:text-ink"
                : "text-[#c3cfdd] hover:text-white"
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
 * Bilah nav di atas hero, ikut menggulir bersama halaman. Tautan seksinya
 * disembunyikan di bawah 760px: di lebar ponsel jalan masuknya memang
 * menggulir, dan pengalih bahasa serta ajakan utamanya tetap terlihat.
 */
export function SiteNav({ lang }: { lang: Lang }) {
  const copy = COPY[lang].nav;

  return (
    <Container className="flex flex-wrap items-center gap-5 py-[18px]">
      <a
        href="#top"
        aria-label={copy.home}
        className="flex min-h-11 items-center"
      >
        <LogoLockupInverse className="h-9" />
      </a>
      <nav
        aria-label={copy.sections}
        className="ml-auto flex flex-wrap gap-0.5 text-[15px] font-semibold max-[760px]:hidden"
      >
        {copy.links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="p-3 text-ink-inverse no-underline hover:text-accent-bright"
          >
            {link.label}
          </a>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <LanguageSwitch lang={lang} />
        <a
          href="#kontak"
          data-track="discovery_cta"
          className="site-btn min-h-[46px] px-[18px] py-[11px] text-[15px]"
        >
          {copy.cta}
        </a>
      </div>
    </Container>
  );
}

/**
 * Footer. Kontak yang dipajang cuma LinkedIn: setiap ajakan di halaman ini
 * menuju form sesi discovery atau LinkedIn, tidak ada jalur ketiga.
 */
export function SiteFooter({ lang }: { lang: Lang }) {
  const copy = COPY[lang].footer;
  const other = LANGS.find((code) => code !== lang) ?? "id";

  return (
    <footer className="bg-[#061830] text-[#c3cfdd]">
      <Container className="flex flex-wrap items-start gap-x-14 gap-y-7 pt-11 pb-7">
        <div className="min-w-0 flex-[1_1_260px]">
          <LogoLockupInverse className="h-8" />
          <p className="mt-3.5 text-[15px]">{copy.tagline}</p>
        </div>
        <ul className="grid min-w-0 flex-[1_1_260px] gap-0.5 text-[15px]">
          <li>
            <a
              href={CONTACT.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-track="linkedin_cta"
              className="inline-block py-2.5 text-ink-inverse hover:text-accent-bright"
            >
              LinkedIn
            </a>
          </li>
        </ul>
        <ul className="grid min-w-0 flex-[0_1_180px] gap-0.5 text-[15px]">
          <li>
            <a
              href={HOME[other]}
              hrefLang={other}
              lang={other}
              className="inline-block py-2.5 text-ink-inverse hover:text-accent-bright"
            >
              {copy.otherLang}
            </a>
          </li>
          <li>
            {/* Pintu tim, bukan ajakan. Backoffice-nya sendiri cuma
                berbahasa Indonesia; yang memakainya tim kami. */}
            <Link
              href="/backoffice"
              className="inline-block py-2.5 text-[#c3cfdd] hover:text-white"
            >
              {copy.backoffice}
            </Link>
          </li>
        </ul>
      </Container>
      <Container className="pb-7 text-[13px] text-ink-inverse-muted">
        <p>© {new Date().getFullYear()} Decaf Tech</p>
      </Container>
    </footer>
  );
}

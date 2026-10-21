import type { Metadata, Viewport } from "next";
import { AnalyticsBeacon } from "./analytics-beacon";
import { COPY, LANGS, PATHS, type Lang, type Page } from "./copy";
import { nunito } from "./fonts";
import { RevealOnScroll } from "./reveal-on-scroll";
import {
  About,
  Contact,
  Hero,
  Philosophy,
  Process,
  Proof,
  Services,
  ValueDoctrine,
} from "./sections";
import { SiteFooter } from "./shell";

/**
 * Situs publik Decaf, utuh dalam satu bahasa.
 *
 * Dua rute memanggilnya: `/` (Indonesia, bawaan) dan `/en` (Inggris).
 * Keduanya halaman statis penuh — tidak ada deteksi bahasa di server,
 * tidak ada cookie, tidak ada pengalihan. Pengunjung yang membuka `/`
 * mendapat versi Indonesia dan menemukan tombol EN di kanan atas; yang
 * datang dari tautan `/en` langsung mendapat versi Inggrisnya.
 *
 * `lang` dipasang di sini, bukan di `<html>`. Elemen `<html>` milik root
 * layout yang dipakai bersama backoffice, dan layout tidak tahu rute mana
 * yang sedang dirender tanpa membaca header — yang akan membuat seluruh
 * pohon berhenti bisa dirender statis. Atribut `lang` berlaku ke seluruh
 * turunan elemen yang memasangnya, jadi menaruhnya di pembungkus ini
 * cukup untuk pembaca layar dan untuk pemenggalan kata browser.
 * `display: contents` menjaga pembungkusnya tidak ikut menghitung tata
 * letak: header, main, dan footer tetap jadi anak langsung `<body>` yang
 * flex, persis seperti sebelum pembungkus ini ada. Variabel huruf dan
 * kelas `.site` tetap diwariskan ke turunannya: pewarisan CSS mengikuti
 * pohon DOM, bukan kotak tata letak.
 */
export function MarketingSite({ lang }: { lang: Lang }) {
  return (
    <SiteRoot lang={lang}>
      <Hero lang={lang} />
      <main className="flex-1 bg-cream">
        <Philosophy lang={lang} />
        <Services lang={lang} />
        <Proof lang={lang} />
        <ValueDoctrine lang={lang} />
        <Process lang={lang} />
        <About lang={lang} />
        <Contact lang={lang} />
      </main>
      <SiteFooter lang={lang} />
    </SiteRoot>
  );
}

/**
 * Pembungkus bersama setiap halaman publik (beranda dan `/tim`): atribut
 * `lang`, huruf Nunito, kelas `.site`, efek gulir, dan beacon analitik.
 */
export function SiteRoot({
  lang,
  children,
}: {
  lang: Lang;
  children: React.ReactNode;
}) {
  return (
    <div lang={lang} className={`site contents ${nunito.variable}`}>
      <RevealOnScroll />
      <AnalyticsBeacon lang={lang} />
      {children}
    </div>
  );
}

/**
 * Judul, deskripsi, dan pasangan `hreflang` untuk satu bahasa.
 *
 * `alternates.languages` yang memberi tahu mesin telusur bahwa `/` dan
 * `/en` adalah halaman yang sama dalam dua bahasa — tanpa itu keduanya
 * bisa dinilai sebagai konten duplikat, dan yang muncul di hasil
 * pencarian belum tentu versi yang dipahami si pencari. `x-default`
 * menunjuk ke versi Indonesia: itu bahasa bawaan situs ini. Halaman tim
 * (`/tim` ↔ `/en/tim`) dipasangkan dengan cara yang sama.
 */
export function marketingMetadata(lang: Lang, page: Page = "home"): Metadata {
  const meta = page === "team" ? COPY[lang].team.meta : COPY[lang].meta;
  const paths = PATHS[page];

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: paths[lang],
      languages: {
        ...Object.fromEntries(LANGS.map((code) => [code, paths[code]])),
        "x-default": paths.id,
      },
    },
  };
}

/** Bilah browser di ponsel ikut navy, menyambung dengan hero. */
export const marketingViewport: Viewport = { themeColor: "#081f3b" };

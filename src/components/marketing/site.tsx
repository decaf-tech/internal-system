import type { Metadata } from "next";
import { COPY, HOME, LANGS, type Lang } from "./copy";
import { RevealOnScroll } from "./reveal-on-scroll";
import {
  About,
  Contact,
  Hero,
  Outcomes,
  Philosophy,
  Process,
  Proof,
  Services,
  ValueDoctrine,
} from "./sections";
import { SiteFooter, SiteNav } from "./shell";

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
 * flex, persis seperti sebelum pembungkus ini ada.
 */
export function MarketingSite({ lang }: { lang: Lang }) {
  return (
    <div lang={lang} className="contents">
      <RevealOnScroll />
      <SiteNav lang={lang} />
      <main className="flex-1">
        <Hero lang={lang} />
        <Philosophy lang={lang} />
        <Services lang={lang} />
        <Outcomes lang={lang} />
        <Proof lang={lang} />
        <ValueDoctrine lang={lang} />
        <Process lang={lang} />
        <About lang={lang} />
        <Contact lang={lang} />
      </main>
      <SiteFooter lang={lang} />
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
 * menunjuk ke versi Indonesia: itu bahasa bawaan situs ini.
 */
export function marketingMetadata(lang: Lang): Metadata {
  const copy = COPY[lang];

  return {
    title: copy.meta.title,
    description: copy.meta.description,
    alternates: {
      canonical: HOME[lang],
      languages: {
        ...Object.fromEntries(LANGS.map((code) => [code, HOME[code]])),
        "x-default": HOME.id,
      },
    },
  };
}

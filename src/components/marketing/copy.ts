import { waLink } from "./content";
import { EN } from "./copy-en";
import { ID } from "./copy-id";

/**
 * Dua bahasa untuk situs publik: Indonesia (bawaan) dan Inggris.
 *
 * Bentuknya sengaja bukan pustaka i18n dan bukan kamus datar
 * `t("hero.title")`. Yang dipakai di sini satu objek berbentuk sama untuk
 * tiap bahasa, dengan tipe yang ditulis eksplisit di bawah — kompiler yang
 * menjaga tidak ada satu pun kalimat tertinggal saat salah satu bahasa
 * diubah. Kamus datar tidak bisa melakukan itu: kunci yang salah ketik
 * baru ketahuan sebagai teks kosong di halaman produksi.
 *
 * Konsekuensinya yang disengaja: menambah kalimat berarti menambahnya di
 * `copy-id.ts` DAN `copy-en.ts`. Untuk situs satu halaman yang jarang
 * berubah, itu harga yang lebih murah daripada halaman yang separuh
 * bahasanya hilang tanpa ada yang tahu.
 *
 * Bahasa ditentukan rute, bukan cookie: `/` Indonesia, `/en` Inggris.
 * Dengan begitu tiap versi punya alamatnya sendiri — bisa dibagikan,
 * bisa di-cache statis, bisa diindeks Google terpisah — dan tidak ada
 * satu baris JavaScript pun yang dibutuhkan untuk berpindah.
 */

export type Lang = "id" | "en";

export const LANGS: readonly Lang[] = ["id", "en"] as const;

export const DEFAULT_LANG: Lang = "id";

/** Alamat beranda tiap bahasa — dipakai pengalih bahasa di bilah nav. */
export const HOME: Record<Lang, string> = { id: "/", en: "/en" };

/** Label dua huruf di pengalih bahasa. */
export const LANG_LABEL: Record<Lang, string> = { id: "ID", en: "EN" };

/** Nama lengkapnya, untuk `title`/`hreflang` dan pembaca layar. */
export const LANG_NAME: Record<Lang, string> = {
  id: "Bahasa Indonesia",
  en: "English",
};

/* ------------------------------------------------------------------ */
/* Bentuk isi                                                           */
/* ------------------------------------------------------------------ */

/**
 * Potongan kalimat yang sebagian katanya ditebalkan. Dipecah tiga, bukan
 * disimpan sebagai HTML: teks yang dipasang lewat `dangerouslySetInnerHTML`
 * memindahkan tanggung jawab keamanan ke berkas terjemahan.
 */
export type Emphasized = { before: string; strong: string; after: string };

export type Outcome = {
  metric: string;
  caption: string;
  title: string;
  body: string;
};

export type Track = {
  eyebrow: string;
  title: string;
  subtitle: string;
  tone: "night" | "forest";
  rows: { label: string; value: string }[];
  investment: string[];
};

export type CaseStudy = {
  no: string;
  name: string;
  kind: string;
  meta: string;
  before: string;
  track: "kitchen" | "storefront";
  stats: { value: string; label: string }[];
  /** Domain yang live sekarang — cuma diisi untuk sistem yang punya alamat publik. */
  url?: string;
};

export type NumberedItem = { no: string; title: string; body: string };

export type SiteCopy = {
  meta: { title: string; description: string };

  nav: {
    links: { href: string; label: string }[];
    /** `aria-label` deretan tautan seksi. */
    sections: string;
    /** `aria-label` lambang yang menuju ke atas halaman. */
    home: string;
    /** `aria-label` pengalih bahasa. */
    language: string;
    cta: string;
  };

  hero: {
    splashEyebrow: string;
    scroll: string;
    eyebrow: string;
    /** Judul dua baris; bagian `accent` diwarnai. */
    title: { line1: string; line2: string; accent: string };
    lede: Emphasized;
    ctaSecondary: string;
    stats: { value: string; label: string }[];
  };

  philosophy: {
    eyebrow: string;
    title: string;
    body: [string, string];
    empowering: { title: string; body: string };
    craft: { title: string; body: string };
  };

  curve: {
    ariaLabel: string;
    axisX: string;
    axisY: string;
    legendEmpowered: string;
    legendManual: string;
  };

  services: {
    eyebrow: string;
    title: string;
    lede: string;
    cta: string;
    investmentLabel: string;
    tracks: [Track, Track];
  };

  outcomes: {
    kitchen: { eyebrow: string; title: string; items: Outcome[] };
    storefront: { eyebrow: string; title: string; items: Outcome[] };
  };

  proof: {
    eyebrow: string;
    title: string;
    lede: string;
    trackLabel: { kitchen: string; storefront: string };
    cases: CaseStudy[];
  };

  value: {
    eyebrow: string;
    title: string;
    quote: string;
    note: Emphasized;
    items: NumberedItem[];
  };

  process: {
    eyebrow: string;
    title: string;
    lede: string;
    steps: NumberedItem[];
  };

  about: {
    eyebrow: string;
    title: string;
    location: string;
    body: string[];
    facts: { value: string; label: string }[];
  };

  contact: {
    eyebrow: string;
    title: string;
    lede: string;
    ctaSecondary: string;
  };

  footer: {
    tagline: string;
    backoffice: string;
  };

  /**
   * Form sesi discovery — satu-satunya bagian halaman yang dikirim ke
   * browser sebagai komponen klien, jadi isinya ikut terkirim sebagai
   * props. Karena itu ia disimpan sebagai cabang tersendiri: yang
   * menyeberang ke klien cukup cabang ini, bukan seluruh salinan situs.
   */
  discovery: {
    cta: string;
    title: string;
    intro: string;
    fields: {
      phone: { label: string; placeholder: string; hint: string };
      business: { label: string; placeholder: string };
      interest: { label: string; placeholder: string };
    };
    /** Label kolom umpan robot — tersembunyi dari mata & pembaca layar. */
    honeypot: string;
    submit: string;
    pending: string;
    close: string;
    successTitle: string;
    successBody: string;
    fallback: string;
    fallbackLink: string;
    /** Pesan yang dikembalikan server action, lihat `discovery-actions.ts`. */
    errors: {
      empty: string;
      phone: string;
      business: string;
      interest: string;
      failed: string;
    };
  };

  /** Pesan pembuka WhatsApp — sudah terisi di kolom ketik. */
  waMessage: string;
};

export const COPY: Record<Lang, SiteCopy> = { id: ID, en: EN };

/** Menjaga `/en` tetap satu-satunya rute non-Indonesia yang dikenali. */
export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value);
}

/**
 * Props untuk `DiscoveryButton` — satu-satunya komponen klien di situs
 * publik.
 *
 * Dirakit di sini supaya yang menyeberang ke browser cuma cabang yang
 * dipakai formnya. Kalau komponen itu mengimpor `COPY` sendiri, kedua
 * bahasa situs ikut masuk ke bundel klien — dua puluh kilobyte teks yang
 * 100% sudah ada di HTML yang baru saja dikirim.
 */
export function discoveryProps(lang: Lang) {
  return {
    lang,
    copy: COPY[lang].discovery,
    waHref: waLink(COPY[lang].waMessage),
  };
}

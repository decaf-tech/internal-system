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

export type Stat = { value: string; label: string };

export type Track = {
  /** Nama panggung layanan: "The Kitchen" / "The Storefront". */
  label: string;
  title: string;
  subtitle: string;
  tone: "night" | "forest";
  audience: string[];
  stats: [Stat, Stat, Stat];
  details: string[];
};

export type CaseStudy = {
  name: string;
  track: "kitchen" | "storefront";
  /** Angka besar di kartu. Tanpa ini, `result` yang tampil sebagai judul. */
  value?: string;
  result: string;
  meta: string;
  /** Domain yang live sekarang, cuma untuk sistem yang punya alamat publik. */
  url?: string;
  story: string;
};

export type SiteCopy = {
  meta: { title: string; description: string };

  nav: {
    links: { href: string; label: string }[];
    /** `aria-label` deretan tautan seksi. */
    sections: string;
    /** `aria-label` logo yang menuju ke atas halaman. */
    home: string;
    /** `aria-label` pengalih bahasa. */
    language: string;
    cta: string;
  };

  /**
   * Alt text tiap mascot, per tempat dipasangnya. Gambarnya sama di kedua
   * bahasa, jadi cuma kalimatnya yang tinggal di sini.
   */
  mascots: {
    hero: string;
    philosophy: string;
    kitchen: string;
    storefront: string;
    proof: string;
    value: string;
    process: string;
    about: string;
    contact: string;
  };

  /**
   * Penjelas tanda bintang di angka 45%*. Dipasang di bawah pita angka
   * hero dan di bawah kisi rekam jejak, dua tempat angka itu paling
   * menonjol.
   */
  footnote: string;

  hero: {
    title: { before: string; accent: string };
    lede: Emphasized;
    cta: string;
    ctaSecondary: string;
    stats: [Stat, Stat];
    ownership: { title: string; body: string };
  };

  philosophy: {
    /** `aria-label` seksinya: dua kartunya tidak punya judul seksi. */
    label: string;
    cards: [{ title: string; body: string }, { title: string; body: string }];
  };

  services: {
    title: string;
    lede: string;
    cta: string;
    detailsLabel: string;
    /** `aria-label` deretan chip "cocok untuk". */
    audienceLabel: string;
    tracks: [Track, Track];
  };

  proof: {
    title: string;
    lede: string;
    trackLabel: { kitchen: string; storefront: string };
    storyLabel: string;
    cases: CaseStudy[];
  };

  value: {
    title: string;
    quote: string;
    items: string[];
    note: string;
  };

  process: {
    title: string;
    steps: { title: string; body: string }[];
  };

  about: {
    title: string;
    location: string;
    body: string;
    measure: string;
    facts: Stat[];
  };

  contact: {
    title: string;
    lede: string;
  };

  footer: {
    tagline: string;
    /** Tautan ke versi bahasa lainnya. */
    otherLang: string;
    backoffice: string;
  };

  /**
   * Form sesi discovery, satu-satunya bagian halaman yang dikirim ke
   * browser sebagai komponen klien, jadi isinya ikut terkirim sebagai
   * props. Karena itu ia disimpan sebagai cabang tersendiri: yang
   * menyeberang ke klien cukup cabang ini, bukan seluruh salinan situs.
   */
  discovery: {
    title: string;
    fields: {
      phone: { label: string; placeholder: string };
      business: { label: string; placeholder: string };
      interest: { label: string; placeholder: string };
    };
    /** Penanda di label kolom yang boleh dikosongkan. */
    optional: string;
    /** Label kolom umpan robot, tersembunyi dari mata & pembaca layar. */
    honeypot: string;
    submit: string;
    pending: string;
    successTitle: string;
    successBody: string;
    reset: string;
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

};

export const COPY: Record<Lang, SiteCopy> = { id: ID, en: EN };

/** Menjaga `/en` tetap satu-satunya rute non-Indonesia yang dikenali. */
export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value);
}

/**
 * Props untuk `DiscoveryForm`, satu-satunya komponen klien yang memuat
 * teks situs.
 *
 * Dirakit di sini supaya yang menyeberang ke browser cuma cabang yang
 * dipakai formnya. Kalau komponen itu mengimpor `COPY` sendiri, kedua
 * bahasa situs ikut masuk ke bundel klien: belasan kilobyte teks yang
 * sudah ada di HTML yang baru saja dikirim.
 */
export function discoveryProps(lang: Lang) {
  return { lang, copy: COPY[lang].discovery };
}

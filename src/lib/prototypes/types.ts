// Tipe, batas, dan aturan penamaan untuk prototipe statis.
//
// Sengaja bebas dari `server-only` dan dari modul Node: berkas ini ikut
// terbawa ke browser lewat form unggah, yang memvalidasi ukuran & slug
// sebelum mengirim apa pun. Yang menyentuh disk tinggal di `storage.ts`.

/**
 * Batas ukuran zip yang diterima.
 *
 * 100MB jauh di atas prototipe mana pun yang masuk akal (situs statis
 * lengkap dengan gambar jarang lewat 20MB) — angkanya dipasang untuk
 * menghentikan kiriman yang jelas salah, bukan untuk menakar kebutuhan
 * yang nyata.
 */
export const MAX_ZIP_BYTES = 100 * 1024 * 1024;

/**
 * Batas hasil ekstraksi. Rasio kompresi zip bisa ekstrem — beberapa ratus
 * kilobyte bisa mekar jadi gigabyte ("zip bomb") — jadi ukuran zip-nya
 * sendiri tidak cukup jadi pagar. Ekstraksi berhenti begitu salah satu
 * dari dua batas ini terlewati.
 */
export const MAX_EXTRACTED_BYTES = 300 * 1024 * 1024;
export const MAX_FILE_COUNT = 3000;

/** Nama berkas yang dicari sebagai halaman pembuka. */
export const DEFAULT_ENTRY_POINT = "index.html";

export type Prototype = {
  id: string;
  slug: string;
  name: string;
  client_id: string | null;
  entry_point: string;
  is_public: boolean;
  size_bytes: number;
  file_count: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type PrototypeWithRelations = Prototype & {
  client: { id: string; name: string } | null;
  uploader: { full_name: string | null } | null;
};

/** Hasil membongkar sebuah zip ke disk. */
export type ExtractResult = {
  entryPoint: string;
  fileCount: number;
  sizeBytes: number;
};

// ---------------------------------------------------------------------
// Slug
// ---------------------------------------------------------------------

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 60;

/**
 * Ubah nama bebas jadi slug URL.
 *
 * `normalize("NFD")` memisahkan huruf beraksen jadi huruf dasar + tanda
 * diakritiknya, lalu tanda itu dibuang — supaya "Café Périgord" jadi
 * "cafe-perigord" dan bukan "caf-p-rigord".
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    // Pemotongan di atas bisa meninggalkan tanda hubung menggantung.
    .replace(/-+$/g, "");
}

/** Pesan kesalahan untuk slug yang tidak sah, atau null kalau sudah benar. */
export function slugError(slug: string): string | null {
  if (!slug) return "Alamat tautan wajib diisi.";
  if (slug.length > SLUG_MAX_LENGTH) {
    return `Alamat tautan maksimal ${SLUG_MAX_LENGTH} karakter.`;
  }
  if (!SLUG_PATTERN.test(slug)) {
    return "Alamat tautan hanya boleh huruf kecil, angka, dan tanda hubung — mis. landing-kopi-kenangan.";
  }
  return null;
}

// ---------------------------------------------------------------------
// MIME
// ---------------------------------------------------------------------

/**
 * Peta ekstensi → Content-Type, ditulis sendiri alih-alih menarik `mime`
 * sebagai dependency — sama seperti parser Markdown di `lib/markdown.ts`.
 * Daftar di bawah menutupi apa yang benar-benar keluar dari sebuah build
 * situs statis; yang tidak tercantum disajikan sebagai unduhan biner,
 * bukan ditebak.
 *
 * Menebak itulah yang berbahaya: berkas yang diunggah tim bisa saja HTML
 * yang menyamar, dan membiarkan browser mengendus tipenya adalah cara
 * klasik sebuah unggahan berubah jadi skrip yang berjalan. Karena itu
 * setiap response juga membawa `X-Content-Type-Options: nosniff`.
 */
const MIME_BY_EXTENSION: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  map: "application/json; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  bmp: "image/bmp",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  eot: "application/vnd.ms-fontobject",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  pdf: "application/pdf",
  wasm: "application/wasm",
};

export function mimeForPath(filePath: string): string {
  const extension = filePath.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
}

export function isHtmlPath(filePath: string): boolean {
  const extension = filePath.split(".").pop()?.toLowerCase() ?? "";
  return extension === "html" || extension === "htm";
}

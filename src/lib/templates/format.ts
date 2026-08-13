// Format nomor dokumen & angka terbilang.
//
// Dipisah dari `types.ts` supaya keduanya bisa diuji dan dibaca sendiri:
// yang di sini murni fungsi angka → teks, tanpa satu pun tipe domain.

/** I…XII. Bulan dalam nomor dokumen ditulis Romawi — konvensi umum di sini. */
export const ROMAN_MONTHS = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
];

/**
 * "DC/INV/001/VIII/2026".
 *
 * Susunannya tetap; yang bisa diatur cuma dua ruas pertama — kode
 * perusahaan (env `COMPANY_DOC_CODE`) dan kode template (`number_prefix`).
 * Formatnya sengaja tidak dijadikan kolom yang bisa diketik bebas: begitu
 * tiap template boleh punya bentuk nomornya sendiri, "nomor terakhir
 * tahun ini" berhenti bisa dijawab dengan satu MAX dan harus mem-parse
 * ulang string yang bentuknya berbeda-beda.
 *
 * Ruas kosong dilewati, jadi tim tanpa kode perusahaan tetap dapat
 * "INV/001/VIII/2026" yang wajar, bukan "/INV/001/VIII/2026".
 */
export function formatDocNumber(input: {
  companyCode: string;
  prefix: string;
  seq: number;
  /** 1–12. */
  month: number;
  year: number;
}): string {
  return [
    input.companyCode,
    input.prefix,
    String(input.seq).padStart(3, "0"),
    ROMAN_MONTHS[input.month - 1] ?? "",
    String(input.year),
  ]
    .filter((part) => part.length > 0)
    .join("/");
}

const SATUAN = [
  "",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan",
  "sepuluh",
  "sebelas",
];

/**
 * "5000000" → "lima juta rupiah".
 *
 * Ada di dokumen resmi Indonesia hampir tanpa kecuali, dan menuliskannya
 * dengan tangan tiap kali adalah persis jenis kesalahan yang paling mahal
 * ditemukan setelah dokumennya dikirim.
 *
 * Pecahan diabaikan (dibulatkan ke bawah): semua nilai di sistem ini
 * rupiah penuh — `formatRupiah` pun menampilkannya tanpa sen.
 */
export function terbilang(value: number): string {
  const amount = Math.floor(Math.abs(value));
  if (!Number.isFinite(amount)) return "";

  const words = spell(amount).replace(/\s+/g, " ").trim();
  if (!words) return "nol rupiah";

  return `${value < 0 ? "minus " : ""}${words} rupiah`;
}

function spell(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${SATUAN[n - 10]} belas`;
  if (n < 100) return `${spell(Math.floor(n / 10))} puluh ${spell(n % 10)}`;
  // "seratus"/"seribu", bukan "satu ratus"/"satu ribu" — satu-satunya
  // pengecualian bentuk dalam aturan ini, dan berlaku cuma untuk 1.
  if (n < 200) return `seratus ${spell(n - 100)}`;
  if (n < 1000) return `${spell(Math.floor(n / 100))} ratus ${spell(n % 100)}`;
  if (n < 2000) return `seribu ${spell(n - 1000)}`;
  if (n < 1_000_000) return `${spell(Math.floor(n / 1000))} ribu ${spell(n % 1000)}`;
  if (n < 1_000_000_000)
    return `${spell(Math.floor(n / 1_000_000))} juta ${spell(n % 1_000_000)}`;
  if (n < 1_000_000_000_000)
    return `${spell(Math.floor(n / 1_000_000_000))} miliar ${spell(n % 1_000_000_000)}`;

  return `${spell(Math.floor(n / 1_000_000_000_000))} triliun ${spell(
    n % 1_000_000_000_000,
  )}`;
}

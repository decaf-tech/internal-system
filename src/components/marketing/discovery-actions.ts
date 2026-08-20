"use server";

import { createClient } from "@/lib/supabase/server";
import { COPY, DEFAULT_LANG, isLang } from "./copy";

/**
 * Penerima form "sesi discovery gratis" di situs publik.
 *
 * Satu-satunya tulisan dari pengunjung anonim yang boleh masuk ke basis
 * data sistem ini. Karena itu semua pagarnya berkumpul di berkas ini —
 * dan dipasang ulang di tingkat basis data (migration 013 §2 & §3), sebab
 * kunci `anon` ada di browser setiap pengunjung dan PostgREST bisa
 * dipanggil tanpa melewati fungsi ini sama sekali.
 */

export type DiscoveryState = { error: string | null; ok?: true };

/** Sama persis dengan constraint `discovery_requests_length_check`. */
const LIMIT = {
  phone: { min: 6, max: 32 },
  business: { min: 2, max: 120 },
  interest: { min: 4, max: 1000 },
} as const;

/**
 * Pesan kesalahan dikembalikan dalam bahasa halaman yang sedang dibaca
 * pengunjung — dikirim form lewat kolom tersembunyi `lang`.
 *
 * Nilainya diverifikasi, bukan dipercaya: yang datang dari FormData
 * datang dari browser, dan `COPY[nilai-sembarang]` akan meledak jadi
 * error 500 di server action yang seharusnya cuma membalas "coba lagi".
 */
function errorsFor(formData: FormData) {
  const raw = String(formData.get("lang") ?? "");
  return COPY[isLang(raw) ? raw : DEFAULT_LANG].discovery.errors;
}

function read(formData: FormData, key: string) {
  return String(formData.get(key) ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Nomor telepon Indonesia ditulis orang dengan sepuluh cara berbeda:
 * `0812…`, `+62 812…`, `62812…`, dengan tanda hubung, dengan spasi, dalam
 * kurung. Semuanya diterima — yang ditolak cuma yang jelas bukan nomor.
 *
 * Yang disimpan tetap versi rapi milik pengunjung, bukan hasil
 * normalisasi: kalau ternyata ia salah ketik satu digit, angka yang ia
 * tulis sendiri lebih berguna untuk menebak maksudnya daripada tebakan
 * mesin di atasnya.
 */
function isPhoneLike(value: string) {
  const digits = value.replace(/\D/g, "");
  return (
    /^[+()\d][\d\s()+-]*$/.test(value) &&
    digits.length >= 8 &&
    digits.length <= 16
  );
}

export async function submitDiscoveryRequest(
  _prev: DiscoveryState,
  formData: FormData,
): Promise<DiscoveryState> {
  // Kolom umpan: disembunyikan dari mata dan dari pembaca layar, jadi
  // satu-satunya yang mengisinya adalah robot yang mengisi semua kolom
  // yang ditemukannya. Dijawab "berhasil" tanpa menyimpan apa pun —
  // menolaknya dengan pesan error cuma memberi tahu si pengirim spam
  // bagian mana yang perlu ia perbaiki.
  if (read(formData, "website") !== "") return { error: null, ok: true };

  const errors = errorsFor(formData);
  const phone = read(formData, "phone");
  const business = read(formData, "business");
  const interest = read(formData, "interest");

  if (!phone || !business || !interest) {
    return { error: errors.empty };
  }
  if (!isPhoneLike(phone) || phone.length > LIMIT.phone.max) {
    return { error: errors.phone };
  }
  if (business.length < LIMIT.business.min) {
    return { error: errors.business };
  }
  if (interest.length < LIMIT.interest.min) {
    return { error: errors.interest };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("discovery_requests").insert({
    phone,
    // Dipotong, bukan ditolak: yang menulis panjang lebar sedang
    // bersemangat menjelaskan masalahnya — membuangnya karena kepanjangan
    // adalah cara paling mahal untuk kehilangan prospek.
    business: business.slice(0, LIMIT.business.max),
    interest: interest.slice(0, LIMIT.interest.max),
  });

  if (error) {
    console.error("Gagal menyimpan permintaan discovery:", error);
    return { error: errors.failed };
  }

  // Sengaja tidak ada `revalidatePath` ke halaman backoffice: yang
  // mengirim form ini pengunjung anonim yang tidak akan pernah membuka
  // halaman itu, dan panel notifikasi dihitung ulang setiap kali
  // halamannya diakses (PRD v3.0 §3.1) — permintaan ini sudah terhitung
  // di sana pada pemuatan berikutnya.
  return { error: null, ok: true };
}

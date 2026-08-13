import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Identitas perusahaan — data, bukan konfigurasi.
 *
 * Beda kelas dengan `GOOGLE_DRIVE_ROOT_FOLDER_ID` dkk di `lib/env.ts`:
 * rekening bank dan alamat berubah lewat keputusan admin keuangan, bukan
 * lewat developer yang membuka Vercel dashboard. Karena itu tinggal di
 * Supabase (tabel `company_settings`, migration 012), bisa diubah dari
 * halaman Dokumen → Perusahaan oleh siapa pun yang login.
 *
 * Satu baris selalu — lihat catatan singleton di kepala migration 012.
 * ID-nya tetap dan HARUS sama dengan yang ditulis di sana.
 */
export const COMPANY_SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

export type CompanySettings = {
  name: string;
  address: string;
  city: string;
  email: string;
  phone: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  npwp: string;
  docCode: string;
};

const EMPTY: CompanySettings = {
  name: "",
  address: "",
  city: "",
  email: "",
  phone: "",
  bankName: "",
  bankAccountNumber: "",
  bankAccountName: "",
  npwp: "",
  // Sama dengan default kolom di migration 012 — dipakai kalau baris
  // singleton-nya entah bagaimana belum ada (mis. migration 012 belum
  // dijalankan). Dokumen tetap bisa terbit, cuma tanpa kop lengkap.
  docCode: "DC",
};

/**
 * Baca identitas perusahaan yang berlaku sekarang.
 *
 * Dipanggil tiap dokumen dibuat (lewat `buildPlaceholders` di
 * `lib/templates/context.ts`) — bukan di-cache lintas request, supaya
 * perubahan yang baru disimpan admin keuangan langsung ikut ke dokumen
 * berikutnya tanpa perlu redeploy atau tunggu revalidate.
 */
export async function getCompanySettings(): Promise<CompanySettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_settings")
    .select(
      "name, address, city, email, phone, bank_name, bank_account_number, bank_account_name, npwp, doc_code",
    )
    .eq("id", COMPANY_SETTINGS_ID)
    .maybeSingle();

  if (!data) return EMPTY;

  return {
    name: data.name ?? "",
    address: data.address ?? "",
    city: data.city ?? "",
    email: data.email ?? "",
    phone: data.phone ?? "",
    bankName: data.bank_name ?? "",
    bankAccountNumber: data.bank_account_number ?? "",
    bankAccountName: data.bank_account_name ?? "",
    npwp: data.npwp ?? "",
    docCode: data.doc_code || EMPTY.docCode,
  };
}

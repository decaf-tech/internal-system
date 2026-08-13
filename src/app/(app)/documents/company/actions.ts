"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { COMPANY_SETTINGS_ID } from "@/lib/company";

export type FormState = { error: string | null; ok?: true };

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

/**
 * Simpan identitas perusahaan.
 *
 * Baris singleton-nya sudah dibuat migration 012 — di sini cuma
 * `update`, tidak pernah `insert`, konsisten dengan RLS yang memang tidak
 * mengizinkan insert/delete dari aplikasi (lihat kepala migration itu).
 *
 * Sengaja tidak digerbangi `is_super_admin`: hak akses rata berlaku di
 * sini juga (README — "Ketiganya bisa melihat dan mengubah semua data").
 * Admin keuangan yang paling sering butuh mengubah rekening bank, dan
 * tidak ada alasan itu harus menunggu Abi.
 */
export async function updateCompanySettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  const docCode = String(formData.get("doc_code") ?? "")
    .trim()
    .toUpperCase();
  if (docCode && !/^[A-Z0-9]{1,6}$/.test(docCode)) {
    return { error: "Kode dokumen 1–6 huruf/angka, mis. DC." };
  }

  const { error } = await supabase
    .from("company_settings")
    .update({
      name: text(formData, "name"),
      address: text(formData, "address"),
      city: text(formData, "city"),
      email: text(formData, "email"),
      phone: text(formData, "phone"),
      bank_name: text(formData, "bank_name"),
      bank_account_number: text(formData, "bank_account_number"),
      bank_account_name: text(formData, "bank_account_name"),
      npwp: text(formData, "npwp"),
      doc_code: docCode || "DC",
      updated_by: user.id,
    })
    .eq("id", COMPANY_SETTINGS_ID);

  if (error) {
    console.error("Gagal menyimpan identitas perusahaan:", error);
    return { error: "Gagal menyimpan perubahan." };
  }

  await logActivity(supabase, {
    actorId: user.id,
    entityType: "company_settings",
    entityId: COMPANY_SETTINGS_ID,
    action: "updated",
    summary: "mengubah identitas perusahaan",
  });

  revalidatePath("/documents/company");
  return { error: null, ok: true };
}

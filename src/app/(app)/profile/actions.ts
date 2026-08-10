"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export type FormState = { error: string | null; ok?: true };

const ROLES: UserRole[] = ["founder", "coo", "admin"];

export async function updateProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) return { error: "Nama tidak boleh kosong." };

  const rawRole = String(formData.get("role") ?? "");
  const role = ROLES.includes(rawRole as UserRole)
    ? (rawRole as UserRole)
    : null;
  if (!role) return { error: "Peran tidak dikenali." };

  // RLS hanya mengizinkan seseorang mengubah barisnya sendiri, tapi
  // filter id di sini tetap ditulis eksplisit agar niatnya jelas terbaca.
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, role })
    .eq("id", user.id);

  if (error) {
    console.error("Gagal memperbarui profil:", error);
    return { error: "Gagal menyimpan profil." };
  }

  revalidatePath("/", "layout");
  return { error: null, ok: true };
}

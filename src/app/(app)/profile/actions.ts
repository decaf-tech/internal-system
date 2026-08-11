"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { MEMBER_COLOR_ORDER, type MemberColor, type UserRole } from "@/lib/types";

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

  // Warna identitas. Nilai yang tidak dikenali diabaikan (dibiarkan null)
  // daripada menolak seluruh penyimpanan — warna cuma penanda visual, dan
  // ada cadangan yang dihitung dari id kalau kolomnya kosong.
  const rawColor = String(formData.get("color") ?? "");
  const color = MEMBER_COLOR_ORDER.includes(rawColor as MemberColor)
    ? (rawColor as MemberColor)
    : null;

  // RLS hanya mengizinkan seseorang mengubah barisnya sendiri, tapi
  // filter id di sini tetap ditulis eksplisit agar niatnya jelas terbaca.
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, role, color })
    .eq("id", user.id);

  if (error) {
    console.error("Gagal memperbarui profil:", error);
    return { error: "Gagal menyimpan profil." };
  }

  await logActivity(supabase, {
    actorId: user.id,
    entityType: "profile",
    entityId: user.id,
    action: "updated",
    summary: `memperbarui profil sendiri (${fullName})`,
  });

  revalidatePath("/", "layout");
  return { error: null, ok: true };
}

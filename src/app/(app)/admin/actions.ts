"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { USER_ROLE_LABEL, type UserRole } from "@/lib/types";

const ROLES: UserRole[] = ["founder", "coo", "admin"];

/**
 * RLS (migration 005) sudah menjaga di level database — cuma baris
 * `profiles` milik super admin sendiri yang boleh mengizinkan update ke
 * baris orang lain. Pengecekan di sini bukan pengganti itu, tapi lapis
 * kedua: supaya pesan errornya jelas ("bukan wewenangmu"), bukan error
 * generik dari Postgres begitu RLS menolak diam-diam.
 */
async function requireSuperAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  return profile?.is_super_admin ? user : null;
}

/** Ubah nama & peran anggota LAIN. Dipakai dari dashboard /admin saja. */
export async function adminUpdateMember(
  memberId: string,
  fullName: string,
  role: UserRole,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const admin = await requireSuperAdmin(supabase);
  if (!admin) return { error: "Cuma super admin yang bisa mengubah anggota lain." };

  const trimmed = fullName.trim();
  if (!trimmed) return { error: "Nama tidak boleh kosong." };
  if (!ROLES.includes(role)) return { error: "Peran tidak dikenali." };

  const { data: before } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", memberId)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: trimmed, role })
    .eq("id", memberId);

  if (error) {
    console.error("Gagal mengubah anggota:", error);
    return { error: "Gagal menyimpan perubahan." };
  }

  const previousRole = before?.role as UserRole | undefined;
  const roleChanged = previousRole !== undefined && previousRole !== role;
  await logActivity(supabase, {
    actorId: admin.id,
    entityType: "profile",
    entityId: memberId,
    action: roleChanged ? "role_changed" : "updated",
    summary: roleChanged
      ? `mengubah peran ${trimmed} dari ${USER_ROLE_LABEL[previousRole]} jadi ${USER_ROLE_LABEL[role]}`
      : `mengubah data anggota ${trimmed}`,
  });

  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { error: null };
}

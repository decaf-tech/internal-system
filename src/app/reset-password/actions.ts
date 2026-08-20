"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResetPasswordState = { error: string | null };

export async function updatePassword(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "Password minimal 8 karakter." };
  }
  if (password !== confirm) {
    return { error: "Konfirmasi password tidak sama." };
  }

  const supabase = await createClient();

  // updateUser bekerja atas sesi yang barusan dibuat /auth/confirm dari
  // token di email. Kalau sesinya sudah habis, Supabase yang menolak.
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      error:
        "Password gagal disimpan. Tautan mungkin sudah kedaluwarsa — minta tautan baru ke Abi.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/backoffice");
}

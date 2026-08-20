"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/backoffice");

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Pesan asli dari Supabase berbahasa Inggris dan kadang terlalu teknis.
    return { error: "Email atau password salah." };
  }

  revalidatePath("/", "layout");
  // `next` dibatasi ke path internal supaya parameter URL tidak bisa
  // dipakai mengarahkan user ke situs luar setelah login.
  redirect(
    next.startsWith("/") && !next.startsWith("//") ? next : "/backoffice",
  );
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "@/lib/env";

// Client Supabase untuk Server Component, Server Action, dan Route Handler.
// Selalu bikin instance baru per request — jangan pernah dibagi antar
// request, karena tiap request punya sesi user yang berbeda.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component tidak boleh menulis cookie. Ini aman diabaikan
          // karena proxy.ts sudah menyegarkan sesi di setiap request —
          // di sanalah cookie hasil refresh token benar-benar ditulis.
        }
      },
    },
  });
}

/**
 * Ambil user yang sedang login beserta profilnya. Mengembalikan null
 * kalau belum login.
 *
 * Dibungkus `cache()` React — bukan cache lintas request, melainkan memo
 * sepanjang SATU render. Tiap pemanggilan berarti dua perjalanan ke
 * Supabase (verifikasi token + baca baris profil), dan tata letak aplikasi
 * memanggilnya di setiap halaman: tanpa ini, membuka /profile atau dasbor
 * berarti empat perjalanan untuk menjawab pertanyaan yang sama dua kali.
 * Aman karena hasilnya memang tidak berubah di tengah satu render, dan
 * cache-nya ikut mati begitu request-nya selesai — tidak ada risiko sesi
 * satu orang terbawa ke request orang lain.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();

  // getUser() memverifikasi token ke server Supabase. Jangan pakai
  // getSession() untuk keputusan otorisasi — isinya berasal dari cookie
  // yang bisa dipalsukan di sisi klien.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile };
});

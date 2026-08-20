import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Tempat mendaratnya semua tautan yang dikirim Supabase lewat email:
 * pemulihan password, undangan, magic link.
 *
 * Tautan di email cuma membawa token — belum berarti user sudah masuk.
 * Route ini yang menukar token itu jadi sesi (cookie), baru mengantar
 * user ke halaman tujuan. Tanpa route ini, tautan pemulihan mendarat di
 * halaman biasa tanpa sesi dan proxy.ts langsung menendangnya ke /login.
 *
 * Dua bentuk tautan didukung:
 *   - `token_hash` + `type` — dipakai template email yang memakai
 *     `{{ .TokenHash }}`. Ini yang dipakai sistem ini; lihat README.
 *   - `code` — alur PKCE, dipakai kalau permintaan reset dimulai dari
 *     browser. Ditangani sekalian supaya tidak jadi jebakan nanti.
 */

// Daftar putih supaya nilai `type` dari URL tidak diteruskan mentah-mentah
// ke Supabase.
const OTP_TYPES: ReadonlySet<string> = new Set<EmailOtpType>([
  "recovery",
  "invite",
  "magiclink",
  "signup",
  "email",
  "email_change",
]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const code = url.searchParams.get("code");

  // Sama seperti `next` di halaman login: dibatasi ke path internal supaya
  // tautan email tidak bisa dipakai melempar orang ke situs luar.
  //
  // Tujuan bawaannya `/backoffice`, bukan `/`: sejak situs publik menempati
  // akar, mengantar orang yang baru menukar token undangan ke halaman
  // pemasaran berarti sesinya sudah aktif tapi ia tidak melihat tanda apa
  // pun bahwa ia sudah masuk.
  const rawNext = url.searchParams.get("next") ?? "/backoffice";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/backoffice";

  const supabase = await createClient();

  if (tokenHash && type && OTP_TYPES.has(type)) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });
    if (!error) redirect(next);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
  }

  // Token salah, sudah dipakai, atau kedaluwarsa (default Supabase: 1 jam).
  redirect("/login?error=tautan-tidak-berlaku");
}

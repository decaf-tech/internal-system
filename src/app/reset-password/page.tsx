import { ResetPasswordForm } from "./reset-password-form";
import { getCurrentUser } from "@/lib/supabase/server";

// Sengaja di luar /backoffice supaya tidak ikut memuat bilah menu — orang
// yang sampai di sini belum benar-benar "masuk", cuma sedang memperbaiki
// password. Halaman ini juga tidak didaftarkan sebagai path publik di
// proxy.ts: aksesnya justru harus bersesi, dan sesi itu dibuat oleh
// /auth/confirm dari token di email.
export default async function ResetPasswordPage() {
  const current = await getCurrentUser();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="eyebrow">Sistem Internal</p>
          <h1 className="mt-2 text-3xl">Atur password baru</h1>
          <p className="mt-2 text-sm text-ink-muted">
            {current?.user.email
              ? `Untuk akun ${current.user.email}.`
              : "Buat password baru untuk akun kamu."}{" "}
            Setelah tersimpan, kamu langsung masuk.
          </p>
        </div>

        <div className="card p-6">
          <ResetPasswordForm />
        </div>
      </div>
    </main>
  );
}

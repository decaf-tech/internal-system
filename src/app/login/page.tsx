import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const rawNext = params.next;
  const next = typeof rawNext === "string" ? rawNext : "/";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="eyebrow">Sistem Internal</p>
          <h1 className="mt-2 text-3xl">Decaf</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Manajemen tim, klien, dan operasional — dalam satu tempat.
          </p>
        </div>

        <div className="card p-6">
          <LoginForm next={next} />
        </div>

        <p className="mt-6 text-xs text-ink-subtle">
          Akun dibuat oleh admin lewat dashboard Supabase. Belum bisa masuk?
          Hubungi Abi.
        </p>
      </div>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { MobileTabBar, Nav } from "@/components/nav";
import { initials } from "@/lib/format";
import { USER_ROLE_LABEL, type UserRole } from "@/lib/types";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const current = await getCurrentUser();

  // proxy.ts sudah menjaga route ini, tapi pengecekan di sini yang jadi
  // pegangan sebenarnya — proxy bisa saja terlewat kalau matcher berubah.
  if (!current) redirect("/login");

  const name = current.profile?.full_name ?? current.user.email ?? "Tim";
  const role = current.profile?.role as UserRole | undefined;
  const isSuperAdmin = current.profile?.is_super_admin ?? false;

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      {/* Di HP sisi ini menyusut jadi satu bilah judul; menunya pindah ke
          bawah layar (MobileTabBar) supaya terjangkau jempol. */}
      <aside className="border-b border-line bg-surface lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-4 px-4 py-3 lg:block lg:py-4">
          <div>
            <p className="eyebrow">Sistem Internal</p>
            <p className="font-serif text-xl leading-tight">Decaf</p>
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            {/* Admin tinggal di sini, bukan di bilah menu bawah — lihat
                komentar di components/nav.tsx. */}
            {isSuperAdmin && (
              <Link
                href="/admin"
                aria-label="Admin"
                className="icon-btn"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 2l4.5 1.6v3.9c0 3-1.9 5.3-4.5 6.5-2.6-1.2-4.5-3.5-4.5-6.5V3.6L8 2z" />
                  <path d="M5.8 8l1.6 1.6L10.3 6.4" />
                </svg>
              </Link>
            )}

            {/* Pintasan profil versi HP: avatar saja, karena namanya sudah
                muncul di dalam halaman profilnya sendiri. */}
            <Link
              href="/profile"
              aria-label="Profil saya"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest-soft font-mono text-xs text-forest"
            >
              {initials(name)}
            </Link>
          </div>
        </div>

        <div className="hidden px-3 lg:block">
          <Nav isSuperAdmin={isSuperAdmin} />
        </div>

        <div className="mt-auto hidden border-t border-line p-3 lg:block">
          <Link
            href="/profile"
            className="flex items-center gap-2.5 rounded-md px-1 py-1.5 hover:bg-surface-muted"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-soft font-mono text-xs text-forest">
              {initials(name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="truncate text-xs text-ink-subtle">
                {role ? USER_ROLE_LABEL[role] : "Atur profil"}
              </p>
            </div>
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="mt-1 w-full rounded-md px-3 py-1.5 text-left text-xs text-ink-muted hover:bg-surface-muted hover:text-ink"
            >
              Keluar
            </button>
          </form>
        </div>
      </aside>

      {/* Padding bawah = tinggi bilah menu + area aman iPhone, supaya
          baris terakhir tiap halaman tidak tertutup olehnya. Padding
          kiri/kanan ikut area aman juga: dengan `viewportFit: "cover"`
          (lihat app/layout.tsx) layar berponi dalam posisi mendatar
          memakan sebagian tepi. */}
      <main className="flex-1 pt-5 pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(4.5rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] lg:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      <MobileTabBar />
    </div>
  );
}

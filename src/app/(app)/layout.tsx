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

          {/* Pintasan profil versi HP: avatar saja, karena namanya sudah
              muncul di dalam halaman profilnya sendiri. */}
          <Link
            href="/profile"
            aria-label="Profil saya"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-soft font-mono text-xs text-forest lg:hidden"
          >
            {initials(name)}
          </Link>
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

      {/* pb-20 menyediakan ruang untuk bilah menu bawah, supaya baris
          terakhir tiap halaman tidak tertutup olehnya. */}
      <main className="flex-1 px-4 pt-5 pb-20 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      <MobileTabBar isSuperAdmin={isSuperAdmin} />
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dasbor", icon: IconGrid },
  { href: "/tasks", label: "Tugas", icon: IconCheck },
  { href: "/notes", label: "Catatan", icon: IconNote },
  { href: "/clients", label: "Klien", icon: IconUsers },
  { href: "/finance", label: "Keuangan", icon: IconWallet },
  { href: "/documents", label: "Dokumen", icon: IconFile },
] as const;

const ADMIN_LINK = { href: "/admin", label: "Admin", icon: IconShield } as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Daftar menu tegak di sisi kiri — bentuk untuk layar lebar. */
export function Nav({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
  const pathname = usePathname();
  const links = isSuperAdmin ? [...LINKS, ADMIN_LINK] : LINKS;

  return (
    <nav className="flex flex-col gap-1">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
            isActive(pathname, href)
              ? "bg-accent-soft font-medium text-accent"
              : "text-ink-muted hover:bg-surface-muted hover:text-ink"
          }`}
        >
          <Icon />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

/**
 * Menu bawah untuk HP.
 *
 * Menu yang dulu berbaris di atas layar berarti setiap perpindahan halaman
 * menuntut jempol menjangkau sisi terjauh dari tempatnya beristirahat. Di
 * bawah, keenam tujuannya berada tepat di jangkauan — dan lebar layar
 * dibagi rata, jadi tidak ada tombol yang lebih sulit dikenai daripada
 * yang lain.
 *
 * Admin sengaja TIDAK ikut di sini meski Abi punya aksesnya: tujuh kolom
 * di layar 375px berarti 53px per tombol, dan labelnya mulai terpotong.
 * Halaman itu dibuka sebulan sekali, jadi tempatnya di bilah kepala
 * (lihat `(app)/layout.tsx`) — bukan mengambil seperenam dari ruang yang
 * dipakai tiap hari.
 */
export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Menu utama"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="flex">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              // min-h 3.25rem: ikon + label + jarak sudah melewati 44px,
              // tapi dituliskan supaya tidak diam-diam menyusut kalau
              // label atau ukuran ikonnya kelak diubah.
              className={`flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] transition-colors active:bg-surface-muted ${
                active ? "text-accent" : "text-ink-subtle"
              }`}
            >
              {/* Ikon 20px di sini, 16px di menu samping — dilihat sambil
                  berjalan, bukan sambil duduk di depan layar. */}
              <span className="[&>svg]:h-5 [&>svg]:w-5">
                <Icon />
              </span>
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "shrink-0",
};

function IconGrid() {
  return (
    <svg {...iconProps}>
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg {...iconProps}>
      <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
      <path d="M5.5 8l1.8 1.8L10.5 6.5" />
    </svg>
  );
}

function IconNote() {
  return (
    <svg {...iconProps}>
      <rect x="2.5" y="2" width="11" height="12" rx="1.8" />
      <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg {...iconProps}>
      <circle cx="6" cy="5.5" r="2.5" />
      <path d="M2 13.5c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5" />
      <path d="M11 4.2a2.5 2.5 0 010 4.6M12.5 13.5c0-1.6-.6-2.6-1.5-3.2" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg {...iconProps}>
      <rect x="2" y="4" width="12" height="9" rx="2" />
      <path d="M2 7h12M11 10h1" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg {...iconProps}>
      <path d="M9 2H4.5A1.5 1.5 0 003 3.5v9A1.5 1.5 0 004.5 14h7a1.5 1.5 0 001.5-1.5V6L9 2z" />
      <path d="M9 2v4h4" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg {...iconProps}>
      <path d="M8 2l4.5 1.6v3.9c0 3-1.9 5.3-4.5 6.5-2.6-1.2-4.5-3.5-4.5-6.5V3.6L8 2z" />
      <path d="M5.8 8l1.6 1.6L10.3 6.4" />
    </svg>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dasbor", icon: IconGrid },
  { href: "/tasks", label: "Tugas", icon: IconCheck },
  { href: "/clients", label: "Klien", icon: IconUsers },
  { href: "/expenses", label: "Pengeluaran", icon: IconWallet },
  { href: "/documents", label: "Dokumen", icon: IconFile },
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 lg:flex-col">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-accent-soft font-medium text-accent"
                : "text-ink-muted hover:bg-surface-muted hover:text-ink"
            }`}
          >
            <Icon />
            <span>{label}</span>
          </Link>
        );
      })}
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

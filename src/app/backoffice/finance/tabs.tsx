import Link from "next/link";

const TABS = [
  { href: "/backoffice/finance", label: "Ringkasan" },
  { href: "/backoffice/finance/income", label: "Pemasukan" },
  { href: "/backoffice/finance/expenses", label: "Pengeluaran" },
] as const;

/**
 * Tiga sisi dari satu hal yang sama. Pemasukan dan pengeluaran dulu berdiri
 * sendiri-sendiri, dan selama begitu tidak ada satu pun tempat yang bisa
 * menjawab "bulan ini kita untung atau tidak".
 *
 * Server component — tabnya cuma tautan, tidak perlu JavaScript di browser.
 */
export function FinanceTabs({ active }: { active: string }) {
  return (
    <div className="mb-5 -mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <div className="inline-flex rounded-md border border-line bg-surface p-0.5">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded px-3 py-2 text-sm whitespace-nowrap transition-colors ${
              tab.href === active
                ? "bg-ink font-medium text-ink-inverse"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

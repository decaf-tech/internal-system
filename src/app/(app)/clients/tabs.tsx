import Link from "next/link";

const TABS = [
  { href: "/clients", label: "Pipeline" },
  { href: "/clients/list", label: "Klien" },
] as const;

/**
 * Prospek dan klien adalah dua tahap dari satu hubungan yang sama (calon →
 * deal), bukan dua domain berbeda. Menaruhnya di menu sidebar terpisah
 * menyiratkan mereka tidak berhubungan — padahal justru hubungan itu yang
 * dilacak lewat `prospects.client_id`. (PRD v3.0 §2.4)
 *
 * Server component — tabnya cuma tautan, sama seperti `finance/tabs.tsx`.
 */
export function ClientTabs({ active }: { active: string }) {
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

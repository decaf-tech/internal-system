import Link from "next/link";

const TABS = [
  { href: "/documents", label: "Berkas" },
  { href: "/documents/templates", label: "Template" },
  { href: "/documents/company", label: "Perusahaan" },
] as const;

/**
 * Template dokumen dan identitas perusahaan tinggal di bawah Arsip, bukan
 * di menu sidebar sendiri atau di /admin: keduanya bagian dari perkakas
 * dokumen, dan seperti berkas biasa semua anggota tim boleh mengurusnya
 * (yang dibatasi cuma finalisasi ke PDF, di server action-nya sendiri —
 * bukan siapa yang boleh mengubah rekening bank).
 *
 * Server component — tabnya cuma tautan, sama seperti `clients/tabs.tsx`.
 */
export function DocumentTabs({ active }: { active: string }) {
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

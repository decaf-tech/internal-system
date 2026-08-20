import { Skeleton, SkeletonPageHeader } from "@/components/skeleton";

export default function AdminLoading() {
  return (
    <>
      <SkeletonPageHeader
        eyebrow="Super Admin"
        title="Dashboard Admin"
        description="Kontrol anggota tim & riwayat aktivitas di seluruh sistem — cuma kamu yang bisa lihat halaman ini."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-4 lg:col-span-1">
          <h2 className="mb-1 text-base">Anggota Tim</h2>
          <p className="mb-3 text-xs text-ink-subtle">
            Ubah nama & peran orang lain. Peran cuma label — hak akses semua
            orang tetap rata (lihat PRD §2.3).
          </p>
          <ul className="divide-y divide-line">
            {Array.from({ length: 3 }, (_, index) => (
              <li key={index} className="flex items-center gap-2.5 py-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-4 lg:col-span-2">
          <h2 className="mb-3 text-base">Riwayat Aktivitas</h2>
          <ul className="divide-y divide-line">
            {Array.from({ length: 8 }, (_, index) => (
              <li key={index} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/5" />
                  <Skeleton className="h-2.5 w-1/4" />
                </div>
                <Skeleton className="h-2.5 w-20 shrink-0" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

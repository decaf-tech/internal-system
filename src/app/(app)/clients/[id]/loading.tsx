import Link from "next/link";
import { Skeleton, SkeletonListCard } from "@/components/skeleton";

/**
 * Nama klien belum diketahui di sini — halaman ini dibuka lewat id, bukan
 * nama. Tautan "← Semua Klien" tetap ditulis sungguhan supaya jalan mundur
 * sudah bisa ditekan sebelum halamannya selesai memuat.
 */
export default function ClientDetailLoading() {
  return (
    <>
      <Link
        href="/clients"
        className="eyebrow mb-4 inline-block hover:text-accent"
      >
        ← Semua Klien
      </Link>

      <header className="mb-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="mt-2 h-3 w-36" />
        <div className="mt-3 h-0.5 w-10 bg-accent" />
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SkeletonListCard title="Project" rows={2} />
          <SkeletonListCard title="Tugas Terkait" rows={4} />
          <SkeletonListCard title="Lampiran" rows={2} />
        </div>

        <aside className="card h-fit p-4">
          <h2 className="mb-3 text-base">Kontak</h2>
          <dl className="space-y-3">
            {["Narahubung", "Email", "Telepon", "Ditambahkan"].map((label) => (
              <div key={label}>
                <dt className="eyebrow">{label}</dt>
                <dd className="mt-1.5">
                  <Skeleton className="h-3 w-32" />
                </dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </>
  );
}

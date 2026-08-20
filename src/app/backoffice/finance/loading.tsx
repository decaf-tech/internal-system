import {
  Skeleton,
  SkeletonListCard,
  SkeletonPageHeader,
  SkeletonStatGrid,
} from "@/components/skeleton";
import { FinanceTabs } from "./tabs";

/** Pasangan tinggi [masuk, keluar] untuk enam bulan tiruan di grafik. */
const BAR_HEIGHTS: [number, number][] = [
  [45, 30],
  [70, 52],
  [30, 44],
  [85, 40],
  [55, 62],
  [65, 35],
];

/**
 * Tabnya ikut tergambar — `FinanceTabs` server component berisi tautan
 * biasa, tidak butuh data apa pun. Jadi selama halaman ini memuat, pindah
 * ke Pemasukan/Pengeluaran tetap bisa dilakukan tanpa menunggu.
 */
export default function FinanceLoading() {
  return (
    <>
      <SkeletonPageHeader
        eyebrow="03 · Keuangan"
        title="Cashflow"
        description="Uang yang masuk, uang yang keluar, dan sisanya."
      />

      <FinanceTabs active="/backoffice/finance" />

      <SkeletonStatGrid
        className="grid-cols-2 xl:grid-cols-5"
        labels={[
          "Kas Masuk Bulan Ini",
          "Kas Keluar Bulan Ini",
          "Selisih Bulan Ini",
          "Belum Diterima",
          "Pendapatan Berulang",
        ]}
      />

      <section className="card mb-5 p-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-base">6 Bulan Terakhir</h2>
        </div>
        {/* Batang ditiru dengan tinggi berbeda-beda: dua belas batang sama
            tinggi tidak terbaca sebagai grafik yang sedang dimuat,
            melainkan sebagai grafik yang datanya rata. Angkanya sekadar
            bentuk, bukan data — persen tinggi terhadap kotak 8rem. */}
        <div className="flex items-end gap-2 sm:gap-4">
          {BAR_HEIGHTS.map(([masuk, keluar], index) => (
            <div key={index} className="flex min-w-0 flex-1 flex-col">
              <div className="flex h-32 items-end justify-center gap-1">
                <Skeleton
                  className="w-3 rounded-t-sm sm:w-4"
                  style={{ height: `${masuk}%` }}
                />
                <Skeleton
                  className="w-3 rounded-t-sm sm:w-4"
                  style={{ height: `${keluar}%` }}
                />
              </div>
              <Skeleton className="mx-auto mt-1.5 h-2.5 w-8" />
              <Skeleton className="mx-auto mt-1 h-2.5 w-10" />
            </div>
          ))}
        </div>
      </section>

      <SkeletonListCard title="Deal per Project" rows={3} />
    </>
  );
}

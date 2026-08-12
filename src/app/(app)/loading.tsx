import {
  SkeletonListCard,
  SkeletonPageHeader,
  SkeletonStatGrid,
} from "@/components/skeleton";

/**
 * Sapaan "Halo, <nama>" sengaja tidak ditiru dengan balok abu-abu — nama
 * depannya baru diketahui setelah profil terbaca, dan balok selebar nama
 * yang lalu berganti jadi teks membuat judulnya terlihat berkedip. Judul
 * netral yang langsung benar lebih tenang.
 */
export default function DashboardLoading() {
  return (
    <>
      <SkeletonPageHeader
        eyebrow="Dasbor"
        title="Halo"
        description="Ringkasan apa yang sedang berjalan hari ini."
      />

      <SkeletonStatGrid
        labels={[
          "Tugas Aktif",
          "Tugas Saya",
          "Klien Aktif",
          "Belum Diterima",
          "Reimburse Menunggu",
        ]}
        className="grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonListCard title="Perlu Perhatian" rows={4} />
        <SkeletonListCard title="Tenggat Berikutnya" rows={4} />
      </div>
    </>
  );
}

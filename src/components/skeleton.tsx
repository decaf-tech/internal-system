/**
 * Rangka halaman yang tampil selama datanya masih dijemput dari Supabase.
 *
 * Kenapa ini ada: tanpa `loading.tsx`, menekan menu di App Router berarti
 * layar lama diam di tempat sampai server selesai — tidak ada satu piksel
 * pun yang berubah. Di jaringan yang lambat itu tidak terbaca sebagai
 * "sedang memuat" melainkan sebagai "tombolnya tidak berfungsi", dan orang
 * menekannya lagi. Rangka ini yang membuat perpindahan halaman terasa
 * langsung terjadi.
 *
 * Semua komponen di sini server component murni — tidak ada JavaScript yang
 * ikut ke browser hanya untuk menggambar kotak abu-abu.
 *
 * Yang statis JANGAN dijadikan rangka. Judul halaman, deskripsi, dan tab
 * sudah diketahui sejak awal tanpa menunggu database — halaman loading
 * menampilkannya apa adanya, dan menyisakan rangka hanya untuk bagian yang
 * memang menunggu data. Hasilnya perpindahan halaman yang isinya sudah
 * separuh benar sejak milidetik pertama, bukan layar penuh balok abu-abu.
 */

/**
 * Satu balok. `className` menentukan ukurannya; `style` disediakan untuk
 * ukuran yang tidak ada di skala Tailwind — misal tinggi batang grafik yang
 * dihitung sebagai persen.
 */
export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`skeleton ${className}`} style={style} />;
}

/**
 * Baris teks tiruan. Baris terakhir sengaja dibuat lebih pendek — paragraf
 * sungguhan hampir tidak pernah berakhir pas di tepi kanan, dan blok yang
 * rata sempurna terlihat seperti tabel, bukan kalimat.
 */
export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={`h-3 ${index === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

/**
 * Kartu angka ringkas — pasangan rangka untuk `Stat` di dasbor dan halaman
 * keuangan. Kalau pemanggilnya tahu labelnya (dan di hampir semua halaman
 * dia tahu, karena label seperti "Total Diterima" konstanta di kode),
 * teksnya ditulis apa adanya: satu bagian lagi yang sudah benar sebelum
 * database sempat menjawab.
 */
export function SkeletonStat({ label }: { label?: string }) {
  return (
    <div className="card p-3 sm:p-4">
      {label ? (
        <p className="eyebrow">{label}</p>
      ) : (
        <Skeleton className="h-2.5 w-20" />
      )}
      <Skeleton className="mt-2.5 h-6 w-24" />
      <Skeleton className="mt-2 h-2.5 w-16" />
    </div>
  );
}

/**
 * Deret kartu angka dengan pembagian kolom yang sama seperti halaman
 * aslinya. Beri `labels` kalau judul tiap kartu sudah diketahui, atau
 * `count` kalau tidak.
 */
export function SkeletonStatGrid({
  count,
  labels,
  className = "grid-cols-2 xl:grid-cols-4",
}: {
  count?: number;
  labels?: string[];
  className?: string;
}) {
  const cells = labels ?? Array.from({ length: count ?? 4 }, () => undefined);

  return (
    <div className={`mb-5 grid gap-3 ${className}`}>
      {cells.map((label, index) => (
        <SkeletonStat key={index} label={label} />
      ))}
    </div>
  );
}

/**
 * Daftar yang seluruh barisnya duduk dalam satu kartu tunggal — bentuk yang
 * dipakai halaman Pemasukan dan Pengeluaran, berbeda dari `SkeletonListCard`
 * yang punya judul seksi sendiri.
 */
export function SkeletonRowCard({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="card divide-y divide-line overflow-hidden">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
          <Skeleton className="h-3.5 w-24 shrink-0" />
          <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

/**
 * Kartu berisi daftar baris — bentuk yang paling sering muncul di aplikasi
 * ini (tugas di dasbor, deal per project, daftar pemasukan/pengeluaran).
 * Judulnya diterima sebagai teks sungguhan kalau pemanggilnya tahu, karena
 * judul seksi tidak pernah bergantung pada isi database.
 */
export function SkeletonListCard({
  title,
  rows = 4,
}: {
  title?: string;
  rows?: number;
}) {
  return (
    <section className="card p-4">
      {title ? (
        <h2 className="mb-3 text-base">{title}</h2>
      ) : (
        <Skeleton className="mb-3 h-4 w-32" />
      )}
      <ul className="divide-y divide-line">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="flex items-center gap-3 py-3">
            <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
            <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Petak kartu — dipakai daftar klien dan daftar catatan. */
export function SkeletonCardGrid({
  count = 6,
  className = "sm:grid-cols-2 xl:grid-cols-3",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <ul className={`grid gap-3 ${className}`}>
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
          </div>
          <div className="mt-4 flex gap-4">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-2.5 w-14" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Kepala halaman versi loading: eyebrow, judul, dan deskripsi ditulis apa
 * adanya karena ketiganya konstanta di kode, bukan hasil query. Yang
 * sengaja dihilangkan cuma tombol aksinya — tombol itu komponen klien yang
 * butuh daftar klien/project untuk mengisi dropdown-nya, jadi menggambar
 * rangkanya berarti tombol yang berpindah tempat begitu data datang.
 */
export function SkeletonPageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-6">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-1.5 text-2xl">{title}</h1>
      {description && (
        <p className="mt-1 max-w-prose text-sm text-ink-muted">{description}</p>
      )}
      <div className="mt-3 h-0.5 w-10 bg-accent" />
    </header>
  );
}

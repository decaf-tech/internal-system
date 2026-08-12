import { Skeleton, SkeletonPageHeader } from "@/components/skeleton";

export default function DocumentsLoading() {
  return (
    <>
      <SkeletonPageHeader
        eyebrow="04 · Arsip"
        title="Dokumen"
        description="Simpan apa saja, susun sesukamu. Semua tersimpan di Google Drive tim."
      />

      {/* Baris breadcrumb + tombol aksi */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-3 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>

      {/* Folder dulu, baru berkas — urutan yang sama dengan FileBrowser. */}
      <ul className="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <li key={index} className="card flex items-center gap-3 p-4">
            <Skeleton className="h-8 w-8 shrink-0 rounded" />
            <Skeleton className="h-3 w-24" />
          </li>
        ))}
      </ul>

      <ul className="card divide-y divide-line overflow-hidden">
        {Array.from({ length: 5 }, (_, index) => (
          <li key={index} className="flex items-center gap-3 p-4">
            <Skeleton className="h-8 w-8 shrink-0 rounded" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-2.5 w-1/4" />
            </div>
            <Skeleton className="h-2.5 w-16 shrink-0" />
          </li>
        ))}
      </ul>
    </>
  );
}

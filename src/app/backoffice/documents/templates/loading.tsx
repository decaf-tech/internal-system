import { Skeleton, SkeletonPageHeader } from "@/components/skeleton";

export default function TemplatesLoading() {
  return (
    <>
      <SkeletonPageHeader
        eyebrow="04 · Arsip"
        title="Template Dokumen"
        description="Invoice, penawaran, kontrak, berita acara — semuanya lahir dari template Google Docs yang sudah terisi data klien & project."
      />

      {/* Baris tab */}
      <Skeleton className="mb-5 h-10 w-44 rounded-md" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-3 w-72" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      <Skeleton className="mb-4 h-14 w-full rounded-md" />

      <ul className="card divide-y divide-line overflow-hidden">
        {Array.from({ length: 3 }, (_, index) => (
          <li key={index} className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-2.5 w-2/5" />
            </div>
            <Skeleton className="h-8 w-16 shrink-0 rounded" />
          </li>
        ))}
      </ul>
    </>
  );
}

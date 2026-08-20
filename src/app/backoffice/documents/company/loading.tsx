import { Skeleton, SkeletonPageHeader } from "@/components/skeleton";

export default function CompanySettingsLoading() {
  return (
    <>
      <SkeletonPageHeader
        eyebrow="04 · Arsip"
        title="Identitas Perusahaan"
        description="Nama, alamat, dan rekening yang otomatis terisi di dokumen dari template — invoice, penawaran, kontrak."
      />

      <Skeleton className="mb-5 h-10 w-64 rounded-md" />

      <div className="card max-w-2xl space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-16 rounded-md" />
          <Skeleton className="h-16 rounded-md" />
        </div>
        <Skeleton className="h-20 rounded-md" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-16 rounded-md" />
          <Skeleton className="h-16 rounded-md" />
        </div>
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    </>
  );
}

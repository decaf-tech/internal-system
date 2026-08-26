import { Skeleton, SkeletonPageHeader } from "@/components/skeleton";

export default function PrototypesLoading() {
  return (
    <>
      <SkeletonPageHeader
        eyebrow="04 · Arsip"
        title="Prototipe"
        description="Jatuhkan zip hasil build, dapat satu tautan untuk dikirim ke calon klien — lengkap dengan tanda Decaf di pojoknya."
      />

      {/* Bilah tab */}
      <div className="mb-5">
        <Skeleton className="h-10 w-72 rounded-md" />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-3 w-80" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      <ul className="card divide-y divide-line">
        {Array.from({ length: 3 }, (_, index) => (
          <li key={index} className="flex items-start gap-3 p-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-2.5 w-1/4" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
            <Skeleton className="h-9 w-24 shrink-0 rounded-md" />
          </li>
        ))}
      </ul>
    </>
  );
}

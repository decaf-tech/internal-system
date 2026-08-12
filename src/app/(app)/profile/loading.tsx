import { Skeleton, SkeletonPageHeader } from "@/components/skeleton";

export default function ProfileLoading() {
  return (
    <>
      <SkeletonPageHeader
        eyebrow="Akun"
        title="Profil Saya"
        description="Perbaiki nama tampilan dan peranmu di tim."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card space-y-5 p-5 lg:col-span-2">
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          <div className="border-t border-line pt-4">
            <p className="eyebrow">Email</p>
            <Skeleton className="mt-1.5 h-3 w-48" />
          </div>

          <div className="border-t border-line pt-4">
            <h2 className="text-base">Ganti Password</h2>
            <Skeleton className="mt-2.5 h-10 w-full rounded-md" />
            <Skeleton className="mt-2 h-10 w-full rounded-md" />
          </div>
        </section>

        <aside className="card h-fit p-5">
          <h2 className="mb-3 text-base">Tim</h2>
          <ul className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => (
              <li key={index} className="flex items-center gap-2.5">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}

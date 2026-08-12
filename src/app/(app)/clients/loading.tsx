import { SkeletonCardGrid, SkeletonPageHeader } from "@/components/skeleton";

export default function ClientsLoading() {
  return (
    <>
      <SkeletonPageHeader
        eyebrow="01 · Klien"
        title="Daftar Klien"
        description="Siapa saja yang sedang, akan, dan pernah kita kerjakan."
      />
      <SkeletonCardGrid count={6} />
    </>
  );
}

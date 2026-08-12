import { SkeletonCardGrid, SkeletonPageHeader } from "@/components/skeleton";

export default function NotesLoading() {
  return (
    <>
      <SkeletonPageHeader
        eyebrow="06 · Catatan"
        title="Catatan & Notulen"
        description="Tempat menulis panjang: notulen rapat, rincian tugas, apa pun yang tidak muat di kartu."
      />
      <SkeletonCardGrid count={6} />
    </>
  );
}

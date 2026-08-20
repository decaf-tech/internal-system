import Link from "next/link";
import { Skeleton, SkeletonText } from "@/components/skeleton";

/**
 * Rangka ini mengikuti tata letak `note-editor.tsx`, bukan tata letak
 * halaman biasa: lebar maksimumnya sama, tautan kembali di kiri, tombol
 * simpan di kanan.
 *
 * Bidang tulisnya sengaja dibuat setinggi belasan baris. Kalau rangkanya
 * cuma setinggi dua-tiga baris, halaman melompat panjang begitu isi notulen
 * sungguhan datang — persis hal yang mau dihindari.
 */
export default function NoteDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl xl:max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/backoffice/notes"
          className="font-mono text-xs text-ink-subtle hover:text-ink"
        >
          ← Semua catatan
        </Link>
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      <div className="card p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>

        {/* Judul catatan */}
        <Skeleton className="h-8 w-3/4" />

        <div className="mt-6">
          <SkeletonText lines={12} />
        </div>
      </div>
    </div>
  );
}

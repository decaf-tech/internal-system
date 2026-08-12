import { Skeleton, SkeletonPageHeader } from "@/components/skeleton";
import {
  TASK_STATUS_LABEL,
  TASK_STATUS_ORDER,
  TASK_STATUS_TINT,
} from "@/lib/types";

/**
 * Papan kanban punya bentuk yang sangat khas — empat kolom berwarna dengan
 * judul tetap. Semua itu sudah diketahui tanpa satu query pun, jadi yang
 * dijadikan rangka cuma kartunya. Hasilnya papan yang sudah tergambar utuh
 * dan cuma menunggu isinya, bukan halaman kosong.
 *
 * Jumlah kartu tiruan sengaja berbeda-beda per kolom. Empat kolom dengan
 * tinggi persis sama terbaca sebagai tabel kosong, bukan papan yang sedang
 * terisi.
 */
const PLACEHOLDER_CARDS: Record<string, number> = {
  todo: 3,
  in_progress: 2,
  review: 1,
  done: 2,
};

export default function TasksLoading() {
  return (
    <>
      <SkeletonPageHeader
        eyebrow="02 · Tugas"
        title="Papan Tugas"
        description="Apa yang harus, sedang, dan sudah dikerjakan tim — plus rapat rutin."
      />

      <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-2 xl:grid-cols-4">
        {TASK_STATUS_ORDER.map((status) => {
          const tint = TASK_STATUS_TINT[status];
          return (
            <section key={status} className="flex flex-col">
              <header
                className="border-b border-line px-3 py-2.5"
                style={{ backgroundColor: tint.header }}
              >
                <div className="flex w-full items-center justify-center gap-2">
                  <span className="text-sm font-medium text-ink">
                    {TASK_STATUS_LABEL[status]}
                  </span>
                </div>
              </header>

              {/* Kolom "Selesai" disembunyikan di HP, persis seperti papan
                  sungguhannya yang melipat kolom itu sejak awal. */}
              <div
                className={`flex flex-1 flex-col gap-2 p-2.5 ${
                  status === "done" ? "hidden md:flex" : ""
                }`}
                style={{ backgroundColor: tint.body }}
              >
                {Array.from(
                  { length: PLACEHOLDER_CARDS[status] ?? 2 },
                  (_, index) => (
                    <div
                      key={index}
                      className="rounded-md border border-line bg-surface p-3"
                    >
                      <Skeleton className="h-3 w-4/5" />
                      <Skeleton className="mt-2 h-2.5 w-1/2" />
                      <div className="mt-3 flex items-center gap-2">
                        <Skeleton className="h-5 w-5 rounded-full" />
                        <Skeleton className="h-2.5 w-14" />
                      </div>
                    </div>
                  ),
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

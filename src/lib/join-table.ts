import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Samakan isi sebuah tabel relasi banyak-ke-banyak (mis. `task_labels`,
 * `task_assignees`, `event_attendees`) dengan daftar id yang diinginkan:
 * hapus yang tidak ada di daftar, tambahkan yang belum ada.
 *
 * Bukan hapus-semua-lalu-tulis-ulang — supaya menyimpan sesuatu tanpa
 * benar-benar mengubah relasinya tidak menghasilkan tulisan sia-sia ke
 * database. Satu fungsi ini menggantikan tiga versi yang tadinya
 * ditulis ulang per entitas.
 */
export async function syncJoinTable(
  supabase: Supabase,
  opts: {
    table: string;
    anchorColumn: string;
    anchorId: string;
    otherColumn: string;
    wanted: string[];
  },
) {
  const { data: existing } = await supabase
    .from(opts.table)
    .select(opts.otherColumn)
    .eq(opts.anchorColumn, opts.anchorId);

  const current = new Set(
    ((existing ?? []) as unknown as Record<string, string>[]).map(
      (row) => row[opts.otherColumn],
    ),
  );
  const target = new Set(opts.wanted);

  const toRemove = [...current].filter((id) => !target.has(id));
  const toAdd = [...target].filter((id) => !current.has(id));

  if (toRemove.length > 0) {
    await supabase
      .from(opts.table)
      .delete()
      .eq(opts.anchorColumn, opts.anchorId)
      .in(opts.otherColumn, toRemove);
  }

  if (toAdd.length > 0) {
    await supabase.from(opts.table).insert(
      toAdd.map((id) => ({
        [opts.anchorColumn]: opts.anchorId,
        [opts.otherColumn]: id,
      })),
    );
  }
}

/**
 * Daftar id yang dikirim sebagai satu field dipisah koma — dipakai untuk
 * label & penugasan, yang pemilihnya berupa tombol chip/avatar (bukan
 * checkbox bernama sama), jadi nilainya memang sudah dirakit di klien.
 */
export function parseIdList(formData: FormData, key: string) {
  return String(formData.get(key) ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

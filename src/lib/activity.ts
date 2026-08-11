import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { ActivityAction, ActivityEntityType } from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Catat satu baris log aktivitas.
 *
 * Sengaja tidak melempar error: mencatat riwayat tidak boleh menggagalkan
 * aksi utamanya (menyimpan tugas tetap harus berhasil walau baris log-nya
 * gagal ditulis). Dipanggil SETELAH mutasi utamanya sukses, bukan sebelum
 * atau di dalam transaksi yang sama — kalau mutasinya sendiri gagal, tidak
 * ada apa pun yang perlu dicatat.
 */
export async function logActivity(
  supabase: Supabase,
  entry: {
    actorId: string | null;
    entityType: ActivityEntityType;
    entityId: string | null;
    action: ActivityAction;
    summary: string;
  },
) {
  const { error } = await supabase.from("activity_log").insert({
    actor_id: entry.actorId,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    action: entry.action,
    summary: entry.summary,
  });

  if (error) {
    console.error("Gagal mencatat log aktivitas:", error);
  }
}

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { expandOccurrences, formatEventTime } from "@/lib/events";
import { formatRelativeDue, todayJakarta } from "@/lib/format";
import {
  PROSPECT_OPEN_STAGES,
  type EventException,
  type EventSeries,
  type EventSeriesWithRelations,
} from "@/lib/types";

/**
 * Ringkasan "apa yang perlu diperhatikan hari ini", dihitung saat halaman
 * diakses — bukan dikirim terjadwal (PRD v3.0 §3.1).
 *
 * Tidak ada cron, tidak ada email keluar, tidak ada tabel status baca. Untuk
 * pertanyaan "apa yang perlu saya perhatikan sekarang, saat saya sedang pakai
 * aplikasi", menghitung langsung dari sumber datanya lebih sederhana dan lebih
 * akurat daripada menyimpan salinan terjadwal yang bisa basi. Konsekuensinya
 * diterima sadar: kalau tidak ada yang membuka Decaf, tidak ada yang tahu ada
 * yang jatuh tempo hari itu (§3.4).
 *
 * Fungsi ini murni pembaca data. Kalau suatu saat channel eksternal
 * (email/WhatsApp) memang dibutuhkan, ia jadi sumber datanya — tinggal
 * ditambah lapisan pengiriman di atasnya, bukan dibangun ulang (§3.5).
 */

export type NotificationItem = {
  id: string;
  title: string;
  /** Keterangan pendek di kanan baris: tenggat, jam rapat, nama perusahaan. */
  hint: string | null;
};

export type NotificationCategory = {
  key: "tasks" | "events" | "prospects";
  /** Sudah termasuk angkanya — "3 tugas perlu perhatian". */
  label: string;
  href: string;
  count: number;
  /** Beberapa teratas saja; `count` yang memegang jumlah sebenarnya. */
  items: NotificationItem[];
};

export type NotificationSummary = {
  total: number;
  /** Kategori kosong sudah dibuang di sini, jadi panel tinggal menggambar. */
  categories: NotificationCategory[];
};

/**
 * Jumlah baris rincian yang ikut dibawa per kategori.
 *
 * Panelnya dibatasi struktural oleh jumlah kategori (maksimal tiga baris,
 * §3.2), jadi batas ini cuma soal seberapa banyak yang berguna dilihat tanpa
 * berpindah halaman. Lima sudah cukup untuk mengenali "oh, yang itu" —
 * lebih dari itu memang lebih enak dibaca di halamannya sendiri.
 */
const MAX_ITEMS = 5;

export async function getNotificationSummary(
  userId: string,
): Promise<NotificationSummary> {
  const supabase = await createClient();
  const today = todayJakarta();

  const [tasksResult, eventsResult, prospectsResult] = await Promise.all([
    // `!inner` mengubah embed jadi filter: yang kembali cuma tugas yang
    // benar-benar ditugaskan ke orang ini, bukan semua tugas dengan daftar
    // penugasan yang kebetulan kosong.
    supabase
      .from("tasks")
      .select("id, title, due_date, task_assignees!inner(profile_id)")
      .neq("status", "done")
      .lte("due_date", today)
      .eq("task_assignees.profile_id", userId)
      .order("due_date", { ascending: true }),

    // Rapat: yang diambil serinya, bukan kemunculannya — satu baris `events`
    // bisa berarti puluhan rapat, dan mana yang jatuh hari ini baru terjawab
    // setelah pola pengulangannya dihitung (lihat lib/events.ts). Dua filter
    // di bawah memangkas seri yang mustahil menyentuh hari ini.
    supabase
      .from("events")
      .select(
        `*,
         event_attendees!inner(profile_id),
         event_exceptions(*)`,
      )
      .eq("event_attendees.profile_id", userId)
      .lte("event_date", today)
      .or(`recurrence_until.is.null,recurrence_until.gte.${today}`),

    supabase
      .from("prospects")
      .select("id, name, company, next_follow_up_date")
      .in("stage", PROSPECT_OPEN_STAGES)
      .lte("next_follow_up_date", today)
      .eq("owner_id", userId)
      .order("next_follow_up_date", { ascending: true }),
  ]);

  const categories: NotificationCategory[] = [];

  const tasks = tasksResult.data ?? [];
  if (tasks.length > 0) {
    categories.push({
      key: "tasks",
      // Istilah yang sama dengan kartu dasbor ("Perlu Perhatian"): dua tempat
      // yang menghitung hal yang sama sebaiknya juga menamainya sama.
      label: `${tasks.length} tugas perlu perhatian`,
      href: "/tasks",
      count: tasks.length,
      items: tasks.slice(0, MAX_ITEMS).map((task) => ({
        id: task.id,
        title: task.title,
        hint: formatRelativeDue(task.due_date)?.text ?? null,
      })),
    });
  }

  const occurrences = expandOccurrences(
    ((eventsResult.data ?? []) as unknown as EventRow[]).map(toSeries),
    today,
    today,
  ).sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));

  if (occurrences.length > 0) {
    categories.push({
      key: "events",
      label: `${occurrences.length} rapat hari ini`,
      href: "/tasks",
      count: occurrences.length,
      items: occurrences.slice(0, MAX_ITEMS).map((occurrence) => ({
        id: `${occurrence.series.id}-${occurrence.occurrenceDate}`,
        title: occurrence.title,
        hint: formatEventTime(occurrence.start_time) ?? "Sepanjang hari",
      })),
    });
  }

  const prospects = prospectsResult.data ?? [];
  if (prospects.length > 0) {
    categories.push({
      key: "prospects",
      label: `${prospects.length} follow-up prospek`,
      href: "/clients",
      count: prospects.length,
      items: prospects.slice(0, MAX_ITEMS).map((prospect) => ({
        id: prospect.id,
        title: prospect.name,
        hint: prospect.company ?? formatRelativeDue(prospect.next_follow_up_date)?.text ?? null,
      })),
    });
  }

  return {
    total: categories.reduce((sum, category) => sum + category.count, 0),
    categories,
  };
}

type EventRow = EventSeries & {
  event_exceptions: EventException[] | null;
};

/**
 * Baris `events` → bentuk yang dimengerti `expandOccurrences`.
 *
 * Daftar peserta sengaja dikosongkan: query di atas sudah menyaringnya lewat
 * `!inner`, jadi setiap baris yang sampai sini pasti rapat orang ini —
 * membawa profil lengkapnya cuma menambah data yang tidak dibaca siapa pun.
 */
function toSeries(row: EventRow): EventSeriesWithRelations {
  const { event_exceptions, ...series } = row;
  return {
    ...series,
    attendees: [],
    attendee_ids: [],
    exceptions: event_exceptions ?? [],
  };
}

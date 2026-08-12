"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { syncJoinTable } from "@/lib/join-table";
import {
  MOM_TEMPLATE,
  NOTE_KIND_LABEL,
  type NoteKind,
  type NoteSummary,
} from "@/lib/types";

/** Judul yang dipakai kalau catatan disimpan tanpa judul sama sekali. */
const UNTITLED = "Tanpa judul";

type Supabase = Awaited<ReturnType<typeof createClient>>;

function syncParticipants(
  supabase: Supabase,
  noteId: string,
  wanted: string[],
) {
  return syncJoinTable(supabase, {
    table: "note_participants",
    anchorColumn: "note_id",
    anchorId: noteId,
    otherColumn: "profile_id",
    wanted,
  });
}

function syncNoteTasks(supabase: Supabase, noteId: string, wanted: string[]) {
  return syncJoinTable(supabase, {
    table: "note_tasks",
    anchorColumn: "note_id",
    anchorId: noteId,
    otherColumn: "task_id",
    wanted,
  });
}

/** Satu tautan catatan → kemunculan rapat, dalam bentuk yang dikirim form. */
export type EventRefInput = { eventId: string; occurrenceDate: string };

const refKey = (ref: EventRefInput) => `${ref.eventId}|${ref.occurrenceDate}`;

/**
 * Versi `syncJoinTable` untuk `note_events`. Ditulis terpisah karena sisi
 * "lain"-nya dua kolom sekaligus (rapat + tanggal kemunculan), sementara
 * helper umum itu hanya mengenal satu kolom.
 */
async function syncNoteEvents(
  supabase: Supabase,
  noteId: string,
  wanted: EventRefInput[],
) {
  const { data: existing } = await supabase
    .from("note_events")
    .select("event_id, occurrence_date")
    .eq("note_id", noteId);

  const current = new Map(
    ((existing ?? []) as { event_id: string; occurrence_date: string }[]).map(
      (row) => [
        refKey({ eventId: row.event_id, occurrenceDate: row.occurrence_date }),
        row,
      ],
    ),
  );
  const target = new Map(wanted.map((ref) => [refKey(ref), ref]));

  for (const [key, row] of current) {
    if (target.has(key)) continue;
    await supabase
      .from("note_events")
      .delete()
      .eq("note_id", noteId)
      .eq("event_id", row.event_id)
      .eq("occurrence_date", row.occurrence_date);
  }

  const toAdd = [...target].filter(([key]) => !current.has(key));
  if (toAdd.length > 0) {
    const { error } = await supabase.from("note_events").insert(
      toAdd.map(([, ref]) => ({
        note_id: noteId,
        event_id: ref.eventId,
        occurrence_date: ref.occurrenceDate,
      })),
    );
    // Trigger `note_events_one_mom` menolak notulen kedua untuk kemunculan
    // yang sama (migration 007 §3). Pesannya dibalikkan apa adanya supaya
    // yang membacanya tahu bedanya dengan kegagalan jaringan.
    if (error) {
      return error.code === "23505"
        ? "Rapat itu sudah punya notulen. Buka notulen yang sudah ada, atau simpan tulisan ini sebagai Catatan."
        : "Gagal menautkan catatan ke rapat.";
    }
  }

  return null;
}

function revalidateNote(noteId: string) {
  revalidatePath("/notes");
  revalidatePath(`/notes/${noteId}`);
  // Catatan yang menempel ke tugas ikut tampil di modal tugasnya, dan yang
  // menempel ke rapat tampil di form rapat pada halaman yang sama.
  revalidatePath("/tasks");
}

export type NewNoteInput = {
  kind?: NoteKind;
  title?: string;
  content?: string;
  meetingDate?: string | null;
  eventRefs?: EventRefInput[];
  taskIds?: string[];
  clientId?: string | null;
  projectId?: string | null;
  participantIds?: string[];
};

/**
 * Buat catatan lalu langsung buka editornya.
 *
 * Sengaja tidak ada dialog "beri judul dulu": catatan yang belum ditulis
 * belum punya judul yang benar, dan memaksa menebaknya di depan adalah
 * cara paling andal membuat orang menunda menulis. Judulnya diisi sambil
 * jalan, sama seperti di aplikasi catatan mana pun.
 */
export async function createNote(input: NewNoteInput = {}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  const kind = input.kind ?? "note";

  const { data: created, error } = await supabase
    .from("notes")
    .insert({
      kind,
      title: input.title?.trim() ?? "",
      // Notulen lahir dengan kerangkanya; catatan lepas lahir kosong —
      // memaksakan kerangka pada catatan sekali-pakai hanya menambah
      // yang harus dihapus.
      content: input.content ?? (kind === "mom" ? MOM_TEMPLATE : ""),
      meeting_date: input.meetingDate ?? null,
      client_id: input.clientId ?? null,
      project_id: input.projectId ?? null,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("Gagal membuat catatan:", error);
    return { error: "Gagal membuat catatan." };
  }

  if (input.participantIds && input.participantIds.length > 0) {
    await syncParticipants(supabase, created.id, input.participantIds);
  }
  if (input.taskIds && input.taskIds.length > 0) {
    await syncNoteTasks(supabase, created.id, input.taskIds);
  }
  if (input.eventRefs && input.eventRefs.length > 0) {
    const linkError = await syncNoteEvents(supabase, created.id, input.eventRefs);
    if (linkError) {
      // Catatannya sudah terlanjur ada tapi tanpa tautan yang diminta —
      // membiarkannya berarti meninggalkan notulen yatim yang tidak akan
      // pernah ditemukan lagi dari rapatnya.
      await supabase.from("notes").delete().eq("id", created.id);
      return { error: linkError };
    }
  }

  await logActivity(supabase, {
    actorId: user.id,
    entityType: "note",
    entityId: created.id,
    action: "created",
    summary: `membuat ${NOTE_KIND_LABEL[kind].toLowerCase()} "${
      input.title?.trim() || UNTITLED
    }"`,
  });

  revalidateNote(created.id);
  redirect(`/notes/${created.id}`);
}

export type NotePatch = {
  title: string;
  content: string;
  kind: NoteKind;
  meetingDate: string | null;
  taskIds: string[];
  eventRefs: EventRefInput[];
  clientId: string | null;
  projectId: string | null;
  participantIds: string[];
};

/**
 * Simpan seluruh isi editor sekaligus.
 *
 * `log` dipisah dari penyimpanannya sendiri karena editor menyimpan
 * otomatis tiap beberapa detik. Kalau tiap simpanan ikut mencatat log,
 * satu notulen yang ditulis setengah jam meninggalkan puluhan baris
 * "mengubah catatan X" yang menenggelamkan riwayat sungguhan — dan
 * tabel log-nya tumbuh jauh lebih cepat daripada catatannya sendiri.
 * Yang tercatat cuma simpanan yang benar-benar diminta user.
 */
export async function saveNote(
  noteId: string,
  patch: NotePatch,
  options: { log?: boolean } = {},
): Promise<{ error: string | null; savedAt?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  const title = patch.title.trim();

  const { error } = await supabase
    .from("notes")
    .update({
      title,
      content: patch.content,
      kind: patch.kind,
      // Tanggal rapat hanya berarti untuk notulen; membiarkannya terisi
      // saat jenisnya diubah kembali ke catatan biasa akan memunculkannya
      // lagi begitu jenisnya diubah bolak-balik.
      meeting_date: patch.kind === "mom" ? patch.meetingDate : null,
      client_id: patch.clientId,
      project_id: patch.projectId,
      updated_by: user.id,
    })
    .eq("id", noteId);

  if (error) {
    console.error("Gagal menyimpan catatan:", error);
    return { error: "Gagal menyimpan catatan." };
  }

  await syncParticipants(supabase, noteId, patch.participantIds);
  await syncNoteTasks(supabase, noteId, patch.taskIds);

  // Jenisnya sudah tersimpan di atas, jadi trigger di database membaca
  // `kind` yang baru saat tautan rapatnya disamakan — mengubah catatan
  // biasa jadi notulen untuk rapat yang sudah bernotulen ditolak di sini,
  // bukan diam-diam menghasilkan dua notulen untuk satu pertemuan.
  const linkError = await syncNoteEvents(supabase, noteId, patch.eventRefs);
  if (linkError) return { error: linkError };

  if (options.log) {
    // Ikut menyegarkan halaman lain hanya di sini. Simpanan otomatis
    // berjalan tiap beberapa detik selama mengetik, dan `revalidatePath`
    // memicu render ulang server untuk halaman yang sedang dibuka —
    // artinya query catatan berjalan lagi tiap dua detik, sepanjang
    // notulen ditulis, tanpa satu pun perubahan yang terlihat di layar.
    revalidateNote(noteId);

    await logActivity(supabase, {
      actorId: user.id,
      entityType: "note",
      entityId: noteId,
      action: "updated",
      summary: `mengubah ${NOTE_KIND_LABEL[patch.kind].toLowerCase()} "${
        title || UNTITLED
      }"`,
    });
  }

  return { error: null, savedAt: new Date().toISOString() };
}

export async function deleteNote(noteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: note } = await supabase
    .from("notes")
    .select("title, kind")
    .eq("id", noteId)
    .single();

  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  if (error) {
    console.error("Gagal menghapus catatan:", error);
    return { error: "Gagal menghapus catatan." };
  }

  if (note) {
    await logActivity(supabase, {
      actorId: user?.id ?? null,
      entityType: "note",
      entityId: null,
      action: "deleted",
      summary: `menghapus ${NOTE_KIND_LABEL[
        note.kind as NoteKind
      ].toLowerCase()} "${note.title || UNTITLED}"`,
    });
  }

  revalidateNote(noteId);
  redirect("/notes");
}

/**
 * Buka notulen sebuah rapat — buat dulu kalau belum ada.
 *
 * Satu tombol, bukan dua ("buat notulen" / "lihat notulen"): dari sisi
 * yang memakainya, keduanya adalah pertanyaan yang sama, dan indeks unik
 * di migration 006 memastikan satu kemunculan rapat cuma punya satu
 * notulen. Peserta rapatnya ikut terbawa sebagai daftar hadir awal —
 * tinggal dicoret siapa yang ternyata tidak datang.
 */
export async function openMeetingNote(input: {
  eventId: string;
  occurrenceDate: string;
  title: string;
  attendeeIds: string[];
}) {
  const supabase = await createClient();

  // `!inner` supaya barisnya ikut tersaring oleh `kind`, dan embed-nya
  // sengaja TIDAK diberi alias: PostgREST menuntut jalur filter memakai
  // alias kalau ada, dan menamainya di satu tempat lalu menyaringnya lewat
  // nama tabel adalah cara diam-diam mendapatkan notulen orang lain.
  const { data: existing } = await supabase
    .from("note_events")
    .select("note_id, notes!inner(kind)")
    .eq("event_id", input.eventId)
    .eq("occurrence_date", input.occurrenceDate)
    .eq("notes.kind", "mom")
    .maybeSingle();

  if (existing) redirect(`/notes/${existing.note_id}`);

  return createNote({
    kind: "mom",
    title: input.title,
    meetingDate: input.occurrenceDate,
    eventRefs: [
      { eventId: input.eventId, occurrenceDate: input.occurrenceDate },
    ],
    participantIds: input.attendeeIds,
  });
}

/**
 * Kaitkan catatan yang SUDAH ADA ke sebuah tugas atau rapat.
 *
 * Dipisah dari `saveNote` karena datangnya dari arah yang berlawanan: di
 * sini yang sedang dibuka adalah tugas/rapatnya, dan catatannya dipilih
 * dari daftar. Memakai `saveNote` berarti klien harus lebih dulu memuat
 * seluruh isi catatan itu hanya untuk mengirimkannya kembali utuh.
 */
export async function linkNote(input: {
  noteId: string;
  taskId?: string;
  event?: EventRefInput;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();

  if (input.taskId) {
    const { error } = await supabase
      .from("note_tasks")
      .insert({ note_id: input.noteId, task_id: input.taskId });
    // 23505 = tautannya memang sudah ada. Dari sisi yang menekan tombol,
    // hasilnya sama dengan berhasil.
    if (error && error.code !== "23505") {
      console.error("Gagal mengaitkan catatan ke tugas:", error);
      return { error: "Gagal mengaitkan catatan." };
    }
  }

  if (input.event) {
    const linkError = await syncNoteEventAppend(
      supabase,
      input.noteId,
      input.event,
    );
    if (linkError) return { error: linkError };
  }

  revalidateNote(input.noteId);
  return { error: null };
}

async function syncNoteEventAppend(
  supabase: Supabase,
  noteId: string,
  ref: EventRefInput,
) {
  const { error } = await supabase.from("note_events").insert({
    note_id: noteId,
    event_id: ref.eventId,
    occurrence_date: ref.occurrenceDate,
  });
  if (!error) return null;
  if (error.code === "23505") {
    // Bisa berarti dua hal yang berbeda: tautannya sudah ada (tidak
    // apa-apa), atau trigger menolak notulen kedua (harus diberitahukan).
    const { data } = await supabase
      .from("note_events")
      .select("note_id")
      .eq("note_id", noteId)
      .eq("event_id", ref.eventId)
      .eq("occurrence_date", ref.occurrenceDate)
      .maybeSingle();
    if (data) return null;
    return "Rapat itu sudah punya notulen. Lepaskan yang lama dulu, atau kaitkan catatan ini sebagai Catatan biasa.";
  }
  console.error("Gagal mengaitkan catatan ke rapat:", error);
  return "Gagal mengaitkan catatan.";
}

/** Lepaskan tautan tanpa menyentuh catatannya sendiri. */
export async function unlinkNote(input: {
  noteId: string;
  taskId?: string;
  event?: EventRefInput;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();

  if (input.taskId) {
    await supabase
      .from("note_tasks")
      .delete()
      .eq("note_id", input.noteId)
      .eq("task_id", input.taskId);
  }

  if (input.event) {
    await supabase
      .from("note_events")
      .delete()
      .eq("note_id", input.noteId)
      .eq("event_id", input.event.eventId)
      .eq("occurrence_date", input.event.occurrenceDate);
  }

  revalidateNote(input.noteId);
  return { error: null };
}

/**
 * Catatan yang menempel pada satu kemunculan rapat.
 *
 * Diambil saat form rapatnya dibuka, bukan ikut dikirim bersama seluruh
 * kalender: satu bulan bisa berisi ratusan kemunculan, dan yang catatannya
 * pernah dilihat orang cuma yang sedang diklik.
 */
export async function notesForOccurrence(
  eventId: string,
  occurrenceDate: string,
): Promise<NoteSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("note_events")
    .select("note:notes(id, title, kind, updated_at)")
    .eq("event_id", eventId)
    .eq("occurrence_date", occurrenceDate);

  if (error) {
    console.error("Gagal memuat catatan rapat:", error);
    return [];
  }

  return ((data ?? []) as unknown as { note: NoteSummary | null }[])
    .map((row) => row.note)
    .filter((note): note is NoteSummary => note !== null);
}

/**
 * Isi satu catatan — diambil saat pratinjaunya dibuka dari daftar.
 *
 * Alasannya sama dengan `searchNotes` di bawah, cuma dari arah sebaliknya:
 * daftar catatan sengaja tidak membawa `content` ke browser (lihat
 * `notes/page.tsx`), jadi isinya baru diminta saat ada yang benar-benar
 * membuka pratinjau — satu catatan, bukan seluruh arsip.
 *
 * `null` berarti gagal mengambil, dan itu beda dari `""` yang berarti
 * catatannya memang masih kosong.
 */
export async function noteContent(noteId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("content")
    .eq("id", noteId)
    .maybeSingle();

  if (error) {
    console.error("Gagal mengambil isi catatan:", error);
    return null;
  }
  return data?.content ?? "";
}

/**
 * Catatan yang bisa dipilih untuk dikaitkan, tanpa membawa isinya.
 *
 * Isi catatan bisa beberapa ratus KB untuk notulen panjang, dan yang
 * dibutuhkan daftar pilihan cuma judul — mengirim `content` ke sini
 * berarti membayar seluruh arsip catatan demi satu dropdown.
 */
export async function searchNotes(input: {
  query?: string;
  excludeIds?: string[];
  limit?: number;
}): Promise<NoteSummary[]> {
  const supabase = await createClient();

  let request = supabase
    .from("notes")
    .select("id, title, kind, updated_at")
    .order("updated_at", { ascending: false })
    .limit(input.limit ?? 20);

  const query = input.query?.trim();
  if (query) {
    const pattern = `%${query.replace(/[%_]/g, (char) => `\\${char}`)}%`;
    request = request.or(`title.ilike.${pattern},content.ilike.${pattern}`);
  }

  if (input.excludeIds && input.excludeIds.length > 0) {
    request = request.not("id", "in", `(${input.excludeIds.join(",")})`);
  }

  const { data, error } = await request;
  if (error) {
    console.error("Gagal mencari catatan:", error);
    return [];
  }
  return (data ?? []) as NoteSummary[];
}

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { expandOccurrences } from "@/lib/events";
import { formatDate } from "@/lib/format";
import type {
  Document,
  EventException,
  EventSeriesWithRelations,
  Member,
} from "@/lib/types";
import { NOTE_SELECT, flattenNote, type NoteRow } from "../query";
import { NoteEditor, type MeetingOption } from "./note-editor";

/**
 * Rentang rapat yang ditawarkan sebagai pilihan tautan: sebulan ke
 * belakang, dua bulan ke depan.
 *
 * Rapat berulang tanpa tanggal berhenti (lihat migration 005) akan
 * menghasilkan kemunculan sebanyak rentang yang diminta — tanpa batas ini
 * satu seri "tiap hari" sendirian sudah cukup untuk membuat dropdownnya
 * tak terpakai. Notulen ditulis di hari rapatnya atau beberapa hari
 * setelahnya, jadi rentang inilah yang benar-benar dipilih orang.
 */
const MEETING_WINDOW_BACK_DAYS = 30;
const MEETING_WINDOW_FORWARD_DAYS = 60;

function dayKey(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

// Daftar hadir tidak ikut diambil: yang dibutuhkan halaman ini cuma
// "rapat apa, tanggal berapa" untuk mengisi pilihan tautan.
type EventRow = Omit<
  EventSeriesWithRelations,
  "attendees" | "attendee_ids" | "exceptions"
> & {
  event_exceptions: EventException[] | null;
};

export default async function NoteDetailPage({
  params,
}: PageProps<"/notes/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    noteResult,
    membersResult,
    tasksResult,
    eventsResult,
    clientsResult,
    projectsResult,
    documentsResult,
  ] = await Promise.all([
    supabase.from("notes").select(NOTE_SELECT).eq("id", id).maybeSingle(),
    supabase.from("profiles").select("id, full_name, color").order("full_name"),
    // Cuma tugas yang masih berjalan: menautkan catatan ke tugas yang
    // sudah selesai berbulan-bulan lalu hampir tidak pernah yang dimaksud,
    // dan daftarnya jadi panjang tanpa guna.
    supabase
      .from("tasks")
      .select("id, title")
      .neq("status", "done")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("events")
      .select(`*, event_exceptions(*)`)
      .order("event_date", { ascending: true }),
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("projects").select("id, name, client_id").order("name"),
    supabase
      .from("documents")
      .select("*")
      .eq("note_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!noteResult.data) notFound();

  const note = flattenNote(noteResult.data as unknown as NoteRow);

  // Seri rapat dibentangkan jadi kemunculan satu per satu: yang ditautkan
  // catatan adalah "Standup 12 Agustus", bukan seri "Standup" seluruhnya.
  const series: EventSeriesWithRelations[] = (
    (eventsResult.data ?? []) as unknown as EventRow[]
  ).map(({ event_exceptions, ...row }) => ({
    ...row,
    attendees: [],
    attendee_ids: [],
    exceptions: event_exceptions ?? [],
  }));

  const meetings: MeetingOption[] = expandOccurrences(
    series,
    dayKey(-MEETING_WINDOW_BACK_DAYS),
    dayKey(MEETING_WINDOW_FORWARD_DAYS),
  )
    // Yang terdekat dengan hari ini di atas — rapat yang baru saja selesai
    // adalah yang paling sering dinotulenkan.
    .sort((a, b) => b.occurrenceDate.localeCompare(a.occurrenceDate))
    .map((occurrence) => ({
      eventId: occurrence.series.id,
      occurrenceDate: occurrence.occurrenceDate,
      label: `${occurrence.title} — ${formatDate(occurrence.occurrenceDate)}`,
    }));

  return (
    <NoteEditor
      note={note}
      members={(membersResult.data ?? []) as Member[]}
      tasks={tasksResult.data ?? []}
      meetings={meetings}
      clients={clientsResult.data ?? []}
      projects={projectsResult.data ?? []}
      documents={(documentsResult.data ?? []) as Document[]}
    />
  );
}

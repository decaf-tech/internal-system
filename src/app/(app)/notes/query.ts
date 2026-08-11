import type {
  Member,
  NoteEventRef,
  NoteWithRelations,
  Task,
} from "@/lib/types";

/**
 * Satu bentuk query untuk catatan, dipakai daftar maupun halaman editor.
 *
 * Dua penunjuk ke `profiles` (pembuat & penyunting terakhir) harus disebut
 * lewat nama constraint-nya — tanpa itu Supabase tidak tahu relasi yang
 * mana yang dimaksud dan menolak query-nya.
 */
export const NOTE_SELECT = `*,
   client:clients(id, name),
   project:projects(id, name),
   author:profiles!notes_created_by_fkey(id, full_name, color),
   editor:profiles!notes_updated_by_fkey(id, full_name, color),
   note_participants(profile:profiles(id, full_name, color)),
   note_tasks(task:tasks(id, title)),
   note_events(event_id, occurrence_date, event:events(id, title))`;

/** Bentuk mentah dari Supabase, sebelum relasinya diratakan. */
export type NoteRow = Omit<
  NoteWithRelations,
  "participants" | "participant_ids" | "tasks" | "task_ids" | "events"
> & {
  note_participants: { profile: Member | null }[] | null;
  note_tasks: { task: Pick<Task, "id" | "title"> | null }[] | null;
  note_events: NoteEventRef[] | null;
};

export function flattenNote(row: NoteRow): NoteWithRelations {
  const { note_participants, note_tasks, note_events, ...note } = row;

  const participants = (note_participants ?? [])
    .map((entry) => entry.profile)
    .filter((member): member is Member => member !== null);

  const tasks = (note_tasks ?? [])
    .map((entry) => entry.task)
    .filter((task): task is Pick<Task, "id" | "title"> => task !== null);

  // Diurutkan supaya "rapat mana saja" terbaca sebagai urutan waktu, bukan
  // urutan penulisan barisnya di database.
  const events = [...(note_events ?? [])].sort((a, b) =>
    a.occurrence_date.localeCompare(b.occurrence_date),
  );

  return {
    ...note,
    participants,
    participant_ids: participants.map((member) => member.id),
    tasks,
    task_ids: tasks.map((task) => task.id),
    events,
  };
}

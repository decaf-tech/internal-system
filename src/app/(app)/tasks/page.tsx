import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import {
  TASK_STATUS_ORDER,
  type BoardColumn,
  type Document,
  type EventException,
  type EventSeriesWithRelations,
  type Label,
  type Member,
  type NoteSummary,
  type TaskWithRelations,
} from "@/lib/types";
import { NewTaskButton, TaskWorkspace } from "./task-workspace";
import type { TaskFormOptions } from "./task-form";

/** Bentuk mentah baris tugas dari Supabase, sebelum relasinya diratakan. */
type TaskRow = Omit<
  TaskWithRelations,
  "label_ids" | "assignees" | "assignee_ids" | "notes" | "documents"
> & {
  task_labels: { label_id: string }[] | null;
  task_assignees: { profile: Member | null }[] | null;
  note_tasks: { note: NoteSummary | null }[] | null;
  documents: Document[] | null;
};

type EventRow = Omit<
  EventSeriesWithRelations,
  "attendees" | "attendee_ids" | "exceptions"
> & {
  event_attendees: { profile: Member | null }[] | null;
  event_exceptions: EventException[] | null;
};

export default async function TasksPage() {
  const supabase = await createClient();

  const [
    tasksResult,
    membersResult,
    clientsResult,
    projectsResult,
    columnsResult,
    labelsResult,
    eventsResult,
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        `*,
         client:clients(id, name),
         project:projects(id, name),
         task_labels(label_id),
         task_assignees(profile:profiles(id, full_name, color)),
         note_tasks(note:notes(id, title, kind, updated_at)),
         documents(*)`,
      )
      .order("position", { ascending: true }),
    supabase.from("profiles").select("id, full_name, color").order("full_name"),
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("projects").select("id, name, client_id").order("name"),
    supabase.from("board_columns").select("status, wip_limit"),
    supabase.from("labels").select("*").order("position"),
    supabase
      .from("events")
      .select(
        `*,
         event_attendees(profile:profiles(id, full_name, color)),
         event_exceptions(*)`,
      )
      .order("event_date", { ascending: true }),
  ]);

  // Relasi banyak-ke-banyak datang sebagai daftar objek; diratakan jadi
  // daftar id/objek yang langsung dipakai komponen di bawahnya, dan supaya
  // yang dikirim ke browser lebih ringkas.
  const tasks: TaskWithRelations[] = (
    (tasksResult.data ?? []) as unknown as TaskRow[]
  ).map(({ task_labels, task_assignees, note_tasks, documents, ...task }) => {
    const assignees = (task_assignees ?? [])
      .map((row) => row.profile)
      .filter((member): member is Member => member !== null);

    return {
      ...task,
      label_ids: (task_labels ?? []).map((row) => row.label_id),
      assignees,
      assignee_ids: assignees.map((member) => member.id),
      notes: (note_tasks ?? [])
        .map((row) => row.note)
        .filter((note): note is NoteSummary => note !== null),
      documents: documents ?? [],
    };
  });

  const events: EventSeriesWithRelations[] = (
    (eventsResult.data ?? []) as unknown as EventRow[]
  ).map(({ event_attendees, event_exceptions, ...series }) => {
    const attendees = (event_attendees ?? [])
      .map((row) => row.profile)
      .filter((member): member is Member => member !== null);

    return {
      ...series,
      attendees,
      attendee_ids: attendees.map((member) => member.id),
      exceptions: event_exceptions ?? [],
    };
  });

  // Kalau tabel board_columns belum ada isinya (migration belum jalan),
  // papan tetap tampil — semua kolom sekadar tanpa batas WIP.
  const stored = new Map(
    (columnsResult.data ?? []).map((row) => [row.status, row.wip_limit]),
  );
  const columns: BoardColumn[] = TASK_STATUS_ORDER.map((status) => ({
    status,
    wip_limit: stored.get(status) ?? null,
  }));

  const options: TaskFormOptions = {
    members: membersResult.data ?? [],
    clients: clientsResult.data ?? [],
    projects: projectsResult.data ?? [],
    labels: (labelsResult.data ?? []) as Label[],
  };

  return (
    <>
      <PageHeader
        eyebrow="02 · Tugas"
        title="Papan Tugas"
        description="Apa yang harus, sedang, dan sudah dikerjakan tim — plus rapat rutin."
        action={<NewTaskButton options={options} />}
      />

      <TaskWorkspace
        tasks={tasks}
        columns={columns}
        events={events}
        options={options}
      />
    </>
  );
}

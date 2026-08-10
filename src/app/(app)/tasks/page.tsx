import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import {
  TASK_STATUS_ORDER,
  type BoardColumn,
  type TaskWithRelations,
} from "@/lib/types";
import { NewTaskButton, TaskWorkspace } from "./task-workspace";
import type { TaskFormOptions } from "./task-form";

export default async function TasksPage() {
  const supabase = await createClient();

  const [
    tasksResult,
    membersResult,
    clientsResult,
    projectsResult,
    columnsResult,
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        `*,
         assignee:profiles!tasks_assignee_id_fkey(id, full_name),
         client:clients(id, name),
         project:projects(id, name)`,
      )
      .order("position", { ascending: true }),
    supabase.from("profiles").select("id, full_name").order("full_name"),
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("projects").select("id, name, client_id").order("name"),
    supabase.from("board_columns").select("status, wip_limit"),
  ]);

  const tasks = (tasksResult.data ?? []) as unknown as TaskWithRelations[];

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
  };

  return (
    <>
      <PageHeader
        eyebrow="02 · Tugas"
        title="Papan Tugas"
        description="Apa yang harus, sedang, dan sudah dikerjakan tim."
        action={<NewTaskButton options={options} />}
      />

      <TaskWorkspace tasks={tasks} columns={columns} options={options} />
    </>
  );
}

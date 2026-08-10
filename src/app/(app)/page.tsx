import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { TaskStatusBadge } from "@/components/badge";
import { formatRelativeDue, formatRupiah } from "@/lib/format";
import {
  TASK_STATUS_ORDER,
  type TaskStatus,
  type TaskWithRelations,
} from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const current = await getCurrentUser();
  const name = current?.profile?.full_name?.split(" ")[0] ?? "Tim";

  const today = new Date().toISOString().slice(0, 10);

  const [tasksResult, pendingExpensesResult, clientsResult] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        `*,
         assignee:profiles!tasks_assignee_id_fkey(id, full_name),
         client:clients(id, name),
         project:projects(id, name)`,
      )
      .neq("status", "done")
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("expenses").select("amount").eq("status", "pending"),
    supabase.from("clients").select("id", { count: "exact" }).eq("status", "active"),
  ]);

  const openTasks = (tasksResult.data ?? []) as unknown as TaskWithRelations[];

  const countByStatus = new Map<TaskStatus, number>(
    TASK_STATUS_ORDER.map((status) => [status, 0]),
  );
  for (const task of openTasks) {
    countByStatus.set(task.status, (countByStatus.get(task.status) ?? 0) + 1);
  }

  // Yang paling perlu dilihat pagi hari: tugas yang sudah lewat tenggat
  // atau jatuh tempo hari ini.
  const urgent = openTasks.filter(
    (task) => task.due_date && task.due_date <= today,
  );

  const upcoming = openTasks
    .filter((task) => task.due_date && task.due_date > today)
    .slice(0, 6);

  const mine = current
    ? openTasks.filter((task) => task.assignee_id === current.user.id)
    : [];

  const pendingExpenseTotal = (pendingExpensesResult.data ?? []).reduce(
    (sum, expense) => sum + Number(expense.amount),
    0,
  );

  return (
    <>
      <PageHeader
        eyebrow="Dasbor"
        title={`Halo, ${name}`}
        description="Ringkasan apa yang sedang berjalan hari ini."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Tugas Aktif"
          value={String(openTasks.length)}
          hint={`${countByStatus.get("in_progress") ?? 0} sedang dikerjakan`}
        />
        <Stat
          label="Tugas Saya"
          value={String(mine.length)}
          hint="ditugaskan ke kamu"
        />
        <Stat
          label="Klien Aktif"
          value={String(clientsResult.count ?? 0)}
          hint="status aktif"
        />
        <Stat
          label="Reimburse Menunggu"
          value={formatRupiah(pendingExpenseTotal)}
          hint="belum disetujui"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TaskList
          title="Perlu Perhatian"
          emptyText="Tidak ada tugas yang lewat tenggat. Aman."
          tasks={urgent}
        />
        <TaskList
          title="Tenggat Berikutnya"
          emptyText="Belum ada tugas dengan tenggat mendatang."
          tasks={upcoming}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/tasks" className="btn btn-ghost">
          Buka Papan Tugas →
        </Link>
        <Link href="/clients" className="btn btn-ghost">
          Lihat Klien →
        </Link>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="card p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-1.5 font-serif text-2xl text-forest">{value}</p>
      <p className="mt-0.5 text-xs text-ink-subtle">{hint}</p>
    </div>
  );
}

function TaskList({
  title,
  tasks,
  emptyText,
}: {
  title: string;
  tasks: TaskWithRelations[];
  emptyText: string;
}) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-base">{title}</h2>
      {tasks.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-subtle">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-line">
          {tasks.map((task) => {
            const due = formatRelativeDue(task.due_date);
            return (
              <li key={task.id} className="py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="font-mono text-xs text-ink-subtle">
                      {task.client?.name ?? "Internal"}
                      {task.assignee && ` · ${task.assignee.full_name}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <TaskStatusBadge status={task.status} />
                    {due && (
                      <span
                        className={`font-mono text-[11px] ${
                          due.overdue ? "text-danger" : "text-ink-subtle"
                        }`}
                      >
                        {due.text}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

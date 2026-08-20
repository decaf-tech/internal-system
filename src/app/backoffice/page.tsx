import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { TaskStatusBadge } from "@/components/badge";
import { MemberAvatarStack } from "@/components/member-avatar";
import { formatRelativeDue, formatRupiah } from "@/lib/format";
import {
  TASK_STATUS_ORDER,
  type Member,
  type TaskStatus,
  type TaskWithRelations,
} from "@/lib/types";

/** Bentuk mentah baris tugas dari Supabase, sebelum penugasan diratakan. */
type TaskRow = Omit<TaskWithRelations, "assignees" | "assignee_ids"> & {
  task_assignees: { profile: Member | null }[] | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const current = await getCurrentUser();
  const name = current?.profile?.full_name?.split(" ")[0] ?? "Tim";

  const today = new Date().toISOString().slice(0, 10);

  const [
    tasksResult,
    pendingExpensesResult,
    clientsResult,
    outstandingResult,
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        `*,
         client:clients(id, name),
         project:projects(id, name),
         task_assignees(profile:profiles(id, full_name, color))`,
      )
      .neq("status", "done")
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("expenses").select("amount").eq("status", "pending"),
    supabase.from("clients").select("id", { count: "exact" }).eq("status", "active"),
    // Uang yang sudah disepakati tapi belum masuk rekening.
    supabase.from("incomes").select("amount").neq("status", "received"),
  ]);

  const openTasks: TaskWithRelations[] = (
    (tasksResult.data ?? []) as unknown as TaskRow[]
  ).map(({ task_assignees, ...task }) => {
    const assignees = (task_assignees ?? [])
      .map((row) => row.profile)
      .filter((member): member is Member => member !== null);
    return { ...task, assignees, assignee_ids: assignees.map((m) => m.id) };
  });

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
    ? openTasks.filter((task) => task.assignee_ids.includes(current.user.id))
    : [];

  const pendingExpenseTotal = (pendingExpensesResult.data ?? []).reduce(
    (sum, expense) => sum + Number(expense.amount),
    0,
  );

  const outstandingIncome = (outstandingResult.data ?? []).reduce(
    (sum, income) => sum + Number(income.amount),
    0,
  );

  return (
    <>
      <PageHeader
        eyebrow="Dasbor"
        title={`Halo, ${name}`}
        description="Ringkasan apa yang sedang berjalan hari ini."
      />

      {/* Dua kolom sejak layar tersempit. Lima kartu bertumpuk satu-satu
          berarti daftar "Perlu Perhatian" — alasan halaman ini dibuka —
          baru muncul setelah lima layar penuh gulir di HP. */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
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
          label="Belum Diterima"
          value={formatRupiah(outstandingIncome)}
          hint="deal yang uangnya belum masuk"
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

      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
        <Link href="/backoffice/tasks" className="btn btn-ghost">
          Papan Tugas →
        </Link>
        {/* Ke daftarnya, bukan ke `/backoffice/clients` yang sekarang mendarat di tab
            Pipeline — tombolnya bilang "Lihat Klien". */}
        <Link href="/backoffice/clients/list" className="btn btn-ghost">
          Lihat Klien →
        </Link>
        <Link href="/backoffice/finance" className="btn btn-ghost col-span-2 sm:col-span-1">
          Cashflow →
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
    <div className="card p-3 sm:p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-1.5 font-display text-xl tabular-nums text-forest sm:text-2xl">
        {value}
      </p>
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
                  <div className="flex min-w-0 items-start gap-2">
                    <MemberAvatarStack members={task.assignees} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {task.title}
                      </p>
                      <p className="font-mono text-xs text-ink-subtle">
                        {task.client?.name ?? "Internal"}
                        {task.assignees.length > 0 &&
                          ` · ${task.assignees.map((m) => m.full_name.split(" ")[0]).join(", ")}`}
                      </p>
                    </div>
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

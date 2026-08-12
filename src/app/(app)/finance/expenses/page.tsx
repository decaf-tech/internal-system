import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader } from "@/components/page-header";
import { formatRupiah } from "@/lib/format";
import type { ExpenseWithRelations } from "@/lib/types";
import { FinanceTabs } from "../tabs";
import {
  ExpenseCard,
  NewExpenseButton,
  type ExpenseFormOptions,
} from "./expense-ui";

export default async function ExpensesPage() {
  const supabase = await createClient();

  const [expensesResult, clientsResult, projectsResult] = await Promise.all([
    supabase
      .from("expenses")
      .select(
        `*,
         submitter:profiles!expenses_submitted_by_fkey(id, full_name),
         reviewer:profiles!expenses_reviewed_by_fkey(id, full_name),
         client:clients(id, name),
         documents(*)`,
      )
      .order("expense_date", { ascending: false }),
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("projects").select("id, name, client_id").order("name"),
  ]);

  const expenses = (expensesResult.data ??
    []) as unknown as ExpenseWithRelations[];

  const pendingTotal = expenses
    .filter((expense) => expense.status === "pending")
    .reduce((sum, expense) => sum + Number(expense.amount), 0);

  // Bulan berjalan dibandingkan sebagai string "yyyy-MM" — expense_date
  // memang tanggal tanpa jam, jadi tidak perlu diubah jadi Date (yang malah
  // menyeret zona waktu ikut serta).
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthTotal = expenses
    .filter((expense) => expense.expense_date.startsWith(thisMonth))
    .reduce((sum, expense) => sum + Number(expense.amount), 0);

  const paidTotal = expenses
    .filter(
      (expense) =>
        expense.status === "paid" && expense.expense_date.startsWith(thisMonth),
    )
    .reduce((sum, expense) => sum + Number(expense.amount), 0);

  const options: ExpenseFormOptions = {
    clients: clientsResult.data ?? [],
    projects: projectsResult.data ?? [],
  };

  return (
    <>
      <PageHeader
        eyebrow="03 · Keuangan"
        title="Pengeluaran & Reimburse"
        description="Catatan pengeluaran tim beserta struknya."
        action={<NewExpenseButton options={options} />}
      />

      <FinanceTabs active="/finance/expenses" />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Menunggu Persetujuan"
          value={formatRupiah(pendingTotal)}
        />
        <SummaryCard label="Total Bulan Ini" value={formatRupiah(monthTotal)} />
        <SummaryCard
          label="Kas Keluar Bulan Ini"
          value={formatRupiah(paidTotal)}
          hint="hanya yang berstatus Dibayar"
        />
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          title="Belum ada pengeluaran"
          description="Catat pengeluaran pertama beserta struknya supaya pembukuan akhir bulan tidak perlu mengingat-ingat."
        />
      ) : (
        <ul className="card overflow-hidden">
          {expenses.map((expense) => (
            <ExpenseCard key={expense.id} expense={expense} />
          ))}
        </ul>
      )}
    </>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card p-3 sm:p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-1.5 font-serif text-lg tabular-nums text-forest sm:text-xl">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-subtle">{hint}</p>}
    </div>
  );
}

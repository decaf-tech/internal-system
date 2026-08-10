import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader } from "@/components/page-header";
import { formatRupiah } from "@/lib/format";
import type { ExpenseWithRelations } from "@/lib/types";
import { ExpenseRow, NewExpenseButton } from "./expense-ui";

export default async function ExpensesPage() {
  const supabase = await createClient();

  const [expensesResult, clientsResult] = await Promise.all([
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
  ]);

  const expenses = (expensesResult.data ?? []) as unknown as ExpenseWithRelations[];

  const pendingTotal = expenses
    .filter((expense) => expense.status === "pending")
    .reduce((sum, expense) => sum + Number(expense.amount), 0);

  const monthTotal = expenses
    .filter((expense) => {
      const date = new Date(expense.expense_date);
      const now = new Date();
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, expense) => sum + Number(expense.amount), 0);

  return (
    <>
      <PageHeader
        eyebrow="03 · Keuangan"
        title="Pengeluaran & Reimburse"
        description="Catatan pengeluaran tim beserta struknya."
        action={<NewExpenseButton clients={clientsResult.data ?? []} />}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <SummaryCard
          label="Menunggu Persetujuan"
          value={formatRupiah(pendingTotal)}
        />
        <SummaryCard label="Total Bulan Ini" value={formatRupiah(monthTotal)} />
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          title="Belum ada pengeluaran"
          description="Catat pengeluaran pertama beserta struknya supaya pembukuan akhir bulan tidak perlu mengingat-ingat."
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-3xl text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-muted">
                <Th>Keterangan</Th>
                <Th>Jumlah</Th>
                <Th>Tanggal</Th>
                <Th>Diajukan</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <ExpenseRow key={expense.id} expense={expense} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-1.5 font-serif text-2xl text-forest">{value}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="eyebrow px-3 py-2.5 font-normal">{children}</th>;
}

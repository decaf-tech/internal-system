import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader } from "@/components/page-header";
import { formatRupiah } from "@/lib/format";
import { todayKey } from "@/lib/date-range";
import type { IncomeWithRelations } from "@/lib/types";
import { FinanceTabs } from "../tabs";
import {
  IncomeCard,
  NewIncomeButton,
  type IncomeFormOptions,
} from "./income-ui";

export default async function IncomePage() {
  const supabase = await createClient();

  const [incomesResult, clientsResult, projectsResult] = await Promise.all([
    supabase
      .from("incomes")
      .select(
        `*,
         client:clients(id, name),
         project:projects(id, name),
         recorder:profiles!incomes_recorded_by_fkey(id, full_name)`,
      )
      // Yang belum diterima diletakkan lebih dulu lewat urutan status
      // (planned < invoiced < received secara enum), lalu tanggal terbaru.
      .order("status", { ascending: true })
      .order("due_date", { ascending: false }),
    supabase.from("clients").select("id, name").order("name"),
    supabase
      .from("projects")
      .select("id, name, client_id, deal_value")
      .order("name"),
  ]);

  const incomes = (incomesResult.data ?? []) as unknown as IncomeWithRelations[];

  const received = incomes
    .filter((income) => income.status === "received")
    .reduce((sum, income) => sum + Number(income.amount), 0);

  const waiting = incomes
    .filter((income) => income.status !== "received")
    .reduce((sum, income) => sum + Number(income.amount), 0);

  const today = todayKey();
  const overdue = incomes.filter(
    (income) => income.status === "invoiced" && income.due_date < today,
  );

  const options: IncomeFormOptions = {
    clients: clientsResult.data ?? [],
    projects: projectsResult.data ?? [],
  };

  return (
    <>
      <PageHeader
        eyebrow="03 · Keuangan"
        title="Pemasukan"
        description="Deal yang sudah disepakati, ditagih, dan yang uangnya sudah masuk."
        action={<NewIncomeButton options={options} />}
      />

      <FinanceTabs active="/finance/income" />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryCard label="Total Diterima" value={formatRupiah(received)} />
        <SummaryCard label="Menunggu Masuk" value={formatRupiah(waiting)} />
        <SummaryCard
          label="Lewat Jatuh Tempo"
          value={String(overdue.length)}
          hint={
            overdue.length > 0
              ? formatRupiah(
                  overdue.reduce((sum, item) => sum + Number(item.amount), 0),
                )
              : "aman"
          }
        />
      </div>

      {incomes.length === 0 ? (
        <EmptyState
          title="Belum ada pemasukan"
          description="Catat deal yang sudah disepakati — termasuk yang uangnya belum masuk — supaya sisa tagihan tiap project ketahuan tanpa membuka chat lama."
        />
      ) : (
        <ul className="card overflow-hidden">
          {incomes.map((income) => (
            <IncomeCard key={income.id} income={income} options={options} />
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

import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { formatRupiah, formatRupiahShort } from "@/lib/format";
import { parseKey } from "@/lib/date-range";
import type { CashflowMonth } from "@/lib/types";
import { FinanceTabs } from "./tabs";

/** Berapa bulan terakhir yang digambar di grafik batang. */
const MONTHS_SHOWN = 6;

type DealRow = {
  id: string;
  name: string;
  deal_value: number | null;
  client: { name: string } | null;
};

export default async function FinanceOverviewPage() {
  const supabase = await createClient();

  const [cashflow, outstandingResult, dealsResult, receivedResult] =
    await Promise.all([
      loadCashflow(supabase),
      // Uang yang sudah disepakati tapi belum masuk — angka yang paling
      // sering ditanyakan setelah "bulan ini masuk berapa".
      supabase
        .from("incomes")
        .select("amount, status, due_date")
        .neq("status", "received"),
      supabase
        .from("projects")
        .select("id, name, deal_value, client:clients(name)")
        .not("deal_value", "is", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("incomes")
        .select("project_id, amount")
        .eq("status", "received")
        .not("project_id", "is", null),
    ]);

  const outstanding = (outstandingResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0,
  );

  const today = new Date().toISOString().slice(0, 10);
  const overdueInvoices = (outstandingResult.data ?? []).filter(
    (row) => row.status === "invoiced" && row.due_date < today,
  );

  // Berapa yang sudah benar-benar diterima per project — pasangan dari
  // nilai deal, supaya "sisa tagihan" bisa dihitung tanpa query per baris.
  const receivedByProject = new Map<string, number>();
  for (const row of receivedResult.data ?? []) {
    if (!row.project_id) continue;
    receivedByProject.set(
      row.project_id,
      (receivedByProject.get(row.project_id) ?? 0) + Number(row.amount),
    );
  }

  const months = lastMonths(cashflow, MONTHS_SHOWN);
  const current = months[months.length - 1];
  const peak = Math.max(
    1,
    ...months.map((month) => Math.max(month.cash_in, month.cash_out)),
  );

  const deals = (dealsResult.data ?? []) as unknown as DealRow[];

  return (
    <>
      <PageHeader
        eyebrow="03 · Keuangan"
        title="Cashflow"
        description="Uang yang masuk, uang yang keluar, dan sisanya."
      />

      <FinanceTabs active="/finance" />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Kas Masuk Bulan Ini"
          value={formatRupiah(current.cash_in)}
          tone="forest"
        />
        <Stat
          label="Kas Keluar Bulan Ini"
          value={formatRupiah(current.cash_out)}
          tone="danger"
        />
        <Stat
          label="Selisih Bulan Ini"
          value={formatRupiah(current.net)}
          tone={current.net < 0 ? "danger" : "forest"}
          hint={current.net < 0 ? "keluar lebih besar dari masuk" : undefined}
        />
        <Stat
          label="Belum Diterima"
          value={formatRupiah(outstanding)}
          tone="ink"
          hint={
            overdueInvoices.length > 0
              ? `${overdueInvoices.length} tagihan lewat jatuh tempo`
              : "sudah disepakati, belum masuk"
          }
        />
      </div>

      <section className="card mb-5 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base">{MONTHS_SHOWN} Bulan Terakhir</h2>
          <div className="flex items-center gap-3 font-mono text-[10px] text-ink-muted">
            <Legend color="var(--color-forest)" label="MASUK" />
            <Legend color="var(--color-danger)" label="KELUAR" />
          </div>
        </div>

        {/* Grafik batang digambar dengan div ber-tinggi persen, bukan
            pustaka grafik: satu dependensi kurang, tidak ada JavaScript yang
            perlu diunduh, dan di HP tetap tergambar seketika. */}
        <div className="flex items-end gap-2 sm:gap-4">
          {months.map((month) => (
            <div key={month.month} className="flex min-w-0 flex-1 flex-col">
              <div className="flex h-32 items-end justify-center gap-1">
                <Bar
                  value={month.cash_in}
                  peak={peak}
                  color="var(--color-forest)"
                  label={`Masuk ${formatRupiah(month.cash_in)}`}
                />
                <Bar
                  value={month.cash_out}
                  peak={peak}
                  color="var(--color-danger)"
                  label={`Keluar ${formatRupiah(month.cash_out)}`}
                />
              </div>
              <p className="mt-1.5 truncate text-center font-mono text-[10px] text-ink-muted">
                {format(parseKey(month.month), "MMM", { locale: localeId })}
              </p>
              <p
                className={`truncate text-center font-mono text-[10px] ${
                  month.net < 0 ? "text-danger" : "text-ink-subtle"
                }`}
              >
                {formatRupiahShort(month.net)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base">Deal per Project</h2>
          <Link
            href="/finance/income"
            className="text-xs text-accent hover:underline"
          >
            Catat pemasukan →
          </Link>
        </div>

        {deals.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-subtle">
            Belum ada project yang diisi nilai dealnya. Buka halaman klien,
            lalu isi nilai deal di project yang bersangkutan.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {deals.map((deal) => {
              const value = Number(deal.deal_value ?? 0);
              const received = receivedByProject.get(deal.id) ?? 0;
              const percent =
                value > 0 ? Math.min(100, (received / value) * 100) : 0;

              return (
                <li key={deal.id} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {deal.name}
                      </p>
                      <p className="truncate font-mono text-[11px] text-ink-subtle">
                        {deal.client?.name ?? "Tanpa klien"}
                      </p>
                    </div>
                    <p className="font-mono text-xs whitespace-nowrap text-ink-muted">
                      {formatRupiah(received)}{" "}
                      <span className="text-ink-subtle">
                        / {formatRupiah(value)}
                      </span>
                    </p>
                  </div>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                    <div
                      className="h-full rounded-full bg-forest"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {received < value && (
                    <p className="mt-1 font-mono text-[10px] text-ink-subtle">
                      sisa {formatRupiah(value - received)}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

/**
 * Rekap bulanan diambil dari view `cashflow_monthly` (migration 003).
 * Kalau viewnya belum ada — migrationnya belum dijalankan — hitung sendiri
 * dari tabelnya. Halaman tetap benar, cuma sedikit lebih boros; lebih baik
 * begitu daripada satu halaman yang mati total karena satu view.
 */
async function loadCashflow(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<CashflowMonth[]> {
  const { data, error } = await supabase
    .from("cashflow_monthly")
    .select("*")
    .order("month", { ascending: true });

  if (!error && data) {
    return data.map((row) => ({
      month: String(row.month),
      cash_in: Number(row.cash_in),
      cash_out: Number(row.cash_out),
      net: Number(row.net),
    }));
  }

  const [incomes, expenses] = await Promise.all([
    supabase
      .from("incomes")
      .select("received_date, amount")
      .eq("status", "received"),
    supabase.from("expenses").select("expense_date, amount").eq("status", "paid"),
  ]);

  const buckets = new Map<string, CashflowMonth>();

  function bucket(date: string) {
    const month = `${date.slice(0, 7)}-01`;
    let entry = buckets.get(month);
    if (!entry) {
      entry = { month, cash_in: 0, cash_out: 0, net: 0 };
      buckets.set(month, entry);
    }
    return entry;
  }

  for (const row of incomes.data ?? []) {
    if (!row.received_date) continue;
    bucket(row.received_date).cash_in += Number(row.amount);
  }
  for (const row of expenses.data ?? []) {
    bucket(row.expense_date).cash_out += Number(row.amount);
  }

  return [...buckets.values()]
    .map((entry) => ({ ...entry, net: entry.cash_in - entry.cash_out }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Deret bulan yang selalu utuh sampai bulan berjalan — bulan tanpa transaksi
 * tetap muncul sebagai celah kosong. Kalau bulan sepi dilewati begitu saja,
 * grafiknya berbohong: dua batang bersebelahan terlihat seperti dua bulan
 * berurutan padahal jaraknya bisa setengah tahun.
 */
function lastMonths(rows: CashflowMonth[], count: number): CashflowMonth[] {
  const byMonth = new Map(rows.map((row) => [row.month, row]));
  const now = new Date();
  const result: CashflowMonth[] = [];

  for (let back = count - 1; back >= 0; back -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const key = format(date, "yyyy-MM-01");
    result.push(
      byMonth.get(key) ?? { month: key, cash_in: 0, cash_out: 0, net: 0 },
    );
  }

  return result;
}

function Bar({
  value,
  peak,
  color,
  label,
}: {
  value: number;
  peak: number;
  color: string;
  label: string;
}) {
  // Batang bernilai nol tetap digambar setinggi 2px sebagai garis dasar,
  // supaya kolom bulan itu tidak terlihat "hilang".
  const height = value === 0 ? 2 : Math.max(4, (value / peak) * 100);

  return (
    <div
      title={label}
      style={{
        height: value === 0 ? "2px" : `${height}%`,
        backgroundColor: value === 0 ? "var(--color-line-strong)" : color,
      }}
      className="w-3 rounded-t-sm sm:w-4"
    />
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "forest" | "danger" | "ink";
}) {
  const color =
    tone === "forest"
      ? "text-forest"
      : tone === "danger"
        ? "text-danger"
        : "text-ink";

  return (
    <div className="card p-4">
      <p className="eyebrow">{label}</p>
      <p className={`mt-1.5 font-serif text-xl ${color}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-subtle">{hint}</p>}
    </div>
  );
}

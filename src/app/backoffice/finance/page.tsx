import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import {
  formatDate,
  formatRupiah,
  formatRupiahShort,
  todayJakarta,
} from "@/lib/format";
import { parseKey } from "@/lib/date-range";
import {
  BILLING_PERIOD_UNIT,
  CONTRACT_RENEWAL_WARNING_DAYS,
  contractDaysLeft,
  contractEndDate,
  contractValue,
  isSubscription,
  monthlyValue,
} from "@/lib/billing";
import type { BillingScheme } from "@/lib/billing";
import type { CashflowMonth, ProjectStatus } from "@/lib/types";
import { FinanceTabs } from "./tabs";
import { FinanceQuickActions } from "./quick-actions";

/** Berapa bulan terakhir yang digambar di grafik batang. */
const MONTHS_SHOWN = 6;

/**
 * Bentuk baris project untuk dua daftar di halaman ini. Tiga kolom skema ikut
 * dibawa karena `deal_value` sendirian tidak lagi cukup: untuk langganan ia
 * cuma nilai satu periode tagih (migration 010), dan nilai penuh kontraknya
 * dihitung `contractValue`.
 */
type DealRow = BillingScheme & {
  id: string;
  name: string;
  deal_value: number | null;
  status: ProjectStatus;
  start_date: string | null;
  client: { name: string } | null;
};

/** Project langganan yang kontraknya belum berakhir & belum dibatalkan. */
function isRunningSubscription(project: DealRow, today: string) {
  if (!isSubscription(project)) return false;
  if (project.status === "cancelled") return false;

  const end = contractEndDate(project.start_date, project);
  // Kontrak tanpa tanggal mulai tetap dihitung berjalan: yang belum diisi
  // adalah datanya, bukan langganannya — dan menyembunyikannya dari daftar
  // ini justru membuat kekurangan itu makin sulit ketahuan.
  return end === null || end >= today;
}

export default async function FinanceOverviewPage() {
  const supabase = await createClient();

  const [
    cashflow,
    outstandingResult,
    dealsResult,
    receivedResult,
    clientsResult,
    projectsResult,
  ] = await Promise.all([
    loadCashflow(supabase),
    // Uang yang sudah disepakati tapi belum masuk — angka yang paling
    // sering ditanyakan setelah "bulan ini masuk berapa".
    supabase
      .from("incomes")
      .select("amount, status, due_date")
      .neq("status", "received"),
    supabase
      .from("projects")
      .select(
        `id, name, deal_value, status, start_date,
         billing_type, billing_period, contract_months,
         client:clients(name)`,
      )
      .not("deal_value", "is", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("incomes")
      .select("project_id, amount")
      .eq("status", "received")
      .not("project_id", "is", null),
    // Isi dropdown kedua form catat. Satu query melayani keduanya —
    // form pemasukan memakai `deal_value`, form pengeluaran tidak.
    supabase.from("clients").select("id, name").order("name"),
    supabase
      .from("projects")
      .select(
        "id, name, client_id, deal_value, billing_type, billing_period, contract_months",
      )
      .order("name"),
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

  // Langganan yang masih berjalan, plus pendapatan berulang bulanannya
  // (MRR). Dihitung dari `deals` yang sudah ada di tangan, bukan lewat query
  // kelima — semuanya baris yang sama, cuma disaring berbeda.
  const todayJkt = todayJakarta();
  const subscriptions = deals.filter((deal) =>
    isRunningSubscription(deal, todayJkt),
  );
  const recurringMonthly = subscriptions.reduce(
    (sum, deal) => sum + monthlyValue(deal, deal.deal_value),
    0,
  );
  const expiringSoon = subscriptions.filter((deal) => {
    const left = contractDaysLeft(
      contractEndDate(deal.start_date, deal),
      todayJkt,
    );
    return left !== null && left <= CONTRACT_RENEWAL_WARNING_DAYS;
  });

  const clients = clientsResult.data ?? [];
  const projects = projectsResult.data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="03 · Keuangan"
        title="Cashflow"
        description="Uang yang masuk, uang yang keluar, dan sisanya."
        action={
          <FinanceQuickActions
            incomeOptions={{ clients, projects }}
            expenseOptions={{ clients, projects }}
          />
        }
      />

      <FinanceTabs active="/backoffice/finance" />

      {/* Dua kolom sejak layar tersempit: empat kartu bertumpuk satu-satu
          mendorong grafiknya ke bawah lipatan, dan yang dicari orang saat
          membuka halaman ini justru "bulan ini bagaimana" — bukan salah
          satu angkanya sendirian. */}
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-5">
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
        {/* Pendapatan berulang berdiri sebagai kartu sendiri, bukan dilebur
            ke "kas masuk": kas masuk bulan ini menjawab apa yang sudah
            terjadi, angka ini menjawab berapa yang datang lagi bulan depan
            tanpa deal baru — dan itu pertanyaan yang berbeda. */}
        <Stat
          label="Pendapatan Berulang"
          value={`${formatRupiah(recurringMonthly)}/bln`}
          tone="forest"
          hint={
            subscriptions.length === 0
              ? "belum ada langganan berjalan"
              : expiringSoon.length > 0
                ? `${subscriptions.length} langganan · ${expiringSoon.length} perlu diperpanjang`
                : `dari ${subscriptions.length} langganan berjalan`
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
              {/* Judul bulan + kedua nilainya dititipkan ke satu label di
                  induknya, bukan ke atribut `title` tiap batang: `title`
                  cuma muncul saat kursor berhenti di atasnya, dan di HP
                  tidak ada kursor yang bisa berhenti di mana pun. */}
              <div
                role="img"
                aria-label={`${format(parseKey(month.month), "MMMM yyyy", {
                  locale: localeId,
                })}: masuk ${formatRupiah(
                  month.cash_in,
                )}, keluar ${formatRupiah(month.cash_out)}`}
                className="flex h-32 items-end justify-center gap-1"
              >
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

      {/* Cuma tampil kalau ada langganannya. Untuk tim yang semua dealnya
          sekali bayar, kartu kosong berjudul "Langganan Berjalan" tidak
          memberi tahu apa pun yang belum kelihatan di daftar di bawahnya. */}
      {subscriptions.length > 0 && (
        <section className="card mb-5 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base">Langganan Berjalan</h2>
            <p className="font-mono text-[11px] text-ink-subtle">
              {formatRupiah(recurringMonthly)}/bulan · {formatRupiah(recurringMonthly * 12)}/tahun
            </p>
          </div>

          <ul className="divide-y divide-line">
            {subscriptions.map((deal) => {
              const end = contractEndDate(deal.start_date, deal);
              const daysLeft = contractDaysLeft(end, todayJkt);
              const soon =
                daysLeft !== null && daysLeft <= CONTRACT_RENEWAL_WARNING_DAYS;

              return (
                <li
                  key={deal.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{deal.name}</p>
                    <p className="truncate font-mono text-[11px] text-ink-subtle">
                      {deal.client?.name ?? "Tanpa klien"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-mono text-xs whitespace-nowrap text-ink-muted">
                      {formatRupiah(Number(deal.deal_value ?? 0))}
                      <span className="text-ink-subtle">
                        /
                        {deal.billing_period
                          ? BILLING_PERIOD_UNIT[deal.billing_period]
                          : "periode"}
                      </span>
                    </p>
                    <p
                      className={`font-mono text-[10px] ${
                        soon ? "text-danger" : "text-ink-subtle"
                      }`}
                    >
                      {end === null
                        ? "tanggal mulai belum diisi"
                        : daysLeft !== null && daysLeft < 0
                          ? `berakhir ${formatDate(end)}`
                          : `s/d ${formatDate(end)}${
                              daysLeft !== null ? ` · ${daysLeft} hari` : ""
                            }`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base">Deal per Project</h2>
          {/* Label lamanya "Catat pemasukan", padahal tautannya membuka
              daftar — bukan formnya. Sekarang formnya memang ada di
              kepala halaman ini, jadi tautannya cukup jujur saja. */}
          <Link
            href="/backoffice/finance/income"
            className="-mr-2 rounded px-2 py-2 text-xs text-accent hover:underline"
          >
            Semua pemasukan →
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
              // Nilai PENUH kontrak, bukan `deal_value` mentah: untuk
              // langganan yang kedua adalah harga satu periode, dan batang
              // kemajuannya akan penuh setelah satu tagihan saja.
              const value = contractValue(deal, deal.deal_value) ?? 0;
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
                        {isSubscription(deal) && deal.billing_period && (
                          <>
                            {" · "}
                            {formatRupiahShort(Number(deal.deal_value ?? 0))}/
                            {BILLING_PERIOD_UNIT[deal.billing_period]} ×{" "}
                            {deal.contract_months} bln
                          </>
                        )}
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
    <div className="card p-3 sm:p-4">
      <p className="eyebrow">{label}</p>
      {/* tabular-nums: tanpa itu, angka rupiah di empat kartu bersebelahan
          punya lebar digit yang berbeda-beda dan barisnya terlihat goyah. */}
      <p className={`mt-1.5 font-display text-lg tabular-nums sm:text-xl ${color}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-ink-subtle">{hint}</p>}
    </div>
  );
}

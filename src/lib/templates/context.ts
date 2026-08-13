import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CompanySettings } from "@/lib/company";
import { formatDate, formatRupiah, todayJakarta } from "@/lib/format";
import { parseKey } from "@/lib/date-range";
import {
  BILLING_PERIOD_UNIT,
  billingSchedule,
  contractEndDate,
  contractValue,
  isSubscription,
  schemeSummary,
} from "@/lib/billing";
import { INCOME_CATEGORY_LABEL } from "@/lib/types";
import type { DocumentLink } from "@/lib/documents/types";
import { formatDocNumber, ROMAN_MONTHS, terbilang } from "./format";
import { AUTO_PLACEHOLDER_KEYS } from "./types";

/**
 * Perakit nilai placeholder otomatis.
 *
 * Satu tempat yang menjawab "dokumen ini tahu apa tentang dunianya",
 * dipakai oleh pratinjau di form maupun oleh pembuatan dokumen aslinya —
 * jadi apa yang dilihat orang di form persis yang masuk ke dokumennya.
 *
 * Aturan yang dipegang: setiap key di `AUTO_PLACEHOLDER_KEYS` SELALU
 * dihasilkan, walau isinya string kosong. Placeholder yang tidak
 * dihasilkan akan tertinggal utuh sebagai "{{klien.alamat}}" di dokumen
 * final — jauh lebih memalukan daripada kolom yang kosong.
 */

type ClientRow = {
  name: string;
  company: string | null;
  contact_person: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
};

type ProjectRow = {
  name: string;
  description: string | null;
  deal_value: number | null;
  billing_type: "one_time" | "subscription";
  billing_period: "monthly" | "quarterly" | "yearly" | null;
  contract_months: number | null;
  start_date: string | null;
};

type TaskRow = {
  title: string;
  due_date: string | null;
  client_id: string | null;
  project_id: string | null;
};

type IncomeRow = {
  title: string;
  amount: number;
  category: keyof typeof INCOME_CATEGORY_LABEL;
  due_date: string;
  client_id: string | null;
  project_id: string | null;
};

type ExpenseRow = {
  title: string;
  amount: number;
  expense_date: string;
  client_id: string | null;
  project_id: string | null;
};

export type PlaceholderSources = {
  client: ClientRow | null;
  project: ProjectRow | null;
  task: TaskRow | null;
  income: IncomeRow | null;
  expense: ExpenseRow | null;
};

/**
 * Kumpulkan entitas yang dirujuk sebuah tautan dokumen.
 *
 * Klien dan project tidak harus disebut langsung: dokumen yang menempel
 * ke sebuah tagihan sudah cukup untuk tahu kliennya siapa. Itu yang
 * membuat template yang sama bisa dipakai dari mana pun panel dokumen
 * dipasang, tanpa tiap tempat harus repot melengkapi tautannya.
 */
export async function loadSources(
  link: DocumentLink,
): Promise<PlaceholderSources> {
  const supabase = await createClient();

  const [task, income, expense, note] = await Promise.all([
    link.taskId
      ? supabase
          .from("tasks")
          .select("title, due_date, client_id, project_id")
          .eq("id", link.taskId)
          .maybeSingle()
      : null,
    link.incomeId
      ? supabase
          .from("incomes")
          .select("title, amount, category, due_date, client_id, project_id")
          .eq("id", link.incomeId)
          .maybeSingle()
      : null,
    link.expenseId
      ? supabase
          .from("expenses")
          .select("title, amount, expense_date, client_id, project_id")
          .eq("id", link.expenseId)
          .maybeSingle()
      : null,
    link.noteId
      ? supabase
          .from("notes")
          .select("client_id, project_id")
          .eq("id", link.noteId)
          .maybeSingle()
      : null,
  ]);

  const taskRow = (task?.data ?? null) as TaskRow | null;
  const incomeRow = (income?.data ?? null) as IncomeRow | null;
  const expenseRow = (expense?.data ?? null) as ExpenseRow | null;
  const noteRow = (note?.data ?? null) as {
    client_id: string | null;
    project_id: string | null;
  } | null;

  const clientId =
    link.clientId ??
    taskRow?.client_id ??
    incomeRow?.client_id ??
    expenseRow?.client_id ??
    noteRow?.client_id ??
    null;

  const projectId =
    link.projectId ??
    taskRow?.project_id ??
    incomeRow?.project_id ??
    expenseRow?.project_id ??
    noteRow?.project_id ??
    null;

  const [client, project] = await Promise.all([
    clientId
      ? supabase
          .from("clients")
          .select("name, company, contact_person, address, email, phone")
          .eq("id", clientId)
          .maybeSingle()
      : null,
    projectId
      ? supabase
          .from("projects")
          .select(
            "name, description, deal_value, billing_type, billing_period, contract_months, start_date",
          )
          .eq("id", projectId)
          .maybeSingle()
      : null,
  ]);

  // Project menyimpan kliennya sendiri, jadi dokumen yang cuma menyebut
  // project tetap dapat blok "ditagihkan kepada" yang benar.
  let clientRow = (client?.data ?? null) as ClientRow | null;
  if (!clientRow && projectId) {
    const { data } = await supabase
      .from("projects")
      .select("client:clients(name, company, contact_person, address, email, phone)")
      .eq("id", projectId)
      .maybeSingle();
    clientRow = (data?.client as unknown as ClientRow | null) ?? null;
  }

  return {
    client: clientRow,
    project: (project?.data ?? null) as ProjectRow | null,
    task: taskRow,
    income: incomeRow,
    expense: expenseRow,
  };
}

/**
 * Susun nilai semua placeholder otomatis.
 *
 * `docNumber` null berarti nomornya belum diterbitkan — di pratinjau form
 * (nomor baru diambil saat dokumennya benar-benar dibuat, supaya membuka
 * form lalu membatalkannya tidak menghanguskan satu nomor) atau karena
 * templatenya memang tidak bernomor.
 */
export function buildPlaceholders(input: {
  sources: PlaceholderSources;
  templateName: string;
  docNumber: string | null;
  authorName: string;
  company: CompanySettings;
  /** "yyyy-MM-dd". Selalu dari server — lihat `todayJakarta`. */
  today?: string;
}): Record<string, string> {
  const co = input.company;
  const { client, project, task, income, expense } = input.sources;

  const today = input.today ?? todayJakarta();
  const date = parseKey(today);

  const scheme = project
    ? {
        billing_type: project.billing_type,
        billing_period: project.billing_period,
        contract_months: project.contract_months,
      }
    : null;

  const values: Record<string, string> = {
    "dokumen.judul": input.templateName,
    "dokumen.nomor": input.docNumber ?? "",
    "dokumen.tanggal": formatDate(today),
    "dokumen.tanggal_panjang": longDate(today),
    "dokumen.bulan_romawi": ROMAN_MONTHS[date.getMonth()] ?? "",
    "dokumen.tahun": String(date.getFullYear()),
    "dokumen.pembuat": input.authorName,

    "perusahaan.nama": co.name,
    "perusahaan.alamat": co.address,
    "perusahaan.kota": co.city,
    "perusahaan.email": co.email,
    "perusahaan.telepon": co.phone,
    "perusahaan.bank": co.bankName,
    "perusahaan.rekening": co.bankAccountNumber,
    "perusahaan.atas_nama": co.bankAccountName,
    "perusahaan.npwp": co.npwp,

    "klien.nama": client?.name ?? "",
    "klien.perusahaan": client?.company ?? "",
    // Nama yang pantas dicetak di blok "ditagihkan kepada": badan usaha
    // kalau ada, orangnya kalau kliennya memang perorangan.
    "klien.tertagih": client ? (client.company ?? client.name) : "",
    "klien.narahubung": client?.contact_person ?? "",
    "klien.alamat": client?.address ?? "",
    "klien.email": client?.email ?? "",
    "klien.telepon": client?.phone ?? "",

    "proyek.nama": project?.name ?? "",
    "proyek.deskripsi": project?.description ?? "",
    // Lewat contractValue(), tidak pernah `deal_value` mentah: untuk
    // langganan kolom itu cuma harga satu periode (PRD v3.1).
    "proyek.nilai_kontrak":
      project && scheme
        ? rupiahOrEmpty(contractValue(scheme, project.deal_value))
        : "",
    "proyek.nilai_periode":
      project && scheme && isSubscription(scheme) && project.deal_value != null
        ? `${formatRupiah(Number(project.deal_value))}/${
            scheme.billing_period
              ? BILLING_PERIOD_UNIT[scheme.billing_period]
              : "periode"
          }`
        : "",
    "proyek.skema":
      project && scheme
        ? schemeSummary(
            scheme,
            project.deal_value != null
              ? formatRupiah(Number(project.deal_value))
              : "",
          ).trim()
        : "",
    "proyek.mulai": project?.start_date ? formatDate(project.start_date) : "",
    "proyek.selesai_kontrak":
      project && scheme
        ? dateOrEmpty(contractEndDate(project.start_date, scheme))
        : "",
    "proyek.jadwal_tagihan":
      project && scheme && project.start_date
        ? billingSchedule(project.start_date, scheme)
            .map(
              (row) =>
                `Termin ${row.period} — jatuh tempo ${formatDate(row.dueDate)}`,
            )
            .join("\n")
        : "",

    "tugas.judul": task?.title ?? "",
    "tugas.tenggat": dateOrEmpty(task?.due_date ?? null),

    "tagihan.keterangan": income?.title ?? "",
    "tagihan.jumlah": income ? formatRupiah(Number(income.amount)) : "",
    "tagihan.jumlah_angka": income
      ? formatRupiah(Number(income.amount)).replace(/^Rp\s?/, "")
      : "",
    "tagihan.terbilang": income ? terbilang(Number(income.amount)) : "",
    "tagihan.jenis": income ? INCOME_CATEGORY_LABEL[income.category] : "",
    "tagihan.jatuh_tempo": dateOrEmpty(income?.due_date ?? null),

    "pengeluaran.judul": expense?.title ?? "",
    "pengeluaran.jumlah": expense ? formatRupiah(Number(expense.amount)) : "",
    "pengeluaran.tanggal": dateOrEmpty(expense?.expense_date ?? null),
  };

  // Jaring pengaman terhadap katalog yang ditambahi tanpa nilainya ikut
  // ditulis di atas: lebih baik kosong daripada tertinggal sebagai kode
  // di dokumen yang dikirim ke klien.
  for (const key of AUTO_PLACEHOLDER_KEYS) values[key] ??= "";

  return values;
}

/** Nomor urut berikutnya untuk sebuah kode dokumen, di tahun berjalan. */
export async function nextDocNumber(
  prefix: string,
  today: string,
  companyCode: string,
): Promise<{ number: string; seq: number; year: number }> {
  const supabase = await createClient();
  const date = parseKey(today);
  const year = date.getFullYear();

  const { data } = await supabase
    .from("documents")
    .select("number_seq")
    .eq("number_prefix", prefix)
    .eq("number_year", year)
    .order("number_seq", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Reset ke 001 tiap tahun: nomor dicari per tahun, dan tahun ikut jadi
  // bagian kunci uniknya (migration 011). Dua klik yang benar-benar
  // bersamaan bisa mendapat angka yang sama — yang kedua ditolak indeks
  // unik dan tinggal diulang, dan untuk tim bertiga itu lebih murah
  // daripada mengunci baris di setiap pembuatan dokumen.
  const seq = Number(data?.number_seq ?? 0) + 1;

  return {
    number: formatDocNumber({
      companyCode,
      prefix,
      seq,
      month: date.getMonth() + 1,
      year,
    }),
    seq,
    year,
  };
}

/** "13 Agustus 2026" — bentuk panjang untuk badan surat. */
function longDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(parseKey(value));
}

function dateOrEmpty(value: string | null) {
  return value ? formatDate(value) : "";
}

function rupiahOrEmpty(value: number | null) {
  return value == null ? "" : formatRupiah(value);
}

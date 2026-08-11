// Tipe data yang mencerminkan supabase/schema.sql.
// Kalau skema SQL berubah, file ini ikut diubah.

export type UserRole = "founder" | "coo" | "admin";

export type ClientStatus =
  | "lead"
  | "negotiation"
  | "active"
  | "on_hold"
  | "done"
  | "lost";

export type ProjectStatus =
  | "planning"
  | "in_progress"
  | "review"
  | "delivered"
  | "cancelled";

export type ProjectTrack = "operational" | "branding" | "other";

export type TaskStatus = "todo" | "in_progress" | "review" | "done";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type ExpenseStatus = "pending" | "approved" | "paid" | "rejected";

export type ExpenseCategory =
  | "transport"
  | "meals"
  | "equipment"
  | "software"
  | "marketing"
  | "office"
  | "other";

export type IncomeStatus = "planned" | "invoiced" | "received";

export type IncomeCategory = "dp" | "termin" | "pelunasan" | "retainer" | "other";

export type PaymentMethod = "transfer" | "cash" | "ewallet" | "other";

/** Warna identitas anggota tim — menempel ke orangnya, bukan ke tugasnya. */
export type MemberColor =
  | "terracotta"
  | "forest"
  | "indigo"
  | "plum"
  | "amber"
  | "teal"
  | "slate";

export type Profile = {
  id: string;
  full_name: string;
  role: UserRole;
  color: MemberColor | null;
  /** Buka dashboard /admin & bisa mengubah profil orang lain. Cuma Abi. */
  is_super_admin: boolean;
  created_at: string;
};

/** Bentuk minimal seorang anggota yang dibutuhkan UI: nama + warnanya. */
export type Member = Pick<Profile, "id" | "full_name" | "color">;

export type Client = {
  id: string;
  name: string;
  company: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  status: ClientStatus;
  notes: string | null;
  drive_folder_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  track: ProjectTrack;
  start_date: string | null;
  target_date: string | null;
  /** Nilai deal yang disepakati. Null = belum ada angka yang dipegang. */
  deal_value: number | null;
  drive_folder_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CardColor =
  | "blue"
  | "purple"
  | "green"
  | "yellow"
  | "orange"
  | "pink"
  | "grey";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  color: CardColor;
  client_id: string | null;
  project_id: string | null;
  start_date: string | null;
  due_date: string | null;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type BoardColumn = {
  status: TaskStatus;
  wip_limit: number | null;
};

export type LabelColor =
  | "green"
  | "yellow"
  | "orange"
  | "red"
  | "purple"
  | "blue"
  | "sky"
  | "pink";

export type Label = {
  id: string;
  name: string;
  color: LabelColor;
  position: number;
  created_at: string;
};

export type Folder = {
  id: string;
  name: string;
  parent_id: string | null;
  drive_folder_id: string;
  created_by: string | null;
  created_at: string;
};

export type Expense = {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  description: string | null;
  expense_date: string;
  status: ExpenseStatus;
  is_reimbursement: boolean;
  submitted_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  client_id: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Income = {
  id: string;
  title: string;
  amount: number;
  category: IncomeCategory;
  status: IncomeStatus;
  /** Rencana/jatuh tempo tagihan — selalu terisi. */
  due_date: string;
  /** Tanggal uang benar-benar masuk; diisi database saat status 'received'. */
  received_date: string | null;
  method: PaymentMethod | null;
  description: string | null;
  client_id: string | null;
  project_id: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Document = {
  id: string;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  drive_file_id: string;
  drive_web_link: string | null;
  client_id: string | null;
  project_id: string | null;
  task_id: string | null;
  expense_id: string | null;
  income_id: string | null;
  note_id: string | null;
  event_id: string | null;
  folder_id: string | null;
  uploaded_by: string | null;
  created_at: string;
};

// Bentuk hasil query yang membawa relasi ikut serta (Supabase embed).
export type TaskWithRelations = Task & {
  /** Bisa lebih dari satu orang — satu tugas, beberapa penanggung jawab. */
  assignees: Member[];
  /** Id versi ringkas dari `assignees`, dipakai filter & pengiriman form. */
  assignee_ids: string[];
  client: Pick<Client, "id" | "name"> | null;
  project: Pick<Project, "id" | "name"> | null;
  /** Id label yang menempel. Sengaja id saja, bukan objek label penuh:
   *  daftar labelnya dikirim sekali per halaman, bukan diulang di tiap
   *  tugas — beda ukuran payload-nya terasa di jaringan HP. */
  label_ids: string[];
  /** Catatan yang menempel. Judul saja — isinya baru diambil saat dibuka. */
  notes: NoteSummary[];
  /** Lampiran tugas. File-nya di Drive, ini cuma metadatanya (PRD §2.1). */
  documents: Document[];
};

export type ExpenseWithRelations = Expense & {
  submitter: Pick<Profile, "id" | "full_name"> | null;
  reviewer: Pick<Profile, "id" | "full_name"> | null;
  client: Pick<Client, "id" | "name"> | null;
  documents: Document[];
};

export type IncomeWithRelations = Income & {
  client: Pick<Client, "id" | "name"> | null;
  project: Pick<Project, "id" | "name"> | null;
  recorder: Pick<Profile, "id" | "full_name"> | null;
};

/** Satu baris dari view `cashflow_monthly`. `month` = tanggal 1 bulan itu. */
export type CashflowMonth = {
  month: string;
  cash_in: number;
  cash_out: number;
  net: number;
};

// ---------------------------------------------------------------------
// Jadwal rapat. Satu baris `Event` adalah SATU SERI — kemunculan tiap
// tanggalnya (`EventOccurrence`) dihitung di lib/events.ts dari pola
// pengulangannya, bukan disimpan satu baris per tanggal.
// ---------------------------------------------------------------------

export type EventRecurrence = "none" | "daily" | "weekly";

export type EventSeries = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  /** Kemunculan pertama (atau satu-satunya, kalau recurrence = 'none'). */
  event_date: string;
  is_all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  recurrence: EventRecurrence;
  /** 1=Senin..7=Minggu. Null berarti mengikuti hari dari event_date. */
  recurrence_weekdays: number[] | null;
  /** Null = tanpa batas akhir. */
  recurrence_until: string | null;
  color: CardColor;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EventException = {
  id: string;
  event_id: string;
  occurrence_date: string;
  cancelled: boolean;
  title: string | null;
  start_time: string | null;
  end_time: string | null;
};

export type EventSeriesWithRelations = EventSeries & {
  attendees: Member[];
  attendee_ids: string[];
  exceptions: EventException[];
};

/** Satu kemunculan yang sudah dihitung, siap digambar di satu sel hari. */
export type EventOccurrence = {
  series: EventSeriesWithRelations;
  /** Tanggal kemunculan ini. Dikirim balik ke server saat mengubah
   *  "hanya kemunculan ini" — jadi kunci untuk `event_exceptions`. */
  occurrenceDate: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  /** Seri ini punya lebih dari satu kemunculan (recurrence != 'none'). */
  isRecurring: boolean;
};

export const WEEKDAY_LABEL_BY_NUMBER: Record<number, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
};

// ---------------------------------------------------------------------
// Catatan & notulen rapat. Satu tabel, dibedakan `kind` — lihat komentar
// di supabase/migrations/006_catatan_dan_notulen.sql.
// ---------------------------------------------------------------------

export type NoteKind = "note" | "mom";

export type Note = {
  id: string;
  kind: NoteKind;
  title: string;
  /** Markdown, bukan HTML. Dirender lewat lib/markdown.ts. */
  content: string;
  meeting_date: string | null;
  client_id: string | null;
  project_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Satu tautan catatan → kemunculan rapat. Bukan cukup `event_id`: satu
 * baris `events` bisa berarti puluhan rapat, jadi tanggal kemunculannya
 * ikut jadi bagian dari identitas tautan (lihat migration 007 §2).
 */
export type NoteEventRef = {
  event_id: string;
  occurrence_date: string;
  event: { id: string; title: string } | null;
};

export type NoteWithRelations = Note & {
  /** Yang HADIR di rapat — beda dari yang diundang, lihat migration 006. */
  participants: Member[];
  participant_ids: string[];
  /** Banyak-ke-banyak sejak migration 007 — satu notulen bisa melahirkan
   *  beberapa tugas tindak lanjut sekaligus. */
  tasks: Pick<Task, "id" | "title">[];
  task_ids: string[];
  /** Rapat-rapat yang catatan ini bicarakan. */
  events: NoteEventRef[];
  client: Pick<Client, "id" | "name"> | null;
  project: Pick<Project, "id" | "name"> | null;
  author: Member | null;
  editor: Member | null;
};

/** Bentuk ringkas untuk daftar catatan yang menempel di sebuah tugas. */
export type NoteSummary = Pick<Note, "id" | "title" | "kind" | "updated_at">;

export const NOTE_KIND_LABEL: Record<NoteKind, string> = {
  note: "Catatan",
  mom: "Notulen Rapat",
};

/**
 * Kerangka notulen yang terisi saat notulen baru dibuat.
 *
 * Halaman kosong adalah alasan paling sering notulen tidak jadi ditulis.
 * Empat judul ini bukan aturan — semuanya boleh dihapus — tapi keberadaannya
 * mengubah pertanyaan dari "mulai dari mana" jadi "isi yang mana dulu".
 */
export const MOM_TEMPLATE = `## Agenda

-

## Pembahasan

-

## Keputusan

-

## Tindak Lanjut

- [ ] `;

// ---------------------------------------------------------------------
// Log aktivitas — dibaca lengkap dari dashboard admin (super admin saja).
// ---------------------------------------------------------------------

export type ActivityAction =
  | "created"
  | "updated"
  | "deleted"
  | "status_changed"
  | "moved"
  | "role_changed";

export type ActivityEntityType =
  | "task"
  | "client"
  | "project"
  | "expense"
  | "income"
  | "event"
  | "note"
  | "profile"
  | "label"
  | "folder"
  | "document";

export type ActivityLogEntry = {
  id: string;
  actor_id: string | null;
  entity_type: ActivityEntityType;
  entity_id: string | null;
  action: ActivityAction;
  summary: string;
  created_at: string;
};

export type ActivityLogWithActor = ActivityLogEntry & {
  actor: Pick<Profile, "id" | "full_name"> | null;
};

// ---------------------------------------------------------------------
// Label bahasa Indonesia untuk tiap enum — dipakai di seluruh UI supaya
// tidak ada string yang ditulis ulang (dan salah tulis) di banyak tempat.
// ---------------------------------------------------------------------

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "Belum Dikerjakan",
  in_progress: "Sedang Dikerjakan",
  review: "Review",
  done: "Selesai",
};

// Urutan kolom di papan kanban, kiri ke kanan.
export const TASK_STATUS_ORDER: TaskStatus[] = [
  "todo",
  "in_progress",
  "review",
  "done",
];

// Warna header tiap kolom papan — tint tipis supaya kolom terbaca sebagai
// wilayah terpisah tanpa menenggelamkan warna kartu di dalamnya.
export const TASK_STATUS_TINT: Record<
  TaskStatus,
  { header: string; body: string }
> = {
  todo: { header: "#dde5e9", body: "#f4f7f8" },
  in_progress: { header: "#f6dfe0", body: "#fdf6f6" },
  review: { header: "#fbf0d5", body: "#fdfaf2" },
  done: { header: "#dfe9dc", body: "#f6faf4" },
};

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
  urgent: "Mendesak",
};

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  lead: "Prospek",
  negotiation: "Negosiasi",
  active: "Aktif",
  on_hold: "Ditunda",
  done: "Selesai",
  lost: "Batal",
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Perencanaan",
  in_progress: "Dikerjakan",
  review: "Review",
  delivered: "Terkirim",
  cancelled: "Dibatalkan",
};

export const PROJECT_TRACK_LABEL: Record<ProjectTrack, string> = {
  operational: "Business Operational",
  branding: "Community & Branding",
  other: "Lainnya",
};

export const EXPENSE_STATUS_LABEL: Record<ExpenseStatus, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  paid: "Dibayar",
  rejected: "Ditolak",
};

export const INCOME_STATUS_LABEL: Record<IncomeStatus, string> = {
  planned: "Direncanakan",
  invoiced: "Ditagih",
  received: "Diterima",
};

export const INCOME_STATUS_ORDER: IncomeStatus[] = [
  "planned",
  "invoiced",
  "received",
];

export const INCOME_CATEGORY_LABEL: Record<IncomeCategory, string> = {
  dp: "DP",
  termin: "Termin",
  pelunasan: "Pelunasan",
  retainer: "Retainer",
  other: "Lainnya",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  transfer: "Transfer",
  cash: "Tunai",
  ewallet: "E-wallet",
  other: "Lainnya",
};

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  transport: "Transport",
  meals: "Konsumsi",
  equipment: "Peralatan",
  software: "Software",
  marketing: "Marketing",
  office: "Kantor",
  other: "Lainnya",
};

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  founder: "Founder / Tech",
  coo: "COO / Sales",
  admin: "Admin / Keuangan",
};

// Palet sticky note. Sengaja pastel & rendah saturasi supaya banyak kartu
// berdampingan tetap enak dilihat, dan teks gelap di atasnya tetap terbaca.
export const CARD_COLORS: Record<
  CardColor,
  { label: string; bg: string; border: string; bar: string }
> = {
  blue: {
    label: "Biru",
    bg: "#dbeafe",
    border: "#a8c7f0",
    bar: "#7ba7e0",
  },
  purple: {
    label: "Ungu",
    bg: "#e2dcf7",
    border: "#bfb3e8",
    bar: "#9b8ad6",
  },
  green: {
    label: "Hijau",
    bg: "#d8ecd0",
    border: "#aed4a0",
    bar: "#8cc47a",
  },
  yellow: {
    label: "Kuning",
    bg: "#fdf0c8",
    border: "#ecd68f",
    bar: "#e0c163",
  },
  orange: {
    label: "Oranye",
    bg: "#fbdfc4",
    border: "#efc196",
    bar: "#e5a86e",
  },
  pink: {
    label: "Merah Muda",
    bg: "#f8d7dd",
    border: "#eab0bb",
    bar: "#dd8b9c",
  },
  grey: {
    label: "Abu-abu",
    bg: "#e4e4e7",
    border: "#c6c6cb",
    bar: "#a9a9b0",
  },
};

export const CARD_COLOR_ORDER: CardColor[] = [
  "blue",
  "purple",
  "green",
  "yellow",
  "orange",
  "pink",
  "grey",
];

// ---------------------------------------------------------------------
// Warna orang. Berbeda tugas dari CARD_COLORS: yang ini pekat dan dipakai
// sebagai latar avatar + garis penanda di kartu, jadi harus punya kontras
// cukup untuk teks putih di atasnya. Palet kartu terlalu pucat untuk itu.
// ---------------------------------------------------------------------

export const MEMBER_COLORS: Record<
  MemberColor,
  { label: string; solid: string; soft: string }
> = {
  terracotta: { label: "Terakota", solid: "#b0522c", soft: "#f6e7de" },
  forest: { label: "Hijau Tua", solid: "#235e54", soft: "#dceae6" },
  indigo: { label: "Indigo", solid: "#3d4f9e", soft: "#e0e4f6" },
  plum: { label: "Plum", solid: "#7a3d76", soft: "#f0e2ef" },
  amber: { label: "Amber", solid: "#a8761c", soft: "#f8eed8" },
  teal: { label: "Toska", solid: "#1f6f7a", soft: "#dcecef" },
  slate: { label: "Abu Batu", solid: "#5b6470", soft: "#e5e8ec" },
};

export const MEMBER_COLOR_ORDER: MemberColor[] = [
  "terracotta",
  "forest",
  "indigo",
  "plum",
  "amber",
  "teal",
  "slate",
];

/**
 * Warna seseorang, dengan cadangan yang tetap kalau kolomnya masih kosong
 * (mis. profil dibuat sebelum migration 003 jalan). Cadangannya diturunkan
 * dari id, bukan dari urutan render — supaya warna orang yang sama tidak
 * berpindah-pindah antar halaman.
 */
export function memberColor(
  member: { id: string; color?: MemberColor | null } | null | undefined,
): MemberColor {
  if (!member) return "slate";
  if (member.color) return member.color;

  let hash = 0;
  for (let i = 0; i < member.id.length; i += 1) {
    hash = (hash * 31 + member.id.charCodeAt(i)) % 100000;
  }
  return MEMBER_COLOR_ORDER[hash % MEMBER_COLOR_ORDER.length];
}

// ---------------------------------------------------------------------
// Warna label. Lebih pekat dari warna kartu supaya strip tipis di kepala
// kartu tetap terbaca sebagai warna, bukan sebagai noda pucat.
// ---------------------------------------------------------------------

export const LABEL_COLORS: Record<
  LabelColor,
  { label: string; solid: string; soft: string }
> = {
  green: { label: "Hijau", solid: "#4a8b3c", soft: "#e2efdc" },
  yellow: { label: "Kuning", solid: "#c9a227", soft: "#f8f0d4" },
  orange: { label: "Oranye", solid: "#d2792c", soft: "#fae4d0" },
  red: { label: "Merah", solid: "#b8402f", soft: "#f8e0dc" },
  purple: { label: "Ungu", solid: "#7754bb", soft: "#eae2f8" },
  blue: { label: "Biru", solid: "#3268b5", soft: "#dee8f7" },
  sky: { label: "Langit", solid: "#2b8fa8", soft: "#daeef3" },
  pink: { label: "Merah Muda", solid: "#bf4f77", soft: "#f8e0e8" },
};

export const LABEL_COLOR_ORDER: LabelColor[] = [
  "green",
  "yellow",
  "orange",
  "red",
  "purple",
  "blue",
  "sky",
  "pink",
];

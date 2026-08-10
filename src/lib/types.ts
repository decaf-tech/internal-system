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

export type Profile = {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
};

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
  assignee_id: string | null;
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
  folder_id: string | null;
  uploaded_by: string | null;
  created_at: string;
};

// Bentuk hasil query yang membawa relasi ikut serta (Supabase embed).
export type TaskWithRelations = Task & {
  assignee: Pick<Profile, "id" | "full_name"> | null;
  client: Pick<Client, "id" | "name"> | null;
  project: Pick<Project, "id" | "name"> | null;
};

export type ExpenseWithRelations = Expense & {
  submitter: Pick<Profile, "id" | "full_name"> | null;
  reviewer: Pick<Profile, "id" | "full_name"> | null;
  client: Pick<Client, "id" | "name"> | null;
  documents: Document[];
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

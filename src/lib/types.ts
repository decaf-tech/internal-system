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

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  client_id: string | null;
  project_id: string | null;
  due_date: string | null;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
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

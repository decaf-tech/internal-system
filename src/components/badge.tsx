import type {
  ClientStatus,
  ExpenseStatus,
  IncomeStatus,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from "@/lib/types";
import {
  CLIENT_STATUS_LABEL,
  EXPENSE_STATUS_LABEL,
  INCOME_STATUS_LABEL,
  PROJECT_STATUS_LABEL,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
} from "@/lib/types";

// Palet badge dipetakan ke token warna brand, bukan warna Tailwind mentah,
// supaya kalau tema berubah semuanya ikut satu sumber.
const TONE = {
  neutral: "bg-surface-sunken text-ink-muted",
  accent: "bg-accent-soft text-accent",
  forest: "bg-forest-soft text-forest",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
} as const;

type Tone = keyof typeof TONE;

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`badge ${TONE[tone]}`}>{children}</span>;
}

const TASK_STATUS_TONE: Record<TaskStatus, Tone> = {
  todo: "neutral",
  in_progress: "accent",
  review: "warn",
  done: "forest",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Pill tone={TASK_STATUS_TONE[status]}>{TASK_STATUS_LABEL[status]}</Pill>;
}

const TASK_PRIORITY_TONE: Record<TaskPriority, Tone> = {
  low: "neutral",
  medium: "neutral",
  high: "warn",
  urgent: "danger",
};

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Pill tone={TASK_PRIORITY_TONE[priority]}>
      {TASK_PRIORITY_LABEL[priority]}
    </Pill>
  );
}

const CLIENT_STATUS_TONE: Record<ClientStatus, Tone> = {
  lead: "neutral",
  negotiation: "warn",
  active: "forest",
  on_hold: "warn",
  done: "accent",
  lost: "danger",
};

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return (
    <Pill tone={CLIENT_STATUS_TONE[status]}>{CLIENT_STATUS_LABEL[status]}</Pill>
  );
}

const PROJECT_STATUS_TONE: Record<ProjectStatus, Tone> = {
  planning: "neutral",
  in_progress: "accent",
  review: "warn",
  delivered: "forest",
  cancelled: "danger",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Pill tone={PROJECT_STATUS_TONE[status]}>
      {PROJECT_STATUS_LABEL[status]}
    </Pill>
  );
}

const EXPENSE_STATUS_TONE: Record<ExpenseStatus, Tone> = {
  pending: "warn",
  approved: "accent",
  paid: "forest",
  rejected: "danger",
};

export function ExpenseStatusBadge({ status }: { status: ExpenseStatus }) {
  return (
    <Pill tone={EXPENSE_STATUS_TONE[status]}>
      {EXPENSE_STATUS_LABEL[status]}
    </Pill>
  );
}

const INCOME_STATUS_TONE: Record<IncomeStatus, Tone> = {
  planned: "neutral",
  invoiced: "warn",
  // Hijau khusus untuk uang yang benar-benar sudah masuk — hanya baris
  // berwarna ini yang ikut dihitung sebagai kas masuk di halaman Cashflow.
  received: "forest",
};

export function IncomeStatusBadge({ status }: { status: IncomeStatus }) {
  return (
    <Pill tone={INCOME_STATUS_TONE[status]}>{INCOME_STATUS_LABEL[status]}</Pill>
  );
}

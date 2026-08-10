"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatRelativeDue, initials } from "@/lib/format";
import { CARD_COLORS, type TaskWithRelations } from "@/lib/types";

/**
 * Ikon peringatan untuk kartu yang perlu dilihat duluan: sudah lewat
 * tenggat, atau ditandai mendesak.
 */
function needsAttention(task: TaskWithRelations) {
  if (task.status === "done") return false;
  if (task.priority === "urgent") return true;
  if (!task.due_date) return false;
  return task.due_date < new Date().toISOString().slice(0, 10);
}

/** Tampilan kartu murni — dipakai di kolom maupun saat sedang diseret. */
export function TaskCardBody({
  task,
  onOpen,
}: {
  task: TaskWithRelations;
  onOpen?: () => void;
}) {
  // Tugas selesai tidak perlu peringatan "telat" — tenggatnya sudah lewat
  // relevansinya begitu pekerjaannya kelar.
  const due = task.status === "done" ? null : formatRelativeDue(task.due_date);
  const alert = needsAttention(task);

  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-1.5">
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left text-[13px] leading-snug font-medium text-ink"
        >
          {task.title}
        </button>

        <div className="flex shrink-0 items-center gap-1">
          {alert && (
            <span title="Perlu perhatian" className="text-[#c2410c]">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 2.5l6 11H2l6-11z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                  fill="#fed7aa"
                />
                <path
                  d="M8 6.5v3.2M8 11.6v.1"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          )}
          {task.assignee && (
            <span
              title={task.assignee.full_name}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-white/70 font-mono text-[9px] text-ink-muted"
            >
              {initials(task.assignee.full_name)}
            </span>
          )}
        </div>
      </div>

      {task.client && (
        <p className="truncate font-mono text-[10px] text-ink-muted/80">
          {task.client.name}
        </p>
      )}

      {due && (
        <p
          className={`font-mono text-[10px] ${
            due.overdue ? "font-medium text-[#b91c1c]" : "text-ink-muted/80"
          }`}
        >
          {due.text}
        </p>
      )}
    </div>
  );
}

export function SortableTaskCard({
  task,
  onOpen,
}: {
  task: TaskWithRelations;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const palette = CARD_COLORS[task.color] ?? CARD_COLORS.blue;

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        // Kartu asli disamarkan saat diseret; yang mengikuti kursor adalah
        // DragOverlay.
        opacity: isDragging ? 0.35 : 1,
        backgroundColor: palette.bg,
        borderColor: palette.border,
        // Tanpa ini, menyeret kartu di layar sentuh malah menggulirkan
        // halaman, dan di desktop malah menyorot teks.
        touchAction: "none",
      }}
      className="cursor-grab rounded-sm border p-2.5 shadow-[0_1px_2px_rgba(28,24,21,0.08)] select-none active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <TaskCardBody task={task} onOpen={onOpen} />
    </li>
  );
}

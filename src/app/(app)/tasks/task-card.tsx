"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskPriorityBadge } from "@/components/badge";
import { formatRelativeDue, initials } from "@/lib/format";
import type { TaskWithRelations } from "@/lib/types";

/** Tampilan kartu murni — dipakai baik di kolom maupun saat sedang diseret. */
export function TaskCardBody({
  task,
  onOpen,
}: {
  task: TaskWithRelations;
  onOpen?: () => void;
}) {
  // Tugas yang sudah selesai tidak perlu diberi peringatan "telat" —
  // tenggatnya sudah tidak relevan begitu pekerjaannya kelar.
  const due =
    task.status === "done" ? null : formatRelativeDue(task.due_date);

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left text-sm leading-snug font-medium hover:text-accent"
        >
          {task.title}
        </button>
        {task.assignee && (
          <span
            title={task.assignee.full_name}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-soft font-mono text-[10px] text-forest"
          >
            {initials(task.assignee.full_name)}
          </span>
        )}
      </div>

      {task.client && (
        <p className="truncate font-mono text-[11px] text-ink-subtle">
          {task.client.name}
          {task.project && ` · ${task.project.name}`}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <TaskPriorityBadge priority={task.priority} />
        {due && (
          <span
            className={`font-mono text-[11px] ${
              due.overdue ? "text-danger" : "text-ink-subtle"
            }`}
          >
            {due.text}
          </span>
        )}
      </div>
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

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        // Kartu asli disamarkan saat diseret; yang terlihat mengikuti
        // kursor adalah DragOverlay.
        opacity: isDragging ? 0.4 : 1,
        // Tanpa ini, menyeret kartu di layar sentuh malah menggulirkan
        // halaman, dan di desktop malah menyorot teks.
        touchAction: "none",
      }}
      className="card cursor-grab p-3 select-none active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <TaskCardBody task={task} onOpen={onOpen} />
    </li>
  );
}

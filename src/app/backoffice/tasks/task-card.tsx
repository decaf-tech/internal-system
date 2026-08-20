"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatRelativeDue } from "@/lib/format";
import { parseKey, todayKey } from "@/lib/date-range";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CARD_COLORS, type Label, type TaskWithRelations } from "@/lib/types";
import { MemberAvatarStack } from "@/components/member-avatar";
import { LabelStrips } from "./pickers";

/**
 * Ikon peringatan untuk kartu yang perlu dilihat duluan: sudah lewat
 * tenggat, atau ditandai mendesak.
 */
function needsAttention(task: TaskWithRelations) {
  if (task.status === "done") return false;
  if (task.priority === "urgent") return true;
  if (!task.due_date) return false;
  return task.due_date < todayKey();
}

/**
 * Tampilan kartu murni — dipakai di kolom maupun saat sedang diseret.
 *
 * Susunannya: strip label di atas, judul, lalu satu baris kaki berisi
 * tanggal, klien, dan avatar. Semua informasi tambahan diringkas jadi
 * penanda kecil di baris kaki itu supaya kartu tetap setinggi dua-tiga
 * baris walau tugasnya membawa banyak keterangan.
 */
export function TaskCardBody({
  task,
  labels,
}: {
  task: TaskWithRelations;
  labels: Label[];
}) {
  // Tugas selesai tidak perlu peringatan "telat" — tenggatnya sudah lewat
  // relevansinya begitu pekerjaannya kelar.
  const due = task.status === "done" ? null : formatRelativeDue(task.due_date);
  const alert = needsAttention(task);

  // Rentang beberapa hari ditulis sebagai tanggal, bukan "3 hari lagi" —
  // yang dibutuhkan saat melihat batang panjang adalah kapan mulainya.
  const span =
    task.start_date && task.due_date && task.start_date !== task.due_date
      ? `${format(parseKey(task.start_date), "d MMM", { locale: localeId })} – ${format(
          parseKey(task.due_date),
          "d MMM",
          { locale: localeId },
        )}`
      : null;

  return (
    <div className="space-y-1.5">
      <LabelStrips labels={labels} />

      <div className="flex items-start justify-between gap-1.5">
        <span className="min-w-0 flex-1 text-[13px] leading-snug font-medium text-ink">
          {task.title}
        </span>

        <div className="flex shrink-0 items-center gap-1">
          {alert && (
            <span title="Perlu perhatian" className="text-warn">
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
          <MemberAvatarStack members={task.assignees} size="sm" max={3} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] text-ink-muted/80">
        {task.description && (
          <span title="Ada deskripsi" aria-label="Ada deskripsi">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 4.5h10M3 8h10M3 11.5h6"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </span>
        )}
        {task.client && <span className="truncate">{task.client.name}</span>}
        {span && <span>{span}</span>}
        {due && !span && (
          <span
            className={due.overdue ? "font-medium text-danger" : undefined}
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
  labels,
  onOpen,
}: {
  task: TaskWithRelations;
  labels: Label[];
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
        // 'manipulation', bukan 'none': di HP, drag baru aktif setelah
        // ditahan sebentar (lihat TouchSensor di task-board), jadi jari
        // yang sekadar menggulir halaman harus tetap bisa menggulir.
        touchAction: "manipulation",
      }}
      className="cursor-grab rounded-sm border p-2.5 shadow-[0_1px_2px_rgba(28,24,21,0.08)] select-none active:cursor-grabbing"
      onClick={onOpen}
      {...attributes}
      {...listeners}
    >
      <TaskCardBody task={task} labels={labels} />
    </li>
  );
}

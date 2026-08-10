"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CARD_COLORS, type TaskWithRelations } from "@/lib/types";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/** Satu potongan tugas di dalam satu baris minggu. */
type Segment = {
  task: TaskWithRelations;
  /** Kolom mulai dalam minggu itu, 0 = Senin. */
  column: number;
  span: number;
  /** Batang aslinya dimulai/berakhir di minggu sebelumnya/berikutnya. */
  continuesLeft: boolean;
  continuesRight: boolean;
  lane: number;
};

function toKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

/**
 * Rentang efektif sebuah tugas. Tugas yang hanya punya tenggat dianggap
 * berlangsung satu hari, supaya tetap muncul di kalender.
 */
function rangeOf(task: TaskWithRelations) {
  const start = task.start_date ?? task.due_date;
  const end = task.due_date ?? task.start_date;
  if (!start || !end) return null;
  return start <= end ? { start, end } : { start: end, end: start };
}

/**
 * Susun batang tugas ke dalam jalur (lane) agar tidak saling tumpuk.
 * Serakah dan sederhana: tiap batang ditaruh di jalur kosong pertama —
 * cukup untuk beban kerja tim bertiga, tanpa perlu penjadwalan optimal.
 */
function layoutWeek(week: Date[], tasks: TaskWithRelations[]): Segment[] {
  const weekStart = toKey(week[0]);
  const weekEnd = toKey(week[6]);

  const overlapping = tasks
    .map((task) => ({ task, range: rangeOf(task) }))
    .filter(
      (entry): entry is { task: TaskWithRelations; range: { start: string; end: string } } =>
        entry.range !== null &&
        entry.range.start <= weekEnd &&
        entry.range.end >= weekStart,
    )
    .sort((a, b) => {
      if (a.range.start !== b.range.start)
        return a.range.start < b.range.start ? -1 : 1;
      // Batang yang lebih panjang diletakkan lebih dulu supaya jalur atas
      // dipakai oleh rentang besar dan mudah terbaca.
      return b.range.end.localeCompare(a.range.end);
    });

  // laneEnds[i] = kolom terakhir yang sudah terpakai di jalur ke-i.
  const laneEnds: number[] = [];
  const segments: Segment[] = [];

  for (const { task, range } of overlapping) {
    const startIndex = week.findIndex((day) => toKey(day) >= range.start);
    const column = range.start <= weekStart ? 0 : Math.max(startIndex, 0);

    const endIndex = week.findIndex((day) => toKey(day) >= range.end);
    const lastColumn = range.end >= weekEnd ? 6 : Math.max(endIndex, column);

    const span = lastColumn - column + 1;

    let lane = laneEnds.findIndex((end) => end < column);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(lastColumn);
    } else {
      laneEnds[lane] = lastColumn;
    }

    segments.push({
      task,
      column,
      span,
      continuesLeft: range.start < weekStart,
      continuesRight: range.end > weekEnd,
      lane,
    });
  }

  return segments;
}

export function TaskCalendar({
  tasks,
  onOpenTask,
}: {
  tasks: TaskWithRelations[];
  onOpenTask: (task: TaskWithRelations) => void;
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const weeks = useMemo(() => {
    // Minggu dimulai Senin (weekStartsOn: 1), mengikuti kebiasaan kalender
    // kerja di Indonesia.
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    const chunks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) chunks.push(days.slice(i, i + 7));
    return chunks;
  }, [month]);

  const undated = tasks.filter((task) => rangeOf(task) === null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg">
          {format(month, "MMMM yyyy", { locale: localeId })}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-ghost px-2.5 py-1 text-xs"
            onClick={() => setMonth((current) => subMonths(current, 1))}
          >
            ← Sebelumnya
          </button>
          <button
            type="button"
            className="btn btn-ghost px-2.5 py-1 text-xs"
            onClick={() => setMonth(startOfMonth(new Date()))}
          >
            Hari ini
          </button>
          <button
            type="button"
            className="btn btn-ghost px-2.5 py-1 text-xs"
            onClick={() => setMonth((current) => addMonths(current, 1))}
          >
            Berikutnya →
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-line bg-surface-muted">
          {WEEKDAYS.map((day) => (
            <div key={day} className="eyebrow px-2 py-2 text-center">
              {day}
            </div>
          ))}
        </div>

        {weeks.map((week) => (
          <WeekRow
            key={toKey(week[0])}
            week={week}
            month={month}
            tasks={tasks}
            onOpenTask={onOpenTask}
          />
        ))}
      </div>

      {undated.length > 0 && (
        <section className="card p-4">
          <p className="eyebrow mb-2">Tanpa Tanggal ({undated.length})</p>
          <ul className="flex flex-wrap gap-2">
            {undated.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => onOpenTask(task)}
                  style={{
                    backgroundColor: CARD_COLORS[task.color]?.bg,
                    borderColor: CARD_COLORS[task.color]?.border,
                  }}
                  className="rounded border px-2.5 py-1 text-xs hover:brightness-95"
                >
                  {task.title}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function WeekRow({
  week,
  month,
  tasks,
  onOpenTask,
}: {
  week: Date[];
  month: Date;
  tasks: TaskWithRelations[];
  onOpenTask: (task: TaskWithRelations) => void;
}) {
  const segments = useMemo(() => layoutWeek(week, tasks), [week, tasks]);
  const laneCount = segments.reduce((max, seg) => Math.max(max, seg.lane + 1), 0);

  return (
    <div className="border-b border-line last:border-b-0">
      {/* Angka tanggal */}
      <div className="grid grid-cols-7">
        {week.map((day) => {
          const outside = !isSameMonth(day, month);
          return (
            <div
              key={toKey(day)}
              className={`border-r border-line px-1.5 pt-1.5 last:border-r-0 ${
                outside ? "bg-surface-muted/40" : ""
              }`}
            >
              <span
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-mono text-[11px] ${
                  isToday(day)
                    ? "bg-accent text-white"
                    : outside
                      ? "text-ink-subtle"
                      : "text-ink-muted"
                }`}
              >
                {format(day, "d")}
              </span>
            </div>
          );
        })}
      </div>

      {/* Batang tugas, ditumpuk di atas kisi yang sama supaya bisa
          membentang melewati batas hari. */}
      <div
        className="relative grid grid-cols-7 gap-y-1 px-1 pt-1 pb-2"
        style={{ minHeight: laneCount > 0 ? undefined : "1.75rem" }}
      >
        {segments.map((segment) => {
          const palette =
            CARD_COLORS[segment.task.color] ?? CARD_COLORS.blue;
          const done = segment.task.status === "done";

          return (
            <button
              key={`${segment.task.id}-${segment.column}`}
              type="button"
              onClick={() => onOpenTask(segment.task)}
              title={segment.task.title}
              style={{
                gridColumn: `${segment.column + 1} / span ${segment.span}`,
                gridRow: segment.lane + 1,
                backgroundColor: palette.bg,
                borderColor: palette.border,
                // Ujung yang bersambung ke minggu lain dibuat siku, ujung
                // yang benar-benar berakhir dibuat membulat — jadi terlihat
                // mana batang yang masih berlanjut.
                borderTopLeftRadius: segment.continuesLeft ? 0 : "0.25rem",
                borderBottomLeftRadius: segment.continuesLeft ? 0 : "0.25rem",
                borderTopRightRadius: segment.continuesRight ? 0 : "0.25rem",
                borderBottomRightRadius: segment.continuesRight ? 0 : "0.25rem",
              }}
              className={`mx-px truncate border px-1.5 py-1 text-left text-[11px] leading-tight hover:brightness-95 ${
                done ? "text-ink-muted line-through" : "text-ink"
              }`}
            >
              {segment.continuesLeft && "… "}
              {segment.task.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}

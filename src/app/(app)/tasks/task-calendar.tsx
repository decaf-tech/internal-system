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
import type { TaskWithRelations } from "@/lib/types";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/**
 * Kalender bulanan sederhana berbasis date-fns — tanpa library kalender,
 * karena yang dibutuhkan cuma menempatkan tugas pada tanggal tenggatnya.
 */
export function TaskCalendar({
  tasks,
  onOpenTask,
}: {
  tasks: TaskWithRelations[];
  onOpenTask: (task: TaskWithRelations) => void;
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const days = useMemo(() => {
    // Minggu dimulai Senin (weekStartsOn: 1), mengikuti kebiasaan kalender
    // kerja di Indonesia.
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const byDate = useMemo(() => {
    const map = new Map<string, TaskWithRelations[]>();
    for (const task of tasks) {
      if (!task.due_date) continue;
      const list = map.get(task.due_date) ?? [];
      list.push(task);
      map.set(task.due_date, list);
    }
    return map;
  }, [tasks]);

  const undated = tasks.filter((task) => !task.due_date);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
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

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayTasks = byDate.get(key) ?? [];
            const outside = !isSameMonth(day, month);

            return (
              <div
                key={key}
                className={`min-h-24 border-r border-b border-line p-1.5 last:border-r-0 ${
                  outside ? "bg-surface-muted/50" : ""
                }`}
              >
                <span
                  className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full font-mono text-[11px] ${
                    isToday(day)
                      ? "bg-accent text-white"
                      : outside
                        ? "text-ink-subtle"
                        : "text-ink-muted"
                  }`}
                >
                  {format(day, "d")}
                </span>

                <ul className="space-y-1">
                  {dayTasks.map((task) => (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => onOpenTask(task)}
                        className={`block w-full truncate rounded px-1.5 py-1 text-left text-[11px] ${
                          task.status === "done"
                            ? "bg-forest-soft text-forest line-through"
                            : "bg-accent-soft text-accent hover:bg-accent hover:text-white"
                        }`}
                        title={task.title}
                      >
                        {task.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {undated.length > 0 && (
        <section className="card p-4">
          <p className="eyebrow mb-2">Tanpa Tenggat ({undated.length})</p>
          <ul className="flex flex-wrap gap-2">
            {undated.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => onOpenTask(task)}
                  className="rounded-md border border-line px-2.5 py-1 text-xs hover:border-accent hover:text-accent"
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

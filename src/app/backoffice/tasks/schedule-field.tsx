"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addMonths, format, isSameMonth, isToday, subMonths } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  WEEKDAY_LABELS_SHORT,
  dateKey,
  dayUnderPointer,
  monthWeeks,
  orderKeys,
  parseKey,
  rangeLength,
  shiftKey,
  todayKey,
} from "@/lib/date-range";

type Range = { start: string | null; due: string | null };

/**
 * Pemilih jadwal tugas: satu kisi bulan yang bisa disapu.
 *
 * Menggantikan dua `<input type="date">` terpisah. Dua kotak tanggal
 * memaksa orang membayangkan rentangnya lebih dulu lalu mengetiknya dua
 * kali; di sini rentangnya digambar langsung — tekan tanggal mulai, sapu
 * sampai tenggat, lepas. Sekali ketuk berarti tugas satu hari (cuma
 * tenggat), sesuai keputusan bahwa tanggal mulai memang opsional.
 *
 * Nilainya dikirim lewat dua input tersembunyi supaya `<form action>` di
 * sekitarnya tidak perlu tahu apa-apa soal komponen ini.
 */
export function ScheduleField({
  defaultStart,
  defaultDue,
}: {
  defaultStart?: string | null;
  defaultDue?: string | null;
}) {
  const [range, setRange] = useState<Range>({
    start: defaultStart ?? null,
    due: defaultDue ?? null,
  });

  // Bulan yang sedang dilihat: mulai dari tanggal yang sudah terisi kalau
  // ada, supaya membuka tugas lama tidak mendarat di bulan berjalan.
  const [month, setMonth] = useState(() =>
    parseKey(defaultDue ?? defaultStart ?? todayKey()),
  );

  // Seretan yang sedang berlangsung. Disimpan di ref juga karena listener
  // pointerup global membacanya di luar siklus render.
  const [dragging, setDragging] = useState<{
    anchor: string;
    hover: string;
  } | null>(null);
  const draggingRef = useRef<{ anchor: string; hover: string } | null>(null);

  function beginDrag(key: string) {
    const next = { anchor: key, hover: key };
    draggingRef.current = next;
    setDragging(next);
  }

  // Seretan diikuti lewat titik layar, bukan lewat onPointerEnter tiap sel:
  // di layar sentuh, pointer terkunci ke sel pertama yang disentuh, jadi
  // sel-sel berikutnya tidak pernah tahu jarinya lewat. Seretan bisa
  // berakhir di mana saja pula — termasuk di luar kisi — jadi pointerup
  // ditunggu di window, bukan di selnya.
  useEffect(() => {
    function move(event: PointerEvent) {
      const current = draggingRef.current;
      if (!current) return;

      const day = dayUnderPointer(event.clientX, event.clientY);
      if (!day || day === current.hover) return;

      const next = { ...current, hover: day };
      draggingRef.current = next;
      setDragging(next);
    }

    function finish() {
      const current = draggingRef.current;
      if (!current) return;
      draggingRef.current = null;
      setDragging(null);

      const { start, end } = orderKeys(current.anchor, current.hover);
      setRange(start === end ? { start: null, due: end } : { start, due: end });
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, []);

  const weeks = useMemo(() => monthWeeks(month), [month]);

  // Yang digambar: seretan yang sedang berjalan kalau ada, kalau tidak ya
  // nilai tersimpan. Jadi bilah birunya mengikuti jari sejak detik pertama.
  const painted = dragging
    ? orderKeys(dragging.anchor, dragging.hover)
    : range.due
      ? { start: range.start ?? range.due, end: range.due }
      : null;

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="label mb-0">Jadwal</span>
        <SummaryText range={range} />
      </div>

      <input type="hidden" name="start_date" value={range.start ?? ""} />
      <input type="hidden" name="due_date" value={range.due ?? ""} />

      <div className="rounded-md border border-line-strong bg-surface p-2">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <MonthButton onClick={() => setMonth((m) => subMonths(m, 1))} label="Bulan sebelumnya">
            ‹
          </MonthButton>
          <button
            type="button"
            onClick={() => setMonth(parseKey(todayKey()))}
            className="rounded px-2 py-0.5 text-xs font-medium text-ink hover:bg-surface-muted"
          >
            {format(month, "MMMM yyyy", { locale: localeId })}
          </button>
          <MonthButton onClick={() => setMonth((m) => addMonths(m, 1))} label="Bulan berikutnya">
            ›
          </MonthButton>
        </div>

        <div className="grid grid-cols-7">
          {WEEKDAY_LABELS_SHORT.map((day) => (
            <div
              key={day}
              className="pb-1 text-center font-mono text-[9px] tracking-wider text-ink-subtle uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        {/* touch-none: tanpa ini, menyapu tanggal di HP malah menggulir
            halaman dan rentangnya tidak pernah terbentuk. */}
        <div className="grid touch-none grid-cols-7 gap-y-px select-none">
          {weeks.flat().map((day) => {
            const key = dateKey(day);
            const outside = !isSameMonth(day, month);
            const inRange =
              painted !== null && key >= painted.start && key <= painted.end;
            const isStart = painted !== null && key === painted.start;
            const isEnd = painted !== null && key === painted.end;

            return (
              <button
                key={key}
                type="button"
                data-day={key}
                aria-pressed={inRange}
                aria-label={format(day, "d MMMM yyyy", { locale: localeId })}
                onPointerDown={(event) => {
                  event.preventDefault();
                  beginDrag(key);
                }}
                className={`h-8 text-[11px] transition-colors ${
                  isStart ? "rounded-l" : ""
                } ${isEnd ? "rounded-r" : ""} ${
                  inRange
                    ? "bg-accent font-medium text-white"
                    : outside
                      ? "text-ink-subtle hover:bg-surface-muted"
                      : "text-ink hover:bg-surface-muted"
                } ${
                  !inRange && isToday(day)
                    ? "font-medium text-accent underline underline-offset-2"
                    : ""
                }`}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex flex-wrap gap-1 border-t border-line pt-2">
          <Chip onClick={() => setRange({ start: null, due: todayKey() })}>
            Hari ini
          </Chip>
          <Chip onClick={() => setRange({ start: null, due: shiftKey(todayKey(), 1) })}>
            Besok
          </Chip>
          <Chip
            onClick={() =>
              setRange({ start: todayKey(), due: shiftKey(todayKey(), 6) })
            }
          >
            7 hari
          </Chip>
          {(range.start || range.due) && (
            <Chip onClick={() => setRange({ start: null, due: null })} muted>
              Hapus tanggal
            </Chip>
          )}
        </div>
      </div>

      <p className="mt-1 text-xs text-ink-subtle">
        Ketuk satu tanggal untuk tenggat, atau sapu beberapa tanggal untuk
        tugas yang berlangsung beberapa hari.
      </p>
    </div>
  );
}

function SummaryText({ range }: { range: Range }) {
  if (!range.due) {
    return <span className="text-xs text-ink-subtle">Tanpa tanggal</span>;
  }

  const due = format(parseKey(range.due), "d MMM", { locale: localeId });

  if (!range.start || range.start === range.due) {
    return <span className="font-mono text-xs text-ink">Tenggat {due}</span>;
  }

  const start = format(parseKey(range.start), "d MMM", { locale: localeId });
  return (
    <span className="font-mono text-xs text-ink">
      {start} → {due}{" "}
      <span className="text-ink-subtle">
        ({rangeLength(range.start, range.due)} hari)
      </span>
    </span>
  );
}

function MonthButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="h-7 w-7 rounded text-ink-muted hover:bg-surface-muted hover:text-ink"
    >
      {children}
    </button>
  );
}

function Chip({
  onClick,
  muted = false,
  children,
}: {
  onClick: () => void;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border border-line-strong px-2 py-1 text-[11px] transition-colors hover:bg-surface-muted ${
        muted ? "text-ink-subtle" : "text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

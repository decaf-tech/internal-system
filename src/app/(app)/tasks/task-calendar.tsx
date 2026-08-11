"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addMonths, format, isSameMonth, isToday, startOfMonth, subMonths } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  WEEKDAY_LABELS,
  WEEKDAY_LABELS_SHORT,
  dateKey,
  dayUnderPointer,
  keyDistance,
  monthWeeks,
  orderKeys,
  shiftKey,
  taskRange,
} from "@/lib/date-range";
import { eventOccurrenceKey, expandOccurrences, formatEventTime } from "@/lib/events";
import {
  CARD_COLORS,
  MEMBER_COLORS,
  memberColor,
  type EventOccurrence,
  type EventSeriesWithRelations,
  type TaskWithRelations,
} from "@/lib/types";
import { updateTaskSchedule } from "./actions";

/** Tugas beserta rentang yang sedang digambar (bisa berbeda dari database
 *  selama batangnya masih diseret). */
type Entry = { task: TaskWithRelations; start: string; end: string };

/** Satu potongan tugas di dalam satu baris minggu. */
type Segment = {
  entry: Entry;
  /** Kolom mulai dalam minggu itu, 0 = Senin. */
  column: number;
  span: number;
  /** Batang aslinya dimulai/berakhir di minggu sebelumnya/berikutnya. */
  continuesLeft: boolean;
  continuesRight: boolean;
  lane: number;
};

/** Apa yang sedang dilakukan ke sebuah batang. */
type DragMode = "move" | "start" | "end";

type BarDrag = {
  taskId: string;
  mode: DragMode;
  /** Rentang batang saat seretan dimulai. */
  fromStart: string;
  fromEnd: string;
  /** Hari yang berada tepat di bawah jari saat seretan dimulai. */
  grabbedAt: string;
  /** Rentang yang sedang digambar sekarang. */
  start: string;
  end: string;
  /** Sudah benar-benar bergeser? Kalau tidak, ini ketukan biasa. */
  moved: boolean;
};

/**
 * Susun batang tugas ke dalam jalur (lane) agar tidak saling tumpuk.
 * Serakah dan sederhana: tiap batang ditaruh di jalur kosong pertama —
 * cukup untuk beban kerja tim bertiga, tanpa perlu penjadwalan optimal.
 */
function layoutWeek(week: Date[], entries: Entry[]): Segment[] {
  const weekStart = dateKey(week[0]);
  const weekEnd = dateKey(week[6]);

  const overlapping = entries
    .filter((entry) => entry.start <= weekEnd && entry.end >= weekStart)
    .sort((a, b) => {
      if (a.start !== b.start) return a.start < b.start ? -1 : 1;
      // Batang yang lebih panjang diletakkan lebih dulu supaya jalur atas
      // dipakai oleh rentang besar dan mudah terbaca.
      return b.end.localeCompare(a.end);
    });

  // laneEnds[i] = kolom terakhir yang sudah terpakai di jalur ke-i.
  const laneEnds: number[] = [];
  const segments: Segment[] = [];

  for (const entry of overlapping) {
    const startIndex = week.findIndex((day) => dateKey(day) >= entry.start);
    const column = entry.start <= weekStart ? 0 : Math.max(startIndex, 0);

    const endIndex = week.findIndex((day) => dateKey(day) >= entry.end);
    const lastColumn = entry.end >= weekEnd ? 6 : Math.max(endIndex, column);

    const span = lastColumn - column + 1;

    let lane = laneEnds.findIndex((end) => end < column);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(lastColumn);
    } else {
      laneEnds[lane] = lastColumn;
    }

    segments.push({
      entry,
      column,
      span,
      continuesLeft: entry.start < weekStart,
      continuesRight: entry.end > weekEnd,
      lane,
    });
  }

  return segments;
}

/** Rentang tanggal yang sedang disapu user untuk membuat tugas baru. */
type Selection = { anchor: string; hover: string };

export function TaskCalendar({
  tasks,
  eventSeries,
  onOpenTask,
  onOpenEvent,
  onCreateEvent,
  onCreate,
}: {
  tasks: TaskWithRelations[];
  eventSeries: EventSeriesWithRelations[];
  onOpenTask: (task: TaskWithRelations) => void;
  onOpenEvent: (occurrence: EventOccurrence) => void;
  onCreateEvent: () => void;
  /**
   * Dipanggil saat sebuah tanggal diklik atau serangkaian tanggal diseret.
   * `start` null berarti tugas satu hari — cuma punya tenggat, sesuai
   * keputusan bahwa tanggal mulai memang opsional.
   */
  onCreate: (range: { start: string | null; due: string }) => void;
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selection, setSelection] = useState<Selection | null>(null);
  const [drag, setDrag] = useState<BarDrag | null>(null);

  /**
   * Jadwal hasil seretan yang sudah dikirim ke server tapi datanya belum
   * kembali. Tanpa ini, batang akan melompat balik ke tempat semula selama
   * sepersekian detik menunggu revalidate — gerakan yang paling terasa
   * salah justru di jaringan lambat.
   */
  const [pending, setPending] = useState<
    Record<string, { start: string | null; due: string }>
  >({});

  // Cermin dari state yang dibaca listener global, yang jalan di luar
  // siklus render dan tidak bisa menunggu React menyusul.
  const selectionRef = useRef<Selection | null>(null);
  const dragRef = useRef<BarDrag | null>(null);

  const select = useCallback((next: Selection | null) => {
    selectionRef.current = next;
    setSelection(next);
  }, []);

  const commitDrag = useCallback(
    (finished: BarDrag) => {
      const single = finished.start === finished.end;
      const start = single ? null : finished.start;
      const due = finished.end;

      setPending((current) => ({
        ...current,
        [finished.taskId]: { start, due },
      }));

      updateTaskSchedule(finished.taskId, start, due)
        .then((result) => {
          if (result.error) {
            // Batalkan tampilan optimistis: lebih baik batangnya melompat
            // balik daripada layar menampilkan jadwal yang tidak tersimpan.
            setPending((current) => {
              const next = { ...current };
              delete next[finished.taskId];
              return next;
            });
            alert(result.error);
          }
        })
        .catch(() => {
          setPending((current) => {
            const next = { ...current };
            delete next[finished.taskId];
            return next;
          });
        });
    },
    [],
  );

  // Seretan diakhiri di mana pun tombol/jari dilepas, termasuk di luar
  // kalender — kalau hanya mengandalkan onPointerUp di sel, seretan yang
  // berakhir di luar kisi akan menggantung selamanya.
  useEffect(() => {
    function move(event: PointerEvent) {
      const current = dragRef.current;

      // Tidak sedang menggeser batang? Berarti ini sapuan untuk membuat
      // tugas baru. Keduanya dilayani listener yang sama supaya perilakunya
      // tidak bisa berbeda diam-diam.
      if (!current) {
        const sweeping = selectionRef.current;
        if (!sweeping) return;
        const over = dayUnderPointer(event.clientX, event.clientY);
        if (!over || over === sweeping.hover) return;
        select({ ...sweeping, hover: over });
        return;
      }

      const day = dayUnderPointer(event.clientX, event.clientY);
      if (!day) return;

      let next: { start: string; end: string };

      if (current.mode === "move") {
        const delta = keyDistance(current.grabbedAt, day);
        next = {
          start: shiftKey(current.fromStart, delta),
          end: shiftKey(current.fromEnd, delta),
        };
      } else if (current.mode === "start") {
        // Menarik ujung kiri melewati ujung kanan tidak membalik batangnya;
        // batang cuma menciut sampai satu hari lalu berhenti.
        next = {
          start: day <= current.fromEnd ? day : current.fromEnd,
          end: current.fromEnd,
        };
      } else {
        next = {
          start: current.fromStart,
          end: day >= current.fromStart ? day : current.fromStart,
        };
      }

      if (next.start === current.start && next.end === current.end) return;

      const updated: BarDrag = { ...current, ...next, moved: true };
      dragRef.current = updated;
      setDrag(updated);
    }

    function finish() {
      const currentDrag = dragRef.current;
      if (currentDrag) {
        dragRef.current = null;
        setDrag(null);
        // Seretan yang tidak pernah berpindah hari adalah ketukan biasa;
        // yang diharapkan orang dari mengetuk batang adalah membuka tugasnya.
        if (currentDrag.moved) commitDrag(currentDrag);
        else {
          const task = tasks.find((item) => item.id === currentDrag.taskId);
          if (task) onOpenTask(task);
        }
        return;
      }

      const currentSelection = selectionRef.current;
      if (!currentSelection) return;

      selectionRef.current = null;
      setSelection(null);

      const { start, end } = orderKeys(
        currentSelection.anchor,
        currentSelection.hover,
      );
      onCreate({ start: start === end ? null : start, due: end });
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [commitDrag, onCreate, onOpenTask, select, tasks]);

  const weeks = useMemo(() => monthWeeks(month), [month]);

  // Kemunculan rapat dihitung ulang untuk rentang kisi yang sedang
  // ditampilkan — bulan berikutnya dibuka, dihitung lagi, murah karena
  // cuma menjalankan aritmatika tanggal, bukan query baru ke server.
  const occurrencesByDay = useMemo(() => {
    const start = dateKey(weeks[0][0]);
    const end = dateKey(weeks[weeks.length - 1][6]);
    const occurrences = expandOccurrences(eventSeries, start, end);

    const map = new Map<string, EventOccurrence[]>();
    for (const occurrence of occurrences) {
      const list = map.get(occurrence.occurrenceDate) ?? [];
      list.push(occurrence);
      map.set(occurrence.occurrenceDate, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (a.start_time === b.start_time) return a.title.localeCompare(b.title);
        if (!a.start_time) return -1;
        if (!b.start_time) return 1;
        return a.start_time.localeCompare(b.start_time);
      });
    }
    return map;
  }, [eventSeries, weeks]);

  // Rentang yang dipakai menggambar: hasil seretan yang sedang berjalan
  // menang atas jadwal optimistis, yang menang atas data dari server.
  const entries = useMemo<Entry[]>(() => {
    const result: Entry[] = [];

    for (const task of tasks) {
      if (drag && drag.taskId === task.id) {
        result.push({ task, start: drag.start, end: drag.end });
        continue;
      }

      const optimistic = pending[task.id];
      const range = optimistic
        ? orderKeys(optimistic.start ?? optimistic.due, optimistic.due)
        : taskRange(task);

      if (range) result.push({ task, start: range.start, end: range.end });
    }

    return result;
  }, [tasks, drag, pending]);

  const undated = useMemo(
    () => tasks.filter((task) => taskRange(task) === null && !pending[task.id]),
    [tasks, pending],
  );

  const startBarDrag = useCallback(
    (event: React.PointerEvent, entry: Entry, mode: DragMode) => {
      event.preventDefault();
      event.stopPropagation();

      const next: BarDrag = {
        taskId: entry.task.id,
        mode,
        fromStart: entry.start,
        fromEnd: entry.end,
        grabbedAt:
          dayUnderPointer(event.clientX, event.clientY) ?? entry.start,
        start: entry.start,
        end: entry.end,
        moved: false,
      };

      dragRef.current = next;
      setDrag(next);
    },
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg">
            {format(month, "MMMM yyyy", { locale: localeId })}
          </h2>
          <p className="text-xs text-ink-subtle">
            Sapu beberapa tanggal untuk membuat tugas. Batang yang sudah ada
            bisa digeser, dan ujungnya ditarik untuk memanjangkan atau
            memendekkan rentang.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Bulan sebelumnya"
            className="btn btn-ghost px-2.5 py-1 text-xs"
            onClick={() => setMonth((current) => subMonths(current, 1))}
          >
            ←
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
            aria-label="Bulan berikutnya"
            className="btn btn-ghost px-2.5 py-1 text-xs"
            onClick={() => setMonth((current) => addMonths(current, 1))}
          >
            →
          </button>
          <button
            type="button"
            className="btn btn-accent px-2.5 py-1 text-xs"
            onClick={onCreateEvent}
          >
            + Rapat
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-line bg-surface-muted">
          {WEEKDAY_LABELS.map((day, index) => (
            <div key={day} className="eyebrow px-1 py-2 text-center">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{WEEKDAY_LABELS_SHORT[index]}</span>
            </div>
          ))}
        </div>

        {weeks.map((week) => (
          <WeekRow
            key={dateKey(week[0])}
            week={week}
            month={month}
            entries={entries}
            occurrencesByDay={occurrencesByDay}
            selection={selection}
            dragging={drag !== null}
            draggingTaskId={drag?.taskId ?? null}
            onSelectStart={(day) => select({ anchor: day, hover: day })}
            onBarPointerDown={startBarDrag}
            onOpenEvent={onOpenEvent}
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
  entries,
  occurrencesByDay,
  selection,
  dragging,
  draggingTaskId,
  onSelectStart,
  onBarPointerDown,
  onOpenEvent,
}: {
  week: Date[];
  month: Date;
  entries: Entry[];
  occurrencesByDay: Map<string, EventOccurrence[]>;
  selection: Selection | null;
  dragging: boolean;
  draggingTaskId: string | null;
  onSelectStart: (day: string) => void;
  onBarPointerDown: (
    event: React.PointerEvent,
    entry: Entry,
    mode: DragMode,
  ) => void;
  onOpenEvent: (occurrence: EventOccurrence) => void;
}) {
  const segments = useMemo(() => layoutWeek(week, entries), [week, entries]);
  const bounds = selection
    ? orderKeys(selection.anchor, selection.hover)
    : null;

  return (
    // Tinggi minimum menjaga bentuk kalender tetap terbaca sebagai kalender
    // walaupun bulan itu belum ada tugas sama sekali.
    <div className="relative min-h-24 border-b border-line last:border-b-0">
      {/* Lapisan paling bawah: satu tombol per hari, setinggi barisnya.
          Ini yang membuat seluruh sel — bukan cuma angka tanggalnya —
          bisa diklik dan diseret untuk membuat tugas, sekaligus jadi
          patokan tanggal saat sebuah batang diseret di atasnya. */}
      <div className="absolute inset-0 grid grid-cols-7">
        {week.map((day) => {
          const key = dateKey(day);
          const outside = !isSameMonth(day, month);
          const selected =
            bounds !== null && key >= bounds.start && key <= bounds.end;

          return (
            <button
              key={key}
              type="button"
              data-day={key}
              aria-label={`Tambah tugas ${format(day, "d MMMM yyyy", { locale: localeId })}`}
              onPointerDown={(event) => {
                // Cegah seleksi teks saat menyeret beberapa hari.
                event.preventDefault();
                onSelectStart(key);
              }}
              className={`touch-none border-r border-line transition-colors last:border-r-0 ${
                selected
                  ? "bg-accent-soft"
                  : outside
                    ? "bg-surface-muted/40 hover:bg-surface-muted"
                    : "hover:bg-surface-muted/60"
              }`}
            />
          );
        })}
      </div>

      {/* Angka tanggal. Tidak menangkap tetikus supaya klik tetap jatuh ke
          lapisan sel di bawahnya. */}
      <div className="pointer-events-none relative grid grid-cols-7">
        {week.map((day) => {
          const outside = !isSameMonth(day, month);
          return (
            <div key={dateKey(day)} className="px-1.5 pt-1.5">
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

      {/* Rapat: pil kecil per hari, tidak membentang seperti batang tugas —
          pengulangannya sudah diwakili oleh munculnya lagi di hari lain,
          bukan oleh rentang visual. Ditaruh di atas angka tanggal, di
          bawah batang tugas, supaya urutan baca dari atas ke bawah adalah
          tanggal → rapat hari itu → pekerjaan yang sedang berjalan. */}
      <div className="pointer-events-none relative grid grid-cols-7 gap-x-1 px-1">
        {week.map((day) => {
          const key = dateKey(day);
          const dayOccurrences = occurrencesByDay.get(key) ?? [];
          const shown = dayOccurrences.slice(0, 2);
          const overflow = dayOccurrences.length - shown.length;

          if (dayOccurrences.length === 0) return <div key={key} />;

          return (
            <div key={key} className="flex flex-col gap-0.5 pb-0.5">
              {shown.map((occurrence) => {
                const palette =
                  CARD_COLORS[occurrence.series.color] ?? CARD_COLORS.blue;
                return (
                  <button
                    key={eventOccurrenceKey(occurrence)}
                    type="button"
                    onClick={() => onOpenEvent(occurrence)}
                    title={occurrence.title}
                    style={{
                      backgroundColor: palette.bg,
                      borderColor: palette.border,
                    }}
                    className="pointer-events-auto truncate rounded border px-1 py-0.5 text-left text-[10px] leading-tight text-ink"
                  >
                    {occurrence.start_time && (
                      <span className="font-mono text-ink-muted">
                        {formatEventTime(occurrence.start_time)}{" "}
                      </span>
                    )}
                    {occurrence.title}
                  </button>
                );
              })}
              {overflow > 0 && (
                <span className="px-1 font-mono text-[9px] text-ink-subtle">
                  +{overflow} lainnya
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Batang tugas, ditumpuk di atas kisi yang sama supaya bisa
          membentang melewati batas hari. Selama ada batang yang diseret,
          seluruh lapisan ini tembus-pandang bagi tetikus supaya sel hari di
          bawahnya tetap bisa dibaca sebagai tanggal tujuan. */}
      <div className="pointer-events-none relative grid grid-cols-7 gap-y-1 px-1 pt-1 pb-2">
        {segments.map((segment) => (
          <Bar
            key={`${segment.entry.task.id}-${segment.column}`}
            segment={segment}
            dragging={draggingTaskId === segment.entry.task.id}
            interactive={!dragging}
            onPointerDown={onBarPointerDown}
          />
        ))}
      </div>
    </div>
  );
}

function Bar({
  segment,
  dragging,
  interactive,
  onPointerDown,
}: {
  segment: Segment;
  dragging: boolean;
  interactive: boolean;
  onPointerDown: (
    event: React.PointerEvent,
    entry: Entry,
    mode: DragMode,
  ) => void;
}) {
  const { entry, column, span, continuesLeft, continuesRight, lane } = segment;
  const task = entry.task;
  const palette = CARD_COLORS[task.color] ?? CARD_COLORS.blue;
  // Batang cuma punya ruang untuk satu garis warna — orang pertama yang
  // mewakili, sisanya tetap kebaca lewat judul tooltip di bawah.
  const person = MEMBER_COLORS[memberColor(task.assignees[0] ?? null)];
  const done = task.status === "done";
  const assigneeNames = task.assignees.map((member) => member.full_name).join(", ");

  // Selama ada batang yang sedang diseret, semua batang berhenti menangkap
  // tetikus (`interactive` false). Kalau tidak, batang yang kebetulan lewat
  // di bawah jari akan terbaca sebagai sasaran, bukan sel harinya, dan
  // tanggalnya melompat-lompat.
  return (
    <div
      style={{
        gridColumn: `${column + 1} / span ${span}`,
        gridRow: lane + 1,
        backgroundColor: palette.bg,
        borderColor: palette.border,
        // Ujung yang bersambung ke minggu lain dibuat siku, ujung yang
        // benar-benar berakhir dibuat membulat — jadi terlihat mana batang
        // yang masih berlanjut.
        borderTopLeftRadius: continuesLeft ? 0 : "0.25rem",
        borderBottomLeftRadius: continuesLeft ? 0 : "0.25rem",
        borderTopRightRadius: continuesRight ? 0 : "0.25rem",
        borderBottomRightRadius: continuesRight ? 0 : "0.25rem",
        opacity: dragging ? 0.75 : 1,
      }}
      className={`relative mx-px flex h-6 touch-none items-center border select-none ${
        interactive ? "pointer-events-auto" : "pointer-events-none"
      } ${dragging ? "shadow-md" : ""}`}
      onPointerDown={(event) => {
        if (!interactive) return;
        onPointerDown(event, entry, "move");
      }}
      title={`${task.title}${assigneeNames ? ` — ${assigneeNames}` : ""}`}
    >
      {/* Garis warna orangnya di ujung kiri: pembagian tugas kebaca dari
          kalender tanpa harus membuka satu per satu. */}
      {task.assignees.length > 0 && !continuesLeft && (
        <span
          aria-hidden
          style={{ backgroundColor: person.solid }}
          className="ml-0.5 h-3.5 w-1 shrink-0 rounded-full"
        />
      )}

      <span
        className={`mx-1 flex-1 truncate text-[11px] leading-tight ${
          done ? "text-ink-muted line-through" : "text-ink"
        }`}
      >
        {continuesLeft && "… "}
        {task.title}
      </span>

      {/* Pegangan ujung. Hanya muncul di ujung yang benar-benar berakhir di
          minggu ini — menarik ujung yang "bersambung" akan berarti mengubah
          tanggal yang tidak terlihat di layar. */}
      {!continuesLeft && (
        <Handle
          side="left"
          onPointerDown={(event) => {
            if (!interactive) return;
            onPointerDown(event, entry, "start");
          }}
        />
      )}
      {!continuesRight && (
        <Handle
          side="right"
          onPointerDown={(event) => {
            if (!interactive) return;
            onPointerDown(event, entry, "end");
          }}
        />
      )}
    </div>
  );
}

function Handle({
  side,
  onPointerDown,
}: {
  side: "left" | "right";
  onPointerDown: (event: React.PointerEvent) => void;
}) {
  return (
    <span
      role="presentation"
      onPointerDown={onPointerDown}
      // Lebarnya dua kali lipat di layar sentuh: 8px cukup untuk kursor
      // yang presisi, tidak untuk ujung jari.
      className={`absolute inset-y-0 w-3 cursor-ew-resize sm:w-2 ${
        side === "left" ? "left-0" : "right-0"
      }`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-1 w-0.5 rounded-full bg-ink/20 ${
          side === "left" ? "left-0.5" : "right-0.5"
        }`}
      />
    </span>
  );
}

import { getDay } from "date-fns";
import { dateKey, parseKey, shiftKey } from "@/lib/date-range";
import type { EventOccurrence, EventSeriesWithRelations } from "@/lib/types";

/** `date-fns` `getDay`: 0=Minggu..6=Sabtu. Basis kita: 1=Senin..7=Minggu. */
function isoWeekday(date: Date) {
  const day = getDay(date);
  return day === 0 ? 7 : day;
}

/**
 * Kemunculan sebuah seri rapat di dalam satu rentang tanggal.
 *
 * Ini yang menggantikan "satu baris per tanggal": pola pengulangannya
 * (harian/mingguan + batas akhir opsional) dihitung ulang tiap kali
 * kalender dirender, dibatasi ke rentang yang sedang dilihat user — jadi
 * "tanpa batas akhir" tidak pernah berarti baris tak terbatas di memori.
 *
 * Pengecualian (`event_exceptions`) diterapkan di sini juga: kemunculan
 * yang dibatalkan tidak ikut dikembalikan, dan yang punya jam/judul
 * pengganti memakai nilai penggantinya.
 */
export function occurrencesInRange(
  series: EventSeriesWithRelations,
  rangeStart: string,
  rangeEnd: string,
): EventOccurrence[] {
  const exceptionByDate = new Map(
    series.exceptions.map((exception) => [exception.occurrence_date, exception]),
  );

  const effectiveEnd =
    series.recurrence_until && series.recurrence_until < rangeEnd
      ? series.recurrence_until
      : rangeEnd;

  const dates: string[] = [];

  if (series.recurrence === "none") {
    if (series.event_date >= rangeStart && series.event_date <= rangeEnd) {
      dates.push(series.event_date);
    }
  } else if (series.recurrence === "daily") {
    let cursor = series.event_date > rangeStart ? series.event_date : rangeStart;
    while (cursor <= effectiveEnd) {
      dates.push(cursor);
      cursor = shiftKey(cursor, 1);
    }
  } else {
    // Mingguan: hari-hari yang dipilih, atau hari dari event_date kalau
    // tidak ada yang dipilih eksplisit.
    const weekdays = new Set(
      series.recurrence_weekdays && series.recurrence_weekdays.length > 0
        ? series.recurrence_weekdays
        : [isoWeekday(parseKey(series.event_date))],
    );

    let cursor = series.event_date > rangeStart ? series.event_date : rangeStart;
    while (cursor <= effectiveEnd) {
      if (weekdays.has(isoWeekday(parseKey(cursor)))) dates.push(cursor);
      cursor = shiftKey(cursor, 1);
    }
  }

  const occurrences: EventOccurrence[] = [];
  for (const date of dates) {
    const exception = exceptionByDate.get(date);
    if (exception?.cancelled) continue;

    occurrences.push({
      series,
      occurrenceDate: date,
      title: exception?.title ?? series.title,
      start_time: exception?.start_time ?? series.start_time,
      end_time: exception?.end_time ?? series.end_time,
      isRecurring: series.recurrence !== "none",
    });
  }

  return occurrences;
}

/** Sama seperti `occurrencesInRange`, digabung untuk banyak seri sekaligus. */
export function expandOccurrences(
  seriesList: EventSeriesWithRelations[],
  rangeStart: string,
  rangeEnd: string,
): EventOccurrence[] {
  return seriesList.flatMap((series) =>
    occurrencesInRange(series, rangeStart, rangeEnd),
  );
}

/** "09:00" → "09.00", format jam yang lazim ditulis orang Indonesia. */
export function formatEventTime(time: string | null) {
  if (!time) return null;
  return time.slice(0, 5).replace(":", ".");
}

export function eventOccurrenceKey(occurrence: EventOccurrence) {
  return `${occurrence.series.id}-${occurrence.occurrenceDate}`;
}

/** Dipakai memberi nama tampilan bulan saat menghitung batas kisi kalender. */
export function monthRangeKeys(weeks: Date[][]) {
  const first = weeks[0][0];
  const last = weeks[weeks.length - 1][6];
  return { start: dateKey(first), end: dateKey(last) };
}

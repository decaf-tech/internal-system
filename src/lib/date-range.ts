import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";

/**
 * Tanggal di sistem ini selalu berupa string "yyyy-MM-dd", bukan Date.
 *
 * Alasannya: kolomnya `date` di Postgres (tanpa jam, tanpa zona waktu), dan
 * begitu diubah jadi Date, JavaScript menempelkan zona waktu lokal —
 * "2026-08-12" bisa terbaca jadi 11 Agustus di browser yang zonanya di
 * sebelah barat. String yang dibandingkan apa adanya tidak punya masalah
 * itu, dan urutan leksikografisnya kebetulan sama dengan urutan waktunya.
 *
 * Modul ini yang memegang aturan itu supaya kalender, pemilih rentang, dan
 * server action memakai perhitungan yang persis sama.
 */

/**
 * Hari yang berada di bawah sebuah titik layar, dibaca dari atribut
 * `data-day` sel kalender.
 *
 * Ini satu-satunya cara yang benar untuk mengikuti seretan di layar sentuh.
 * Saat jari menyentuh sebuah elemen, browser mengunci pointer itu ke elemen
 * tersebut (implicit pointer capture), sehingga `onPointerEnter` sel-sel
 * berikutnya tidak pernah terpanggil — sapuan jari akan selalu berakhir
 * sebagai satu hari saja. Membaca ulang elemen di bawah titiknya tidak
 * bergantung pada itu, dan sekalian bekerja sama untuk tetikus.
 *
 * `elementsFromPoint` (jamak) karena elemen yang sedang diseret sering
 * berada tepat di atas sel harinya sendiri.
 */
export function dayUnderPointer(x: number, y: number): string | null {
  for (const element of document.elementsFromPoint(x, y)) {
    const day = element.closest("[data-day]")?.getAttribute("data-day");
    if (day) return day;
  }
  return null;
}

/** Kunci tanggal dari objek Date lokal. */
export function dateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

/** Kebalikannya — tengah malam waktu lokal, bukan UTC. */
export function parseKey(key: string) {
  return new Date(`${key}T00:00:00`);
}

export function todayKey() {
  return dateKey(new Date());
}

/** Geser sekian hari; hasilnya tetap berupa kunci tanggal. */
export function shiftKey(key: string, days: number) {
  return dateKey(addDays(parseKey(key), days));
}

/** Selisih hari kalender: "12" → "15" = 3. */
export function keyDistance(from: string, to: string) {
  return differenceInCalendarDays(parseKey(to), parseKey(from));
}

/** Jumlah hari yang dicakup rentang, termasuk hari pertama & terakhir. */
export function rangeLength(start: string, end: string) {
  return keyDistance(start, end) + 1;
}

/** Urutkan dua kunci jadi { start, end } — arah seretan tidak penting. */
export function orderKeys(a: string, b: string) {
  return a <= b ? { start: a, end: b } : { start: b, end: a };
}

/**
 * Kisi satu bulan, dipotong per minggu Senin–Minggu. Selalu dimulai Senin
 * mengikuti kebiasaan kalender kerja di Indonesia, dan selalu memuat hari
 * dari bulan tetangga di baris pertama/terakhir supaya bentuknya persegi.
 */
export function monthWeeks(month: Date): Date[][] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

export const WEEKDAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/**
 * Versi dua huruf untuk kolom sempit. Bukan satu huruf: "S" dipakai Senin,
 * Selasa, dan Sabtu sekaligus — tiga kolom yang berlabel sama sekaligus.
 */
export const WEEKDAY_LABELS_SHORT = ["Sn", "Sl", "Rb", "Km", "Jm", "Sb", "Mg"];

/**
 * Rentang efektif sebuah tugas untuk digambar di kalender. Tugas yang cuma
 * punya tenggat dianggap berlangsung satu hari — keputusan lama bahwa
 * tanggal mulai memang opsional (PRD §2.5), bukan kekurangan data.
 */
export function taskRange(task: {
  start_date: string | null;
  due_date: string | null;
}) {
  const start = task.start_date ?? task.due_date;
  const end = task.due_date ?? task.start_date;
  if (!start || !end) return null;
  return orderKeys(start, end);
}

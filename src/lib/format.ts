import { format, formatDistanceToNowStrict, isPast, isToday } from "date-fns";
import { id as localeId } from "date-fns/locale";

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatRupiah(amount: number) {
  return rupiah.format(amount);
}

/** "Rp1,2 jt" — untuk kolom sempit di HP, di mana angka penuh terpotong. */
export function formatRupiahShort(amount: number) {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (abs >= 1_000_000_000)
    return `${sign}Rp${trimZero(abs / 1_000_000_000)} M`;
  if (abs >= 1_000_000) return `${sign}Rp${trimZero(abs / 1_000_000)} jt`;
  if (abs >= 1_000) return `${sign}Rp${trimZero(abs / 1_000)} rb`;
  return formatRupiah(amount);
}

function trimZero(value: number) {
  return value.toFixed(1).replace(/[.,]0$/, "").replace(".", ",");
}

/**
 * Angka rupiah yang diketik manusia: "150.000", "1.500.000,50", "Rp 75000".
 * Titik dianggap pemisah ribuan dan koma pemisah desimal — kebiasaan
 * Indonesia, bukan kebalikannya seperti yang diasumsikan `Number()`.
 *
 * Mengembalikan null kalau hasilnya bukan angka positif, supaya pemanggil
 * yang memutuskan pesan kesalahannya.
 */
export function parseRupiah(input: FormDataEntryValue | null | undefined) {
  const cleaned = String(input ?? "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const amount = Number(cleaned);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

/**
 * Tanggal dan jam selalu ditampilkan dalam WIB, bukan zona waktu mesin
 * yang menggambarnya.
 *
 * Tanpa ini, `format()` dari date-fns memakai zona waktu lokal runtime:
 * di Vercel itu UTC, jadi log aktivitas tampil tujuh jam lebih awal dari
 * jam Jakarta. Di browser anggota tim yang sedang di luar negeri,
 * melesetnya ke arah lain. Tim ini bekerja dengan satu jam dinding —
 * jadi jam dinding itu yang dipakai, di mana pun kodenya berjalan.
 *
 * Caranya: ambil komponen waktu Jakarta lewat Intl, lalu susun ulang jadi
 * Date yang komponen *lokalnya* sama persis. date-fns kemudian memformat
 * angka yang sudah benar, dan pola serta locale Indonesianya tetap utuh.
 */
const jakartaParts = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function toJakarta(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return date;

  const part: Record<string, number> = {};
  for (const { type, value: raw } of jakartaParts.formatToParts(date)) {
    if (type !== "literal") part[type] = Number(raw);
  }

  return new Date(
    part.year,
    part.month - 1,
    part.day,
    // Tengah malam Jakarta dilaporkan Intl sebagai jam 24, bukan 0.
    part.hour % 24,
    part.minute,
    part.second,
  );
}

/**
 * "2026-08-12" — tanggal hari ini menurut jam dinding Jakarta, bentuk yang
 * sama dengan kolom `date` di database.
 *
 * `new Date().toISOString().slice(0, 10)` yang dipakai di beberapa tempat
 * lain memberi tanggal UTC. Untuk mengisi nilai awal form selisih itu tidak
 * terasa, tapi untuk *membandingkan* ("follow-up yang jatuh tempo hari
 * ini") ia salah setiap hari antara tengah malam dan jam 7 pagi WIB —
 * tepat pada jam-jam pertama hari kerja, dan justru pada fitur yang
 * gunanya mengingatkan supaya tidak ada yang terlewat.
 */
export function todayJakarta() {
  return format(toJakarta(new Date()), "yyyy-MM-dd");
}

/** "12 Agu 2026" — dalam WIB. */
export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return format(toJakarta(value), "d MMM yyyy", { locale: localeId });
}

/** "12 Agustus 2026, 14:30" — dalam WIB. */
export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return format(toJakarta(value), "d MMMM yyyy, HH:mm", { locale: localeId });
}

/** "3 hari lagi" / "2 hari lalu" — untuk deadline di kartu task. */
export function formatRelativeDue(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);
  if (isToday(date)) return { text: "Hari ini", overdue: false };

  const distance = formatDistanceToNowStrict(date, { locale: localeId });
  const overdue = isPast(date);

  return {
    text: overdue ? `Telat ${distance}` : `${distance} lagi`,
    overdue,
  };
}

/** "1,4 MB" */
export function formatFileSize(bytes: number | null | undefined) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1).replace(".", ",")} ${units[unit]}`;
}

/** Inisial untuk avatar: "Nafidz Abiyyu" -> "NA" */
export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

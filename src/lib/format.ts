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

/** "12 Agu 2026" */
export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return format(new Date(value), "d MMM yyyy", { locale: localeId });
}

/** "12 Agustus 2026, 14:30" */
export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return format(new Date(value), "d MMMM yyyy, HH:mm", { locale: localeId });
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
  const units = ["B", "KB", "MB", "GB"];
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

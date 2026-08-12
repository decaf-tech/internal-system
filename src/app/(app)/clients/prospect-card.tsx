"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { parseKey } from "@/lib/date-range";
import { formatRupiahShort } from "@/lib/format";
import type { ProspectWithRelations } from "@/lib/types";
import { MemberAvatar } from "@/components/member-avatar";

/**
 * Tautan WhatsApp dari nomor yang diketik manusia: "0822-1234-5678",
 * "+62 822 1234 5678", "62822…" — wa.me cuma mau angka dengan kode negara,
 * tanpa tanda apa pun. Nol di depan berarti nomor lokal, jadi diganti 62.
 *
 * Mengembalikan null kalau sisanya terlalu pendek untuk jadi nomor —
 * lebih baik tidak ada tombol daripada tombol yang membuka chat kosong.
 */
export function whatsappLink(phone: string | null) {
  if (!phone) return null;

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;

  const normalized = digits.startsWith("0")
    ? `62${digits.slice(1)}`
    : digits.startsWith("62")
      ? digits
      : `62${digits}`;

  return `https://wa.me/${normalized}`;
}

/**
 * Tampilan kartu prospek — dipakai di kolom maupun saat sedang diseret.
 *
 * `today` datang dari server (tanggal Jakarta), bukan dihitung di sini:
 * kartunya di-render di server lebih dulu, dan jam browser yang berbeda
 * zona akan membuat sorotan "jatuh tempo" berubah saat hidrasi.
 */
export function ProspectCardBody({
  prospect,
  today,
}: {
  prospect: ProspectWithRelations;
  today: string;
}) {
  const followUp = prospect.next_follow_up_date;
  // Perbandingan string apa adanya — keduanya "yyyy-MM-dd", dan urutan
  // leksikografisnya sama dengan urutan waktunya (lihat lib/date-range).
  const due = followUp !== null && followUp <= today;
  // Tahap akhir tidak perlu disorot: follow-up prospek yang sudah menang
  // atau kalah tidak menuntut apa-apa lagi.
  const closed = prospect.stage === "menang" || prospect.stage === "kalah";

  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-1.5">
        <span className="min-w-0 flex-1 text-[13px] leading-snug font-medium text-ink">
          {prospect.name}
        </span>
        <MemberAvatar member={prospect.owner} size="sm" />
      </div>

      {prospect.company && (
        <p className="truncate text-[11px] text-ink-muted">{prospect.company}</p>
      )}

      {prospect.stage === "kalah" && prospect.lost_reason && (
        <p className="line-clamp-2 text-[11px] leading-snug text-ink-subtle italic">
          {prospect.lost_reason}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] text-ink-muted/80">
        {prospect.estimated_value !== null && (
          <span className="text-ink-muted">
            {formatRupiahShort(prospect.estimated_value)}
          </span>
        )}
        {followUp && (
          <span
            title="Follow-up berikutnya"
            className={
              due && !closed ? "font-medium text-[#b91c1c]" : undefined
            }
          >
            {due && !closed ? "⏰ " : ""}
            {format(parseKey(followUp), "d MMM", { locale: localeId })}
          </span>
        )}
        {prospect.client && (
          <span className="truncate text-forest">→ {prospect.client.name}</span>
        )}
      </div>
    </div>
  );
}

export function SortableProspectCard({
  prospect,
  today,
  onOpen,
}: {
  prospect: ProspectWithRelations;
  today: string;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: prospect.id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        // Kartu aslinya disamarkan saat diseret; yang mengikuti kursor
        // adalah DragOverlay.
        opacity: isDragging ? 0.35 : 1,
        // Sama seperti kartu tugas: seretan di HP baru aktif setelah
        // ditahan, jadi jari yang sekadar menggulir harus tetap bisa.
        touchAction: "manipulation",
      }}
      className="cursor-grab rounded-sm border border-line bg-surface p-2.5 shadow-[0_1px_2px_rgba(28,24,21,0.08)] select-none active:cursor-grabbing"
      onClick={onOpen}
      {...attributes}
      {...listeners}
    >
      <ProspectCardBody prospect={prospect} today={today} />
    </li>
  );
}

"use client";

import { useRef, useState } from "react";
import { addDays, format } from "date-fns";
import {
  CARD_COLORS,
  CARD_COLOR_ORDER,
  type CardColor,
  type Label,
  type Member,
  type TaskStatus,
} from "@/lib/types";
import { AssigneePicker, LabelPicker } from "./pickers";
import { quickAddTask } from "./actions";

/**
 * Penulis kartu di kaki tiap kolom.
 *
 * Bentuknya sengaja dibuat menyerupai kartu yang akan dihasilkan — sudah
 * berwarna sesuai pilihan sejak masih diketik — supaya menambah tugas
 * terasa seperti menempel sticky note, bukan mengisi formulir.
 *
 * Aturan mainnya: Enter menyimpan, Shift+Enter ganti baris, Esc menutup.
 * Setelah tersimpan komposer tetap terbuka dan fokus tetap di dalamnya,
 * jadi beberapa tugas bisa dituang berurutan tanpa menyentuh tetikus —
 * pola yang penting saat memindahkan catatan rapat.
 */
export function QuickAdd({
  status,
  members,
  labels,
}: {
  status: TaskStatus;
  members: Member[];
  labels: Label[];
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState<CardColor>("blue");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [knownLabels, setKnownLabels] = useState(labels);
  const [showDetail, setShowDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Judul yang sedang dikirim ke server, ditampilkan sebagai kartu samar
  // supaya kartu terasa langsung jadi meski jaringan lambat.
  const [saving, setSaving] = useState<string[]>([]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const palette = CARD_COLORS[color];

  function grow(element: HTMLTextAreaElement) {
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }

  function reset() {
    setTitle("");
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.style.height = "auto";
    }
  }

  function close() {
    setOpen(false);
    setShowDetail(false);
    setDueDate("");
    setAssigneeIds([]);
    setLabelIds([]);
    reset();
  }

  async function submit() {
    const value = title.trim();
    if (!value) return;

    // Bersihkan field lebih dulu supaya tugas berikutnya bisa langsung
    // diketik sementara yang ini masih dalam perjalanan ke server.
    reset();
    setSaving((current) => [...current, value]);
    inputRef.current?.focus();

    const result = await quickAddTask({
      status,
      title: value,
      color,
      assigneeIds,
      dueDate: dueDate || null,
      labelIds,
    });

    setSaving((current) => {
      const index = current.indexOf(value);
      if (index === -1) return current;
      return [...current.slice(0, index), ...current.slice(index + 1)];
    });

    if (result.error) {
      setError(`${result.error} — "${value}" belum tersimpan.`);
    }
  }

  if (!open) {
    return (
      <>
        <PendingCards titles={saving} />
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            // Fokus setelah textarea benar-benar ada di DOM.
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          className="mt-2 w-full rounded-sm border border-dashed border-line px-2 py-2 text-left text-xs text-ink-muted transition-colors hover:border-ink-subtle hover:bg-white/60 hover:text-ink"
        >
          + Tambah tugas
        </button>
      </>
    );
  }

  return (
    <>
      <PendingCards titles={saving} />

      <div
        style={{ backgroundColor: palette.bg, borderColor: palette.border }}
        className="relative mt-2 rounded-sm border shadow-sm"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Tutup penulis tugas"
          className="absolute top-1 right-1 rounded px-1 text-[13px] leading-none text-ink-subtle hover:bg-black/5 hover:text-ink"
        >
          ×
        </button>

        <textarea
          ref={inputRef}
          rows={2}
          defaultValue=""
          onChange={(event) => {
            setTitle(event.target.value);
            grow(event.target);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              close();
            }
          }}
          placeholder="Tulis tugas…"
          // 16px di HP supaya Safari iOS tidak memperbesar halaman saat
          // kotak ini difokus; kembali rapat di layar berkursor.
          className="w-full resize-none bg-transparent px-2.5 pt-2.5 pr-6 text-base leading-snug text-ink outline-none placeholder:text-ink-subtle sm:text-[13px]"
        />

        {showDetail && (
          <div className="space-y-2 px-2.5 pb-1">
            <AssigneePicker
              members={members}
              value={assigneeIds}
              onChange={setAssigneeIds}
              size="sm"
            />

            <LabelPicker
              labels={knownLabels}
              value={labelIds}
              onChange={setLabelIds}
              onCreated={(label) =>
                setKnownLabels((current) => [...current, label])
              }
            />

            <div className="flex items-center gap-1">
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                aria-label="Tenggat"
                className="min-w-0 flex-1 rounded border border-black/10 bg-white/70 px-1.5 py-1.5 font-mono text-base text-ink outline-none sm:py-1 sm:text-[11px]"
              />
              <DayChip label="Hari ini" days={0} onPick={setDueDate} />
              <DayChip label="Besok" days={1} onPick={setDueDate} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 px-2.5 pt-1.5 pb-2">
          <ColorPicker value={color} onChange={setColor} />

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowDetail((current) => !current)}
              aria-pressed={showDetail}
              className={`rounded px-1.5 py-0.5 text-[11px] transition-colors hover:bg-black/5 ${
                showDetail ||
                assigneeIds.length > 0 ||
                dueDate ||
                labelIds.length > 0
                  ? "text-ink"
                  : "text-ink-muted"
              }`}
            >
              Detail
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={title.trim().length === 0}
              className="rounded bg-ink px-2 py-0.5 text-[11px] text-ink-inverse transition-opacity disabled:opacity-30"
            >
              Simpan
            </button>
          </div>
        </div>
      </div>

      <p className="mt-1 font-mono text-[10px] leading-tight text-ink-subtle">
        Enter simpan · Shift+Enter baris baru
      </p>

      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </>
  );
}

/** Kartu samar untuk tugas yang sudah diketik tapi belum dikonfirmasi server. */
function PendingCards({ titles }: { titles: string[] }) {
  if (titles.length === 0) return null;

  return (
    <ul className="mt-2 flex flex-col gap-2">
      {titles.map((title, index) => (
        <li
          key={`${title}-${index}`}
          className="animate-pulse rounded-sm border border-line bg-white/60 px-2.5 py-2 text-[13px] leading-snug text-ink-muted"
        >
          {title}
        </li>
      ))}
    </ul>
  );
}

function DayChip({
  label,
  days,
  onPick,
}: {
  label: string;
  days: number;
  onPick: (value: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(format(addDays(new Date(), days), "yyyy-MM-dd"))}
      className="shrink-0 rounded border border-black/10 bg-white/70 px-1.5 py-1 text-[10px] text-ink-muted hover:text-ink"
    >
      {label}
    </button>
  );
}

export function ColorPicker({
  value,
  onChange,
}: {
  value: CardColor;
  onChange: (color: CardColor) => void;
}) {
  return (
    <div className="flex gap-1">
      {CARD_COLOR_ORDER.map((color) => {
        const palette = CARD_COLORS[color];
        const active = color === value;
        return (
          <button
            key={color}
            type="button"
            title={palette.label}
            aria-label={`Warna ${palette.label}`}
            aria-pressed={active}
            onClick={() => onChange(color)}
            style={{
              backgroundColor: palette.bg,
              borderColor: active ? "var(--color-ink)" : palette.border,
            }}
            className={`h-4 w-4 rounded-full border transition-transform ${
              active ? "scale-110" : "hover:scale-110"
            }`}
          />
        );
      })}
    </div>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import {
  CARD_COLORS,
  CARD_COLOR_ORDER,
  type CardColor,
  type TaskStatus,
} from "@/lib/types";
import { quickAddTask } from "./actions";

/**
 * Input tambah-cepat di kaki tiap kolom.
 *
 * Tujuannya menghilangkan gesekan mencatat: ketik judul, Enter, kartu jadi.
 * Field tetap terbuka setelah submit supaya beberapa tugas bisa dituang
 * berurutan — pola yang penting saat Lija memindahkan catatan rapat.
 */
export function QuickAdd({ status }: { status: TaskStatus }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState<CardColor>("blue");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const value = title.trim();
    if (!value || pending) return;

    startTransition(async () => {
      const result = await quickAddTask(status, value, color);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setTitle("");
      inputRef.current?.focus();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          // Fokus setelah input benar-benar ada di DOM.
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="mt-2 w-full rounded px-2 py-1.5 text-left text-xs text-ink-muted hover:bg-white/70 hover:text-ink"
      >
        + Tambah tugas
      </button>
    );
  }

  return (
    <div className="mt-2 rounded border border-line bg-white/80 p-2">
      <input
        ref={inputRef}
        value={title}
        disabled={pending}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          }
          if (event.key === "Escape") {
            setOpen(false);
            setTitle("");
            setError(null);
          }
        }}
        placeholder="Judul tugas, lalu Enter…"
        className="w-full bg-transparent text-[13px] outline-none placeholder:text-ink-subtle"
      />

      <div className="mt-2 flex items-center justify-between gap-2">
        <ColorPicker value={color} onChange={setColor} />
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTitle("");
            setError(null);
          }}
          className="text-xs text-ink-subtle hover:text-ink"
        >
          Tutup
        </button>
      </div>

      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
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

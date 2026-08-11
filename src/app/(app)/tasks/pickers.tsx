"use client";

import { useState, useTransition } from "react";
import { initials } from "@/lib/format";
import {
  LABEL_COLORS,
  LABEL_COLOR_ORDER,
  MEMBER_COLORS,
  memberColor,
  type Label,
  type LabelColor,
  type Member,
} from "@/lib/types";
import { createLabel } from "./actions";

/**
 * Pemilih penugasan berbentuk deretan avatar, bukan `<select multiple>`.
 *
 * Tim ini bertiga, dan satu tugas boleh ditugaskan ke lebih dari satu
 * orang — ketuk untuk menambah, ketuk lagi untuk melepas. Sebuah dropdown
 * ganda berarti menahan Ctrl/Cmd sambil klik untuk memilih lebih dari
 * satu, yang tidak ada padanannya sama sekali di HP. Deretan avatar juga
 * memperlihatkan warna orangnya, jadi warna yang sama itulah yang nanti
 * terbaca di kartu.
 */
export function AssigneePicker({
  members,
  value,
  onChange,
  size = "md",
  // Pemilih yang sama dipakai untuk penugasan, peserta rapat, dan daftar
  // hadir notulen. Bentuknya identik; yang berbeda cuma kata kerjanya —
  // dan itu yang dibaca pembaca layar, jadi tidak boleh ikut salah.
  actionLabel = "Tugaskan ke",
  emptyLabel = "Belum ditugaskan",
}: {
  members: Member[];
  value: string[];
  onChange: (ids: string[]) => void;
  size?: "sm" | "md";
  actionLabel?: string;
  emptyLabel?: string;
}) {
  const box = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";

  function toggle(id: string) {
    onChange(
      value.includes(id)
        ? value.filter((current) => current !== id)
        : [...value, id],
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {members.map((member) => {
        const palette = MEMBER_COLORS[memberColor(member)];
        const active = value.includes(member.id);

        return (
          <button
            key={member.id}
            type="button"
            title={member.full_name}
            aria-label={`${actionLabel} ${member.full_name}`}
            aria-pressed={active}
            onClick={() => toggle(member.id)}
            style={{
              backgroundColor: active ? palette.solid : palette.soft,
              color: active ? "#fff" : palette.solid,
              outlineColor: palette.solid,
            }}
            className={`flex items-center justify-center rounded-full font-mono leading-none transition-transform ${box} ${
              active ? "outline outline-offset-2" : "hover:scale-105"
            }`}
          >
            {initials(member.full_name)}
          </button>
        );
      })}

      <span className="ml-1 text-xs text-ink-subtle">
        {value.length === 0
          ? emptyLabel
          : members
              .filter((member) => value.includes(member.id))
              .map((member) => member.full_name.split(" ")[0])
              .join(", ")}
      </span>
    </div>
  );
}

/**
 * Pemilih label: chip yang diketuk untuk hidup/mati, plus pembuat label
 * baru di tempat. Sengaja tidak ada halaman "kelola label" tersendiri —
 * label lahir saat dibutuhkan, di tengah mengetik tugas.
 */
export function LabelPicker({
  labels,
  value,
  onChange,
  onCreated,
}: {
  labels: Label[];
  value: string[];
  onChange: (ids: string[]) => void;
  /** Dipanggil dengan label yang baru dibuat supaya induknya ikut tahu. */
  onCreated?: (label: Label) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<LabelColor>("blue");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    onChange(
      value.includes(id)
        ? value.filter((current) => current !== id)
        : [...value, id],
    );
  }

  function submitNew() {
    const trimmed = name.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const result = await createLabel(trimmed, color);
      if (result.error || !result.label) {
        setError(result.error ?? "Gagal membuat label.");
        return;
      }
      onCreated?.(result.label);
      onChange([...value, result.label.id]);
      setName("");
      setError(null);
      setCreating(false);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {labels.map((label) => (
        <LabelChip
          key={label.id}
          label={label}
          active={value.includes(label.id)}
          onClick={() => toggle(label.id)}
        />
      ))}

      {creating ? (
        <span className="inline-flex items-center gap-1 rounded border border-line-strong bg-surface px-1.5 py-1">
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitNew();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setCreating(false);
              }
            }}
            placeholder="Nama label"
            className="w-24 bg-transparent text-[11px] text-ink outline-none placeholder:text-ink-subtle"
          />
          <span className="flex gap-0.5">
            {LABEL_COLOR_ORDER.map((option) => (
              <button
                key={option}
                type="button"
                aria-label={LABEL_COLORS[option].label}
                onClick={() => setColor(option)}
                style={{ backgroundColor: LABEL_COLORS[option].solid }}
                className={`h-3 w-3 rounded-full ${
                  color === option ? "ring-1 ring-ink ring-offset-1" : ""
                }`}
              />
            ))}
          </span>
          <button
            type="button"
            onClick={submitNew}
            disabled={pending || name.trim().length === 0}
            className="rounded bg-ink px-1.5 py-0.5 text-[10px] text-ink-inverse disabled:opacity-30"
          >
            {pending ? "…" : "Buat"}
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded border border-dashed border-line-strong px-2 py-1 text-[11px] text-ink-subtle hover:border-ink-subtle hover:text-ink"
        >
          + Label
        </button>
      )}

      {error && <span className="text-[11px] text-danger">{error}</span>}
    </div>
  );
}

export function LabelChip({
  label,
  active,
  onClick,
}: {
  label: Label;
  active: boolean;
  onClick?: () => void;
}) {
  const palette = LABEL_COLORS[label.color] ?? LABEL_COLORS.blue;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        backgroundColor: active ? palette.solid : palette.soft,
        color: active ? "#fff" : palette.solid,
        borderColor: active ? palette.solid : "transparent",
      }}
      className="rounded border px-2 py-1 text-[11px] leading-none font-medium transition-colors"
    >
      {label.name}
    </button>
  );
}

/**
 * Jejak label di muka kartu: strip warna, bukan teks.
 *
 * Kartu kanban dibaca sambil lalu; empat nama label bertumpuk membuat judul
 * tugasnya sendiri tenggelam. Strip menyampaikan "kartu ini punya penanda
 * ungu dan merah" dalam satu pandang, dan namanya tetap ada di title untuk
 * yang perlu memastikan.
 */
export function LabelStrips({ labels }: { labels: Label[] }) {
  if (labels.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((label) => (
        <span
          key={label.id}
          title={label.name}
          style={{
            backgroundColor: (LABEL_COLORS[label.color] ?? LABEL_COLORS.blue)
              .solid,
          }}
          className="h-1.5 w-7 rounded-full"
        />
      ))}
    </div>
  );
}

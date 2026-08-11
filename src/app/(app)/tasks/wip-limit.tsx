"use client";

import { useState, useTransition } from "react";
import type { TaskStatus } from "@/lib/types";
import { updateWipLimit } from "./actions";

/**
 * Penanda batas WIP di kaki kolom, seperti "LIMIT / Maksimal 5 tugas".
 * Diklik untuk mengubah angkanya; dikosongkan berarti tanpa batas.
 */
export function WipLimitControl({
  status,
  limit,
  current,
}: {
  status: TaskStatus;
  limit: number | null;
  current: number;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(limit === null ? "" : String(limit));
  const [pending, startTransition] = useTransition();

  function save() {
    const trimmed = value.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);

    if (parsed !== null && (!Number.isInteger(parsed) || parsed < 1)) {
      setValue(limit === null ? "" : String(limit));
      setEditing(false);
      return;
    }

    setEditing(false);
    startTransition(() => updateWipLimit(status, parsed));
  }

  if (editing) {
    return (
      <div className="flex items-center justify-center gap-1.5">
        <label className="eyebrow" htmlFor={`wip-${status}`}>
          Limit
        </label>
        <input
          id={`wip-${status}`}
          autoFocus
          value={value}
          inputMode="numeric"
          placeholder="—"
          onChange={(event) => setValue(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === "Enter") save();
            if (event.key === "Escape") {
              setValue(limit === null ? "" : String(limit));
              setEditing(false);
            }
          }}
          className="w-12 rounded border border-line-strong bg-white px-1.5 py-0.5 text-center font-mono text-xs outline-none"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => setEditing(true)}
      title="Klik untuk mengubah batas"
      className="group inline-flex flex-col items-center gap-0.5 disabled:opacity-50"
    >
      <span className="eyebrow group-hover:text-accent">Limit</span>
      <span className="font-mono text-[11px] text-ink-muted group-hover:text-ink">
        {limit === null ? (
          "Tanpa batas"
        ) : (
          <>
            Maksimal{" "}
            <span
              className={
                current > limit ? "font-medium text-danger" : "text-ink"
              }
            >
              {limit}
            </span>{" "}
            tugas
          </>
        )}
      </span>
    </button>
  );
}

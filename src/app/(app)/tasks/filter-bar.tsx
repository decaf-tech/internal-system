"use client";

import { useState } from "react";
import { initials } from "@/lib/format";
import {
  LABEL_COLORS,
  MEMBER_COLORS,
  memberColor,
  type Label,
  type Member,
  type TaskWithRelations,
} from "@/lib/types";

export type TaskFilter = {
  assignees: string[];
  labels: string[];
  query: string;
};

export const EMPTY_FILTER: TaskFilter = {
  assignees: [],
  labels: [],
  query: "",
};

export function filterCount(filter: TaskFilter) {
  return (
    filter.assignees.length +
    filter.labels.length +
    (filter.query.trim() ? 1 : 0)
  );
}

/**
 * Saring tugas sesuai filter. Beberapa pilihan di satu baris berarti ATAU
 * ("punya Abi atau Ojan"), antar baris berarti DAN ("punya Abi, berlabel
 * Revisi") — ini yang dimaksud orang saat mengetuk dua avatar sekaligus.
 */
export function applyFilter(
  tasks: TaskWithRelations[],
  filter: TaskFilter,
): TaskWithRelations[] {
  const query = filter.query.trim().toLowerCase();
  if (
    filter.assignees.length === 0 &&
    filter.labels.length === 0 &&
    query === ""
  ) {
    return tasks;
  }

  return tasks.filter((task) => {
    if (filter.assignees.length > 0) {
      // "unassigned" adalah pilihan tersendiri: tugas tanpa pemilik justru
      // yang paling sering perlu dicari. Tugas dengan beberapa penanggung
      // jawab cocok kalau SALAH SATU dari mereka ada di filter.
      const matched = filter.assignees.some((id) =>
        id === "unassigned"
          ? task.assignee_ids.length === 0
          : task.assignee_ids.includes(id),
      );
      if (!matched) return false;
    }

    if (filter.labels.length > 0) {
      if (!filter.labels.some((id) => task.label_ids.includes(id))) {
        return false;
      }
    }

    if (query && !task.title.toLowerCase().includes(query)) {
      const client = task.client?.name.toLowerCase() ?? "";
      if (!client.includes(query)) return false;
    }

    return true;
  });
}

export function FilterBar({
  members,
  labels,
  value,
  onChange,
}: {
  members: Member[];
  labels: Label[];
  value: TaskFilter;
  onChange: (filter: TaskFilter) => void;
}) {
  // Di layar kecil filternya terlipat: baris avatar + chip label + kotak
  // cari memakan hampir setinggi satu kartu, dan yang dibuka pertama kali
  // di HP hampir selalu papannya, bukan filternya.
  const [openOnMobile, setOpenOnMobile] = useState(false);
  const active = filterCount(value);

  function toggle(key: "assignees" | "labels", id: string) {
    const current = value[key];
    onChange({
      ...value,
      [key]: current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    });
  }

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpenOnMobile((current) => !current)}
        aria-expanded={openOnMobile}
        className="btn btn-ghost w-full justify-between px-3 py-1.5 text-xs sm:hidden"
      >
        <span>Filter{active > 0 ? ` · ${active} aktif` : ""}</span>
        <span className="font-mono">{openOnMobile ? "−" : "+"}</span>
      </button>

      <div
        className={`${openOnMobile ? "mt-2 block" : "hidden"} sm:block`}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-line bg-surface px-3 py-2">
          <div className="flex items-center gap-1.5">
            {members.map((member) => {
              const palette = MEMBER_COLORS[memberColor(member)];
              const on = value.assignees.includes(member.id);
              return (
                <button
                  key={member.id}
                  type="button"
                  title={`Hanya tugas ${member.full_name}`}
                  aria-pressed={on}
                  onClick={() => toggle("assignees", member.id)}
                  style={{
                    backgroundColor: on ? palette.solid : palette.soft,
                    color: on ? "#fff" : palette.solid,
                    outlineColor: palette.solid,
                  }}
                  className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-[10px] leading-none ${
                    on ? "outline outline-offset-1" : ""
                  }`}
                >
                  {initials(member.full_name)}
                </button>
              );
            })}
            <button
              type="button"
              title="Hanya tugas yang belum ditugaskan"
              aria-pressed={value.assignees.includes("unassigned")}
              onClick={() => toggle("assignees", "unassigned")}
              className={`flex h-7 w-7 items-center justify-center rounded-full border border-dashed font-mono text-[10px] ${
                value.assignees.includes("unassigned")
                  ? "border-ink bg-ink text-ink-inverse"
                  : "border-ink-subtle text-ink-subtle hover:text-ink"
              }`}
            >
              ?
            </button>
          </div>

          {labels.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {labels.map((label) => {
                const palette = LABEL_COLORS[label.color] ?? LABEL_COLORS.blue;
                const on = value.labels.includes(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle("labels", label.id)}
                    style={{
                      backgroundColor: on ? palette.solid : palette.soft,
                      color: on ? "#fff" : palette.solid,
                    }}
                    className="rounded px-2 py-1 text-[11px] leading-none"
                  >
                    {label.name}
                  </button>
                );
              })}
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <input
              type="search"
              value={value.query}
              onChange={(event) =>
                onChange({ ...value, query: event.target.value })
              }
              placeholder="Cari judul / klien…"
              aria-label="Cari tugas"
              className="field w-40 py-1 text-base sm:text-xs"
            />
            {active > 0 && (
              <button
                type="button"
                onClick={() => onChange(EMPTY_FILTER)}
                className="text-xs text-ink-muted hover:text-ink hover:underline"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import { SubmitButton } from "@/components/modal";
import {
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  type CardColor,
  type Profile,
  type Project,
  type Task,
} from "@/lib/types";
import { ColorPicker } from "./quick-add";
import type { FormState } from "./actions";

export type TaskFormOptions = {
  members: Pick<Profile, "id" | "full_name">[];
  clients: { id: string; name: string }[];
  projects: Pick<Project, "id" | "name" | "client_id">[];
};

export function TaskForm({
  action,
  initial,
  options,
  onDone,
  defaultStatus,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial?: Task;
  options: TaskFormOptions;
  onDone: () => void;
  defaultStatus?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {
    error: null,
  });

  // Pilihan project mengikuti klien yang sedang dipilih — tanpa ini, user
  // bisa menautkan tugas ke project milik klien lain.
  const [clientId, setClientId] = useState(initial?.client_id ?? "");
  const [color, setColor] = useState<CardColor>(initial?.color ?? "blue");
  const projectChoices = clientId
    ? options.projects.filter((project) => project.client_id === clientId)
    : [];

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="title">
          Judul <span className="text-accent">*</span>
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={initial?.title ?? ""}
          className="field"
          placeholder="Kirim proposal revisi ke klien"
        />
      </div>

      <div>
        <label className="label" htmlFor="description">
          Deskripsi
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
          className="field resize-y"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={initial?.status ?? defaultStatus ?? "todo"}
            className="field"
          >
            {Object.entries(TASK_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="priority">
            Prioritas
          </label>
          <select
            id="priority"
            name="priority"
            defaultValue={initial?.priority ?? "medium"}
            className="field"
          >
            {Object.entries(TASK_PRIORITY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="assignee_id">
            Ditugaskan ke
          </label>
          <select
            id="assignee_id"
            name="assignee_id"
            defaultValue={initial?.assignee_id ?? ""}
            className="field"
          >
            <option value="">— Belum ditentukan —</option>
            {options.members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="due_date">
            Tenggat
          </label>
          <input
            id="due_date"
            name="due_date"
            type="date"
            defaultValue={initial?.due_date ?? ""}
            className="field"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="start_date">
          Mulai (opsional)
        </label>
        <input
          id="start_date"
          name="start_date"
          type="date"
          defaultValue={initial?.start_date ?? ""}
          className="field"
        />
        <p className="mt-1 text-xs text-ink-subtle">
          Diisi kalau tugas berlangsung beberapa hari — di kalender akan
          tergambar sebagai batang dari tanggal mulai sampai tenggat.
        </p>
      </div>

      <div>
        <span className="label">Warna Kartu</span>
        {/* Nilai warna dikirim lewat input tersembunyi karena ColorPicker
            adalah tombol-tombol, bukan field form biasa. */}
        <input type="hidden" name="color" value={color} />
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="client_id">
            Klien
          </label>
          <select
            id="client_id"
            name="client_id"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            className="field"
          >
            <option value="">— Internal —</option>
            {options.clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="project_id">
            Project
          </label>
          <select
            id="project_id"
            name="project_id"
            defaultValue={initial?.project_id ?? ""}
            className="field"
            disabled={projectChoices.length === 0}
          >
            <option value="">
              {clientId ? "— Tanpa project —" : "— Pilih klien dulu —"}
            </option>
            {projectChoices.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.error && (
        <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Batal
        </button>
        <SubmitButton>{initial ? "Simpan Perubahan" : "Tambah Tugas"}</SubmitButton>
      </div>
    </form>
  );
}

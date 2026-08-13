"use client";

import { useActionState, useEffect, useState } from "react";
import { SubmitButton } from "@/components/modal";
import {
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  type CardColor,
  type Label,
  type Member,
  type Project,
  type Task,
} from "@/lib/types";
import { ColorPicker } from "./quick-add";
import { AssigneePicker, LabelPicker } from "./pickers";
import { ScheduleField } from "./schedule-field";
import type { FormState } from "./actions";

export type TaskFormOptions = {
  members: Member[];
  clients: { id: string; name: string }[];
  projects: Pick<Project, "id" | "name" | "client_id">[];
  labels: Label[];
};

/**
 * Form tugas, disusun dua lapis.
 *
 * Lapis pertama (selalu terlihat) berisi yang hampir selalu diisi: judul,
 * siapa yang mengerjakan, kapan, penanda apa. Sisanya — deskripsi,
 * prioritas, klien, project — ada di balik satu tombol. Bukan karena tidak
 * penting, tapi karena tujuh field yang terbuka sekaligus membuat mencatat
 * satu tugas terasa seperti mengisi formulir, dan tugas yang terasa mahal
 * dicatat akhirnya tidak dicatat.
 */
export function TaskForm({
  action,
  initial,
  initialLabelIds,
  initialAssigneeIds,
  options,
  onDone,
  defaultStatus,
  defaultStartDate,
  defaultDueDate,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial?: Task;
  initialLabelIds?: string[];
  initialAssigneeIds?: string[];
  options: TaskFormOptions;
  onDone: () => void;
  defaultStatus?: string;
  /** Diisi saat form dibuka dari kalender, mengikuti tanggal yang dipilih. */
  defaultStartDate?: string | null;
  defaultDueDate?: string | null;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {
    error: null,
  });

  // Pilihan project mengikuti klien yang sedang dipilih — tanpa ini, user
  // bisa menautkan tugas ke project milik klien lain.
  const [clientId, setClientId] = useState(initial?.client_id ?? "");
  const [color, setColor] = useState<CardColor>(initial?.color ?? "blue");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    initialAssigneeIds ?? [],
  );
  const [selectedLabels, setSelectedLabels] = useState<string[]>(
    initialLabelIds ?? [],
  );
  // Label yang dibuat di tengah pengisian ikut ditampilkan tanpa menunggu
  // halaman dimuat ulang.
  const [labels, setLabels] = useState(options.labels);

  // Detail terbuka sendiri kalau tugasnya memang sudah punya isi di sana —
  // membuka tugas lama lalu tidak melihat deskripsinya akan terasa seperti
  // datanya hilang.
  const [showDetail, setShowDetail] = useState(
    Boolean(
      initial?.description || initial?.project_id || initial?.priority === "urgent",
    ),
  );

  const projectChoices = clientId
    ? options.projects.filter((project) => project.client_id === clientId)
    : [];

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="assignee_ids" value={assigneeIds.join(",")} />
      <input type="hidden" name="color" value={color} />
      <input type="hidden" name="label_ids" value={selectedLabels.join(",")} />

      <div>
        <label className="label" htmlFor="title">
          Judul <span className="text-accent">*</span>
        </label>
        <input
          id="title"
          name="title"
          required
          autoFocus={!initial}
          defaultValue={initial?.title ?? ""}
          className="field"
          placeholder="Kirim proposal revisi ke klien"
        />
      </div>

      {/* Di lapis pertama, bukan balik "Detail lainnya" — kalau ditautkan
          ke klien cuma kelihatan setelah tombol itu dibuka, orang yang buru-
          buru mencatat tugas cenderung lewat begitu saja, dan tugas itu
          tidak pernah muncul di halaman klien terkait. Klien di sini
          termasuk yang masih di tahap prospek — setiap prospek sekarang
          otomatis punya baris klien sejak dibuat. */}
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
        <span className="label">Ditugaskan ke</span>
        <AssigneePicker
          members={options.members}
          value={assigneeIds}
          onChange={setAssigneeIds}
        />
      </div>

      <ScheduleField
        defaultStart={initial?.start_date ?? defaultStartDate}
        defaultDue={initial?.due_date ?? defaultDueDate}
      />

      <div>
        <span className="label">Label</span>
        <LabelPicker
          labels={labels}
          value={selectedLabels}
          onChange={setSelectedLabels}
          onCreated={(label) => setLabels((current) => [...current, label])}
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
          <span className="label">Warna Kartu</span>
          <div className="flex h-9 items-center">
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>
      </div>

      <div className="border-t border-line pt-3">
        <button
          type="button"
          onClick={() => setShowDetail((current) => !current)}
          aria-expanded={showDetail}
          className="flex w-full items-center justify-between text-sm text-ink-muted hover:text-ink"
        >
          <span>Detail lainnya</span>
          <span className="font-mono text-xs">{showDetail ? "−" : "+"}</span>
        </button>

        {/* Field detail tetap ada di DOM saat terlipat supaya nilainya ikut
            terkirim — kalau di-unmount, deskripsi tugas lama akan terhapus
            hanya karena panelnya tidak dibuka. */}
        <div className={showDetail ? "mt-3 space-y-4" : "hidden"}>
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
        </div>
      </div>

      {/* Catatan & lampiran menempel lewat `task_id` — kolom yang cuma ada
          setelah baris tugasnya sendiri tersimpan. Tugas baru belum bisa
          menawarkan keduanya sama sekali, jadi orang yang menyimpannya
          perlu tahu itu langkah berikutnya, bukan sesuatu yang terlewat. */}
      {!initial && (
        <p className="text-xs text-ink-subtle">
          Catatan & lampiran bisa ditambahkan setelah tugas ini disimpan —
          buka lagi dari papan atau kalender.
        </p>
      )}

      {state.error && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Batal
        </button>
        <SubmitButton>
          {initial ? "Simpan Perubahan" : "Tambah Tugas"}
        </SubmitButton>
      </div>
    </form>
  );
}

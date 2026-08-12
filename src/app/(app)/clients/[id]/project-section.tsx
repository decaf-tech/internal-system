"use client";

import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { ConfirmButton, Modal, SubmitButton } from "@/components/modal";
import { ProjectStatusBadge } from "@/components/badge";
import { DocumentPanel } from "@/components/document-panel";
import { formatDate, formatRupiah } from "@/lib/format";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_TRACK_LABEL,
  type Document,
  type Project,
  type ProjectStatus,
} from "@/lib/types";
import {
  createProject,
  deleteProject,
  updateProjectDeal,
  updateProjectStatus,
  type FormState,
} from "../actions";

export function ProjectSection({
  clientId,
  projects,
  receivedByProject,
  documents,
}: {
  clientId: string;
  projects: Project[];
  /** Total pemasukan berstatus "diterima" per project, dalam rupiah. */
  receivedByProject: Record<string, number>;
  /** Seluruh dokumen klien ini; disaring per project di tiap barisnya. */
  documents: Document[];
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base">Project</h2>
        <button
          type="button"
          className="btn btn-ghost text-xs"
          onClick={() => setOpen(true)}
        >
          + Project
        </button>
      </div>

      {projects.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-subtle">
          Belum ada project untuk klien ini.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {projects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              clientId={clientId}
              received={receivedByProject[project.id] ?? 0}
              documents={documents.filter(
                (doc) => doc.project_id === project.id,
              )}
            />
          ))}
        </ul>
      )}

      <Modal open={open} onClose={close} title="Project Baru">
        <ProjectForm clientId={clientId} onDone={close} />
      </Modal>
    </section>
  );
}

function ProjectRow({
  project,
  clientId,
  received,
  documents,
}: {
  project: Project;
  clientId: string;
  received: number;
  documents: Document[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{project.name}</p>
          <p className="font-mono text-xs text-ink-subtle">
            {PROJECT_TRACK_LABEL[project.track]}
            {project.target_date && ` · target ${formatDate(project.target_date)}`}
          </p>
          {project.description && (
            <p className="mt-1 text-sm text-ink-muted">{project.description}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ProjectStatusBadge status={project.status} />
          <ConfirmButton
            label="Hapus project"
            disabled={pending}
            className="icon-btn icon-btn-danger"
            title={`Hapus project "${project.name}"?`}
            message="Tugas dan pemasukan yang menempel padanya ikut terlepas."
            onConfirm={() =>
              startTransition(() => deleteProject(project.id, clientId))
            }
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 4.5h10M6.5 4V2.5h3V4M4.5 4.5l.5 9h6l.5-9"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </ConfirmButton>
        </div>
      </div>

      <DealRow project={project} clientId={clientId} received={received} />

      <select
        value={project.status}
        disabled={pending}
        aria-label={`Ubah status project ${project.name}`}
        className="field mt-2 max-w-48 py-1 text-base sm:text-xs"
        onChange={(event) =>
          startTransition(() =>
            updateProjectStatus(
              project.id,
              clientId,
              event.target.value as ProjectStatus,
            ),
          )
        }
      >
        {Object.entries(PROJECT_STATUS_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {/* `clientId` ikut dikirim supaya lampirannya mendarat di
          /Clients/<klien>/<project>/ — folder yang sama dengan di Drive,
          dan yang sama pula dengan yang tampil di /documents. */}
      <DocumentPanel
        documents={documents}
        link={{ projectId: project.id, clientId }}
        title="Lampiran project"
        variant="inline"
        emptyLabel="Belum ada lampiran untuk project ini."
      />
    </li>
  );
}

/**
 * Baris uang sebuah project: nilai deal, berapa yang sudah masuk, sisanya.
 *
 * Nilainya bisa diubah di tempat karena angka deal paling sering berubah
 * saat sedang menatap halaman kliennya — membuka form project penuh untuk
 * mengubah satu angka adalah alasan bagus untuk menunda, lalu lupa.
 */
function DealRow({
  project,
  clientId,
  received,
}: {
  project: Project;
  clientId: string;
  received: number;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(
    project.deal_value == null ? "" : String(project.deal_value),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateProjectDeal(project.id, clientId, value);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className="mt-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-ink-subtle">Rp</span>
          <input
            autoFocus
            value={value}
            inputMode="numeric"
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                save();
              }
              if (event.key === "Escape") setEditing(false);
            }}
            placeholder="10.000.000"
            className="field w-40 py-1 text-base sm:text-xs"
          />
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded bg-ink px-2 py-1 text-[11px] text-ink-inverse disabled:opacity-40"
          >
            {pending ? "…" : "Simpan"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-1 text-[11px] text-ink-muted hover:text-ink"
          >
            Batal
          </button>
        </div>
        {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
      </div>
    );
  }

  if (project.deal_value == null) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-2 text-xs text-accent hover:underline"
      >
        + Isi nilai deal
      </button>
    );
  }

  const deal = Number(project.deal_value);
  const percent = deal > 0 ? Math.min(100, (received / deal) * 100) : 0;

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-baseline gap-x-2 font-mono text-[11px]">
        <span className="text-ink">{formatRupiah(deal)}</span>
        <span className="text-ink-subtle">
          masuk {formatRupiah(received)}
          {received < deal && ` · sisa ${formatRupiah(deal - received)}`}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-accent hover:underline"
        >
          ubah
        </button>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full rounded-full bg-forest"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function ProjectForm({
  clientId,
  onDone,
}: {
  clientId: string;
  onDone: () => void;
}) {
  const action = createProject.bind(null, clientId);
  const [state, formAction] = useActionState<FormState, FormData>(action, {
    error: null,
  });

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="project-name">
          Nama Project <span className="text-accent">*</span>
        </label>
        <input
          id="project-name"
          name="name"
          required
          className="field"
          placeholder="POS & Business Management System"
        />
      </div>

      <div>
        <label className="label" htmlFor="project-description">
          Deskripsi
        </label>
        <textarea
          id="project-description"
          name="description"
          rows={2}
          className="field resize-y"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="project-track">
            Jalur
          </label>
          <select
            id="project-track"
            name="track"
            defaultValue="other"
            className="field"
          >
            {Object.entries(PROJECT_TRACK_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="project-status">
            Status
          </label>
          <select
            id="project-status"
            name="status"
            defaultValue="planning"
            className="field"
          >
            {Object.entries(PROJECT_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="project-deal">
          Nilai Deal (Rp)
        </label>
        <input
          id="project-deal"
          name="deal_value"
          inputMode="numeric"
          className="field"
          placeholder="10.000.000"
        />
        <p className="mt-1 text-xs text-ink-subtle">
          Boleh dikosongkan dulu. Kalau diisi, sisa tagihannya otomatis
          terhitung dari pemasukan yang ditautkan ke project ini.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="project-start">
            Mulai
          </label>
          <input
            id="project-start"
            name="start_date"
            type="date"
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="project-target">
            Target Selesai
          </label>
          <input
            id="project-target"
            name="target_date"
            type="date"
            className="field"
          />
        </div>
      </div>

      {state.error && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Batal
        </button>
        <SubmitButton>Tambah Project</SubmitButton>
      </div>
    </form>
  );
}

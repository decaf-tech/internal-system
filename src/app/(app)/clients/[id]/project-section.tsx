"use client";

import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { Modal, SubmitButton } from "@/components/modal";
import { ProjectStatusBadge } from "@/components/badge";
import { formatDate } from "@/lib/format";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_TRACK_LABEL,
  type Project,
  type ProjectStatus,
} from "@/lib/types";
import { createProject, deleteProject, updateProjectStatus, type FormState } from "../actions";

export function ProjectSection({
  clientId,
  projects,
}: {
  clientId: string;
  projects: Project[];
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
}: {
  project: Project;
  clientId: string;
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
          <button
            type="button"
            aria-label="Hapus project"
            disabled={pending}
            className="rounded p-1.5 text-ink-subtle hover:bg-danger-soft hover:text-danger disabled:opacity-50"
            onClick={() => {
              if (!confirm(`Hapus project "${project.name}"?`)) return;
              startTransition(() => deleteProject(project.id, clientId));
            }}
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
          </button>
        </div>
      </div>

      <select
        value={project.status}
        disabled={pending}
        aria-label={`Ubah status project ${project.name}`}
        className="field mt-2 max-w-48 py-1 text-xs"
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
    </li>
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
        <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
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

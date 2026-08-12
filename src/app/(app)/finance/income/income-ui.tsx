"use client";

import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { Modal, SubmitButton } from "@/components/modal";
import { IncomeStatusBadge } from "@/components/badge";
import { formatDate, formatRupiah } from "@/lib/format";
import { todayKey } from "@/lib/date-range";
import {
  INCOME_CATEGORY_LABEL,
  INCOME_STATUS_LABEL,
  INCOME_STATUS_ORDER,
  PAYMENT_METHOD_LABEL,
  type IncomeStatus,
  type IncomeWithRelations,
  type Project,
} from "@/lib/types";
import {
  createIncome,
  deleteIncome,
  updateIncome,
  updateIncomeStatus,
  type FormState,
} from "./actions";

export type IncomeFormOptions = {
  clients: { id: string; name: string }[];
  projects: Pick<Project, "id" | "name" | "client_id" | "deal_value">[];
};

export function NewIncomeButton({
  options,
  className = "btn btn-accent flex-1 sm:flex-none",
  label = "+ Catat Pemasukan",
}: {
  options: IncomeFormOptions;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      <Modal open={open} onClose={close} title="Pemasukan Baru">
        {open && (
          <IncomeForm action={createIncome} options={options} onDone={close} />
        )}
      </Modal>
    </>
  );
}

function IncomeForm({
  action,
  initial,
  options,
  onDone,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial?: IncomeWithRelations;
  options: IncomeFormOptions;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {
    error: null,
  });

  const [clientId, setClientId] = useState(initial?.client_id ?? "");
  const [projectId, setProjectId] = useState(initial?.project_id ?? "");

  const projectChoices = clientId
    ? options.projects.filter((project) => project.client_id === clientId)
    : options.projects;

  const selectedProject = options.projects.find(
    (project) => project.id === projectId,
  );

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="title">
          Keterangan <span className="text-accent">*</span>
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={initial?.title ?? ""}
          className="field"
          placeholder="DP 50% — Website LAKSA Bogor"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="amount">
            Jumlah (Rp) <span className="text-accent">*</span>
          </label>
          <input
            id="amount"
            name="amount"
            required
            inputMode="numeric"
            defaultValue={initial ? String(initial.amount) : ""}
            className="field"
            placeholder="5000000"
          />
        </div>
        <div>
          <label className="label" htmlFor="due_date">
            Tanggal / Jatuh Tempo
          </label>
          <input
            id="due_date"
            name="due_date"
            type="date"
            defaultValue={initial?.due_date ?? todayKey()}
            className="field"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="category">
            Jenis
          </label>
          <select
            id="category"
            name="category"
            defaultValue={initial?.category ?? "termin"}
            className="field"
          >
            {Object.entries(INCOME_CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={initial?.status ?? "planned"}
            className="field"
          >
            {INCOME_STATUS_ORDER.map((value) => (
              <option key={value} value={value}>
                {INCOME_STATUS_LABEL[value]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink-subtle">
            Hanya yang berstatus “Diterima” yang dihitung sebagai kas masuk.
          </p>
        </div>
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
            onChange={(event) => {
              setClientId(event.target.value);
              setProjectId("");
            }}
            className="field"
          >
            <option value="">— Tidak terkait —</option>
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
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="field"
          >
            <option value="">— Tanpa project —</option>
            {projectChoices.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {selectedProject?.deal_value != null && (
            <p className="mt-1 font-mono text-xs text-ink-subtle">
              Nilai deal {formatRupiah(Number(selectedProject.deal_value))}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="method">
            Cara Bayar
          </label>
          <select
            id="method"
            name="method"
            defaultValue={initial?.method ?? ""}
            className="field"
          >
            <option value="">— Belum ditentukan —</option>
            {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="description">
            Catatan
          </label>
          <input
            id="description"
            name="description"
            defaultValue={initial?.description ?? ""}
            className="field"
            placeholder="Masuk ke BCA a.n. Decaf"
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
        <SubmitButton>{initial ? "Simpan Perubahan" : "Simpan"}</SubmitButton>
      </div>
    </form>
  );
}

/**
 * Satu baris pemasukan sebagai kartu, bukan baris tabel.
 *
 * Tabel lima kolom memaksa gulir menyamping di HP, dan yang paling sering
 * dilakukan di halaman ini — menandai sebuah tagihan sudah diterima —
 * justru berada di kolom paling kanan yang tidak terlihat.
 */
export function IncomeCard({
  income,
  options,
}: {
  income: IncomeWithRelations;
  options: IncomeFormOptions;
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const closeEdit = useCallback(() => setEditing(false), []);

  const overdue =
    income.status === "invoiced" && income.due_date < todayKey();

  return (
    <li className="border-b border-line p-3 last:border-b-0 sm:px-4">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{income.title}</p>
          <p className="font-mono text-[11px] text-ink-subtle">
            {INCOME_CATEGORY_LABEL[income.category]}
            {income.client && ` · ${income.client.name}`}
            {income.project && ` · ${income.project.name}`}
          </p>
          <p
            className={`font-mono text-[11px] ${
              overdue ? "text-danger" : "text-ink-subtle"
            }`}
          >
            {income.received_date
              ? `diterima ${formatDate(income.received_date)}`
              : `jatuh tempo ${formatDate(income.due_date)}`}
            {overdue && " · lewat"}
          </p>
        </div>

        <p className="font-mono text-sm whitespace-nowrap text-forest">
          {formatRupiah(Number(income.amount))}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <IncomeStatusBadge status={income.status} />

        <select
          value={income.status}
          disabled={pending}
          aria-label={`Ubah status ${income.title}`}
          className="field w-auto py-1 text-base sm:text-xs"
          onChange={(event) =>
            startTransition(() =>
              updateIncomeStatus(
                income.id,
                event.target.value as IncomeStatus,
              ),
            )
          }
        >
          {INCOME_STATUS_ORDER.map((value) => (
            <option key={value} value={value}>
              {INCOME_STATUS_LABEL[value]}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded px-3 py-2 text-xs text-ink-muted hover:bg-surface-muted hover:text-ink"
          >
            Ubah
          </button>
          <button
            type="button"
            aria-label={`Hapus pemasukan ${income.title}`}
            disabled={pending}
            className="icon-btn icon-btn-danger"
            onClick={() => {
              if (!confirm(`Hapus catatan "${income.title}"?`)) return;
              startTransition(() => deleteIncome(income.id));
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

      <Modal open={editing} onClose={closeEdit} title="Ubah Pemasukan">
        {editing && (
          <IncomeForm
            action={updateIncome.bind(null, income.id)}
            initial={income}
            options={options}
            onDone={closeEdit}
          />
        )}
      </Modal>
    </li>
  );
}

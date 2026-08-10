"use client";

import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { Modal, SubmitButton } from "@/components/modal";
import { ExpenseStatusBadge } from "@/components/badge";
import { formatDate, formatRupiah } from "@/lib/format";
import {
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_STATUS_LABEL,
  type ExpenseStatus,
  type ExpenseWithRelations,
} from "@/lib/types";
import {
  createExpense,
  deleteExpense,
  updateExpenseStatus,
  type FormState,
} from "./actions";

export function NewExpenseButton({
  clients,
}: {
  clients: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button className="btn btn-accent" onClick={() => setOpen(true)}>
        + Catat Pengeluaran
      </button>
      <Modal open={open} onClose={close} title="Pengeluaran Baru">
        {open && <ExpenseForm clients={clients} onDone={close} />}
      </Modal>
    </>
  );
}

function ExpenseForm({
  clients,
  onDone,
}: {
  clients: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createExpense,
    { error: null },
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
          className="field"
          placeholder="Transport meeting klien di Bogor"
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
            className="field"
            placeholder="150000"
          />
        </div>
        <div>
          <label className="label" htmlFor="expense_date">
            Tanggal
          </label>
          <input
            id="expense_date"
            name="expense_date"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="field"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="category">
            Kategori
          </label>
          <select
            id="category"
            name="category"
            defaultValue="other"
            className="field"
          >
            {Object.entries(EXPENSE_CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="client_id">
            Terkait Klien
          </label>
          <select id="client_id" name="client_id" className="field">
            <option value="">— Tidak terkait —</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="description">
          Catatan
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          className="field resize-y"
        />
      </div>

      <div>
        <label className="label" htmlFor="receipt">
          Struk (opsional, maks. 4MB)
        </label>
        <input
          id="receipt"
          name="receipt"
          type="file"
          accept="image/*,application/pdf"
          className="field py-1.5"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_reimbursement"
          defaultChecked
          className="h-4 w-4 accent-[var(--color-accent)]"
        />
        Pakai uang pribadi (perlu diganti)
      </label>

      {state.error && (
        <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Batal
        </button>
        <SubmitButton pendingLabel="Menyimpan & mengunggah…">
          Simpan
        </SubmitButton>
      </div>
    </form>
  );
}

export function ExpenseRow({ expense }: { expense: ExpenseWithRelations }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-line last:border-b-0">
      <td className="px-3 py-3">
        <p className="font-medium">{expense.title}</p>
        <p className="font-mono text-xs text-ink-subtle">
          {EXPENSE_CATEGORY_LABEL[expense.category]}
          {expense.client && ` · ${expense.client.name}`}
          {expense.is_reimbursement && " · reimburse"}
        </p>
        {expense.documents.length > 0 && (
          <a
            href={`/api/documents/${expense.documents[0].id}/download`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-xs text-accent hover:underline"
          >
            Lihat struk
          </a>
        )}
      </td>

      <td className="px-3 py-3 font-mono text-sm whitespace-nowrap">
        {formatRupiah(expense.amount)}
      </td>

      <td className="px-3 py-3 text-sm whitespace-nowrap text-ink-muted">
        {formatDate(expense.expense_date)}
      </td>

      <td className="px-3 py-3 text-sm text-ink-muted">
        {expense.submitter?.full_name ?? "—"}
      </td>

      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <ExpenseStatusBadge status={expense.status} />
          <select
            value={expense.status}
            disabled={pending}
            aria-label={`Ubah status ${expense.title}`}
            className="field w-auto py-1 text-xs"
            onChange={(event) =>
              startTransition(() =>
                updateExpenseStatus(
                  expense.id,
                  event.target.value as ExpenseStatus,
                ),
              )
            }
          >
            {Object.entries(EXPENSE_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-label="Hapus pengeluaran"
            disabled={pending}
            className="rounded p-1.5 text-ink-subtle hover:bg-danger-soft hover:text-danger disabled:opacity-50"
            onClick={() => {
              if (!confirm(`Hapus catatan "${expense.title}"?`)) return;
              startTransition(() => deleteExpense(expense.id));
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
      </td>
    </tr>
  );
}

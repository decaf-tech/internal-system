"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { Modal, SubmitButton } from "@/components/modal";
import { ExpenseStatusBadge } from "@/components/badge";
import { formatDate, formatRupiah } from "@/lib/format";
import { uploadFiles } from "@/lib/upload-client";
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

export type ExpenseFormOptions = {
  clients: { id: string; name: string }[];
  projects: { id: string; name: string; client_id: string }[];
};

export function NewExpenseButton({ options }: { options: ExpenseFormOptions }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button className="btn btn-accent" onClick={() => setOpen(true)}>
        + Catat Pengeluaran
      </button>
      <Modal open={open} onClose={close} title="Pengeluaran Baru">
        {open && <ExpenseForm options={options} onDone={close} />}
      </Modal>
    </>
  );
}

function ExpenseForm({
  options,
  onDone,
}: {
  options: ExpenseFormOptions;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createExpense,
    { error: null },
  );

  // Struk disimpan di state, bukan sebagai field form — kalau ikut terkirim
  // bersama form, ukurannya dibatasi body request Server Action. Di sini
  // file-nya diunggah sendiri setelah pengeluarannya tercatat.
  const receiptRef = useRef<HTMLInputElement>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");

  useEffect(() => {
    if (!state.ok || !state.expenseId) return;

    const receipt = receiptRef.current?.files?.[0];
    if (!receipt) {
      onDone();
      return;
    }

    let cancelled = false;
    setUploading(true);

    // Struk opsional: kalau uploadnya gagal, pengeluarannya tetap tersimpan
    // dan struk bisa dilampirkan menyusul dari daftar pengeluaran.
    uploadFiles([receipt], {
      kind: "link",
      link: { expenseId: state.expenseId },
    }).then(({ failed }) => {
      if (cancelled) return;
      setUploading(false);
      if (failed.length > 0) {
        setReceiptError(
          `Pengeluaran tersimpan, tapi struk gagal diunggah: ${failed[0].reason}`,
        );
        return;
      }
      onDone();
    });

    return () => {
      cancelled = true;
    };
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
      </div>

      {/* Project baru ditawarkan setelah kliennya dipilih. Pengeluaran
          internal — kebanyakan — jadi tidak perlu melewati dua dropdown
          yang isinya "tidak terkait". */}
      {clientId && (
        <div>
          <label className="label" htmlFor="project_id">
            Terkait Project
          </label>
          <select
            id="project_id"
            name="project_id"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="field"
          >
            <option value="">— Tanpa project —</option>
            {options.projects
              .filter((project) => project.client_id === clientId)
              .map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
          </select>
        </div>
      )}

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
          Struk (opsional)
        </label>
        <input
          ref={receiptRef}
          id="receipt"
          type="file"
          accept="image/*,application/pdf"
          className="field py-1.5"
        />
        {uploading && (
          <p className="mt-1 text-xs text-ink-subtle">Mengunggah struk…</p>
        )}
        {receiptError && (
          <p className="mt-1 text-xs text-danger">{receiptError}</p>
        )}
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

/**
 * Satu pengeluaran sebagai kartu, bukan baris tabel — bentuk yang sama
 * dengan daftar pemasukan. Tabel lima kolom hanya muat di layar lebar, dan
 * yang paling sering dilakukan di halaman ini (mengubah status) berada di
 * kolom paling kanan, yaitu bagian pertama yang hilang di HP.
 */
/**
 * Melampirkan struk menyusul, dari daftar pengeluaran.
 *
 * Form pembuatan sengaja tidak menggagalkan pengeluarannya kalau strukya
 * gagal naik (lihat `ExpenseForm`) — dan sebelum ini, satu-satunya jalan
 * memperbaiki keadaan itu adalah menghapus pengeluarannya lalu
 * memasukkannya lagi dari nol. Jalur uploadnya sama persis: byte-nya ke
 * Drive, metadatanya ke Supabase.
 */
function ReceiptUpload({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="text-xs text-ink-subtle hover:text-accent hover:underline disabled:opacity-50"
      >
        {busy ? "Mengunggah struk…" : "+ Lampirkan struk"}
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;

          setBusy(true);
          setError(null);
          const { failed } = await uploadFiles([file], {
            kind: "link",
            link: { expenseId },
          });
          setBusy(false);

          // Kosongkan supaya file yang sama bisa dipilih lagi kalau gagal.
          if (inputRef.current) inputRef.current.value = "";
          if (failed.length > 0) {
            setError(failed[0].reason);
            return;
          }
          router.refresh();
        }}
      />
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  );
}

export function ExpenseCard({ expense }: { expense: ExpenseWithRelations }) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="border-b border-line p-3 last:border-b-0 sm:px-4">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{expense.title}</p>
          <p className="font-mono text-[11px] text-ink-subtle">
            {EXPENSE_CATEGORY_LABEL[expense.category]}
            {expense.client && ` · ${expense.client.name}`}
            {expense.is_reimbursement && " · reimburse"}
          </p>
          <p className="font-mono text-[11px] text-ink-subtle">
            {formatDate(expense.expense_date)}
            {expense.submitter && ` · ${expense.submitter.full_name}`}
          </p>
          {expense.documents.length > 0 ? (
            <a
              href={`/api/documents/${expense.documents[0].id}/download`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs text-accent hover:underline"
            >
              Lihat struk
            </a>
          ) : (
            <ReceiptUpload expenseId={expense.id} />
          )}
        </div>

        <p className="font-mono text-sm whitespace-nowrap text-ink">
          {formatRupiah(expense.amount)}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
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
          className="ml-auto rounded p-1.5 text-ink-subtle hover:bg-danger-soft hover:text-danger disabled:opacity-50"
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
    </li>
  );
}

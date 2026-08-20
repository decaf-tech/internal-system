"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { ConfirmButton, Modal, SubmitButton } from "@/components/modal";
import { ExpenseStatusBadge } from "@/components/badge";
import { FilePickButton } from "@/components/file-picker";
import { formatDate, formatFileSize, formatRupiah } from "@/lib/format";
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

export function NewExpenseButton({
  options,
  className = "btn btn-accent flex-1 sm:flex-none",
  label = "+ Catat Pengeluaran",
}: {
  options: ExpenseFormOptions;
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
  // Struk disimpan di state, bukan sebagai field form — kalau ikut terkirim
  // bersama form, ukurannya dibatasi body request Server Action. File-nya
  // diunggah sendiri setelah pengeluarannya tercatat.
  const [receipt, setReceipt] = useState<File | null>(null);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");

  /**
   * Menyimpan lalu mengunggah, dalam satu aksi.
   *
   * Dijadikan satu supaya `useFormStatus` tetap "sedang berjalan" selama
   * struknya naik — sebelumnya unggahan itu berlangsung di sebuah efek
   * setelah aksinya selesai, jadi tombol Simpan sudah hidup lagi dan
   * modalnya masih terbuka tanpa penjelasan yang jelas.
   */
  const [state, formAction] = useActionState<FormState, FormData>(
    async (previous, formData) => {
      // Kalau percobaan sebelumnya sudah mencatat pengeluarannya dan yang
      // gagal cuma strukya, jangan dicatat dua kali.
      const saved: FormState = previous.expenseId
        ? { ok: true, error: null, expenseId: previous.expenseId }
        : await createExpense(previous, formData);

      if (!saved.ok || !saved.expenseId || !receipt) return saved;

      const { failed } = await uploadFiles([receipt], {
        kind: "link",
        link: { expenseId: saved.expenseId },
      });
      if (failed.length === 0) return saved;

      // Struk opsional: kalau unggahannya gagal, pengeluarannya tetap
      // tersimpan dan struk bisa dilampirkan menyusul dari daftar.
      return {
        error: `Pengeluarannya sudah tersimpan, tapi struknya gagal diunggah: ${failed[0].reason}. Coba Simpan lagi, atau lampirkan menyusul dari daftar pengeluaran.`,
        expenseId: saved.expenseId,
      };
    },
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

      {/* Struk hampir selalu difoto di tempat, jadi jalur tercepatnya
          adalah kamera — bukan menyusuri folder. Lihat file-picker.tsx. */}
      <div>
        <span className="label">Struk (opsional)</span>
        {receipt ? (
          <div className="flex items-center gap-2 rounded-md border border-line bg-surface-muted px-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{receipt.name}</span>
              <span className="font-mono text-[11px] text-ink-subtle">
                {formatFileSize(receipt.size)}
              </span>
            </span>
            <button
              type="button"
              aria-label="Lepas struk"
              className="icon-btn icon-btn-danger"
              onClick={() => setReceipt(null)}
            >
              <IconTrash />
            </button>
          </div>
        ) : (
          <FilePickButton
            onFiles={(files) => setReceipt(files[0] ?? null)}
            sheetTitle="Ambil struk dari"
            className="btn btn-ghost w-full"
          >
            + Foto / pilih struk
          </FilePickButton>
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
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-1">
      <FilePickButton
        disabled={busy}
        sheetTitle="Ambil struk dari"
        className="-ml-1 rounded px-1 py-1.5 text-xs text-ink-subtle hover:text-accent disabled:opacity-50"
        onFiles={async (files) => {
          setBusy(true);
          setError(null);
          const { failed } = await uploadFiles(files, {
            kind: "link",
            link: { expenseId },
          });
          setBusy(false);

          if (failed.length > 0) {
            setError(failed[0].reason);
            return;
          }
          router.refresh();
        }}
      >
        {busy ? "Mengunggah struk…" : "+ Lampirkan struk"}
      </FilePickButton>
      {error && (
        <p className="text-[11px] text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 4.5h10M6.5 4V2.5h3V4M4.5 4.5l.5 9h6l.5-9"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
              className="mt-1 inline-block text-xs text-accent hover:underline"
            >
              Unduh struk
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
          className="field w-auto py-1 text-base sm:text-xs"
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

        <ConfirmButton
          label={`Hapus pengeluaran ${expense.title}`}
          disabled={pending}
          className="icon-btn icon-btn-danger ml-auto"
          title={`Hapus catatan "${expense.title}"?`}
          message="Struk yang sudah diunggah tetap tersimpan di Google Drive."
          onConfirm={() => startTransition(() => deleteExpense(expense.id))}
        >
          <IconTrash />
        </ConfirmButton>
      </div>
    </li>
  );
}

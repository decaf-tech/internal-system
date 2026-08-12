"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * Modal berbasis elemen <dialog> bawaan browser — dapat focus trap,
 * tutup dengan Escape, dan backdrop tanpa perlu library tambahan.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      // `cancel` menangani tombol Escape, `close` menangani sisanya —
      // keduanya harus melapor balik supaya state induk ikut tertutup.
      onCancel={onClose}
      onClose={onClose}
      // Menutup dengan mengetuk latar gelapnya. `<dialog>` tidak
      // melakukan ini sendiri, dan targetnya adalah dialog itu sendiri —
      // backdrop bukan elemen terpisah yang bisa dipasangi handler.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      // Di HP dialognya selebar layar dan menempel ke bawah supaya isinya
      // berada dekat jempol; di layar lebar tetap kotak di tengah.
      //
      // Satuan dvh, bukan vh: di Safari iOS, `vh` dihitung dari layar
      // tanpa bilah alamat, jadi 92vh tetap 92vh saat papan ketik naik —
      // dan tombol Simpan di kaki form berakhir di balik papan ketik.
      className="m-auto mb-0 max-h-[92dvh] w-full rounded-t-xl border border-line bg-surface p-0 text-ink backdrop:bg-ink/40 sm:mb-auto sm:w-[min(32rem,calc(100vw-2rem))] sm:rounded-lg"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 pr-2 pl-5 sm:py-3.5 sm:pr-3">
        <h2 className="min-w-0 truncate text-lg">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="icon-btn"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      {/* Padding bawah menyertakan area aman iPhone: tanpa itu tombol
          terakhir form berhimpitan dengan garis gestur home. */}
      <div className="max-h-[calc(92dvh-4rem)] overflow-y-auto px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
    </dialog>
  );
}

/**
 * Pengganti ringan untuk `confirm()` bawaan browser — dipakai untuk
 * konfirmasi aksi merusak (hapus) supaya tampilannya konsisten dengan
 * modal lain, terutama di HP.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Hapus",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-ink-muted">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Batal
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/**
 * Pengganti ringan untuk `prompt()` bawaan browser — satu kolom teks
 * dengan tombol Simpan/Batal.
 */
export function PromptDialog({
  open,
  onClose,
  onSubmit,
  title,
  label,
  defaultValue = "",
  confirmLabel = "Simpan",
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  label: string;
  defaultValue?: string;
  confirmLabel?: string;
}) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = value.trim();
          if (!trimmed) return;
          onSubmit(trimmed);
          onClose();
        }}
      >
        <label className="label" htmlFor="prompt-dialog-input">
          {label}
        </label>
        <input
          id="prompt-dialog-input"
          type="text"
          autoFocus
          className="field"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Batal
          </button>
          <button type="submit" className="btn btn-primary" disabled={!value.trim()}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Tombol submit yang otomatis nonaktif & berganti label saat form dikirim. */
export function SubmitButton({
  children,
  pendingLabel = "Menyimpan…",
  className = "btn btn-primary",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

"use client";

import { useEffect, useRef } from "react";
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
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-line bg-surface p-0 text-ink backdrop:bg-ink/30"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h2 className="text-lg">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="rounded p-1 text-ink-subtle hover:bg-surface-muted hover:text-ink"
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
      <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
    </dialog>
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

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Document } from "@/lib/types";
import { formatDate, formatFileSize } from "@/lib/format";
import { deleteDocument } from "@/lib/actions/documents";
import type { DocumentLink } from "@/lib/documents/types";
import { uploadFiles, type UploadProgress } from "@/lib/upload-client";
import { FilePickButton } from "@/components/file-picker";
import { ConfirmDialog } from "@/components/modal";
import { UploadProgressBar } from "@/components/upload-progress";

/**
 * Panel dokumen yang bisa dipasang di halaman klien, project, tugas,
 * catatan, rapat, atau pengeluaran.
 *
 * File-nya naik ke Google Drive, yang masuk Supabase cuma metadatanya
 * (lihat src/lib/actions/documents.ts dan PRD §2.1) — di mana pun panel
 * ini dipasang, tidak ada byte file yang menyentuh database. Folder
 * tujuannya ditentukan dari `link`, dan sejak `ensureAppFolder` folder
 * yang sama juga muncul di /documents, bukan cuma di Drive.
 *
 * `variant="inline"` melepas bingkai kartunya, untuk dipakai di dalam
 * modal yang sudah punya bingkainya sendiri.
 */
export function DocumentPanel({
  documents,
  link,
  title = "Dokumen",
  variant = "card",
  emptyLabel = "Belum ada dokumen.",
  onChanged,
}: {
  documents: Document[];
  link: DocumentLink;
  title?: string;
  variant?: "card" | "inline";
  emptyLabel?: string;
  /**
   * Dipanggil setelah daftar berubah, untuk pemakai yang daftarnya diambil
   * sendiri lewat server action alih-alih dirender server — `router
   * .refresh()` tidak menyentuh data seperti itu.
   */
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const pending = progress !== null;

  async function handleFiles(files: File[]) {
    setError(null);
    const { failed } = await uploadFiles(
      files,
      { kind: "link", link },
      setProgress,
    );
    setProgress(null);

    setError(failed.length > 0 ? failed[0].reason : null);
    router.refresh();
    onChanged?.();
  }

  const inline = variant === "inline";

  return (
    <section className={inline ? "mt-4 border-t border-line pt-3" : "card p-4"}>
      <div
        className={`flex items-center justify-between gap-3 ${
          inline ? "mb-2" : "mb-3"
        }`}
      >
        {inline ? (
          <span className="label mb-0">{title}</span>
        ) : (
          <h2 className="text-base">{title}</h2>
        )}
        <FilePickButton
          onFiles={handleFiles}
          multiple
          disabled={pending}
          sheetTitle="Lampirkan berkas dari"
          className={
            inline
              ? "shrink-0 rounded px-2 py-1.5 text-xs text-accent hover:bg-accent-soft disabled:opacity-50"
              : "btn btn-ghost text-xs"
          }
        >
          {pending ? "Mengunggah…" : "+ Unggah"}
        </FilePickButton>
      </div>

      {progress && (
        <div className="mb-3">
          <UploadProgressBar progress={progress} />
        </div>
      )}

      {error && (
        <p className="mb-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {documents.length === 0 ? (
        <p
          className={
            inline
              ? "text-xs text-ink-subtle"
              : "py-4 text-center text-sm text-ink-subtle"
          }
        >
          {emptyLabel}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <a
                  href={`/api/documents/${doc.id}/download`}
                  className="block truncate text-sm hover:text-accent hover:underline"
                >
                  {doc.name}
                </a>
                <p className="font-mono text-xs text-ink-subtle">
                  {formatFileSize(doc.size_bytes)} · {formatDate(doc.created_at)}
                </p>
              </div>
              <DeleteDocumentButton documentId={doc.id} onDeleted={onChanged} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DeleteDocumentButton({
  documentId,
  onDeleted,
}: {
  documentId: string;
  onDeleted?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Hapus dokumen"
        disabled={pending}
        className="icon-btn icon-btn-danger"
        onClick={() => setConfirming(true)}
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

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Hapus Dokumen"
        message="Hapus dokumen ini? File akan dipindah ke Trash Drive."
        onConfirm={() => {
          startTransition(async () => {
            await deleteDocument(documentId);
            onDeleted?.();
          });
        }}
      />
    </>
  );
}

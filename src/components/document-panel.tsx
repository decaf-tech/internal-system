"use client";

import { useRef, useState, useTransition } from "react";
import type { Document } from "@/lib/types";
import { formatDate, formatFileSize } from "@/lib/format";
import {
  deleteDocument,
  uploadDocument,
  type DocumentLink,
} from "@/lib/actions/documents";

/**
 * Panel dokumen yang bisa dipasang di halaman klien, project, tugas, atau
 * pengeluaran. File-nya naik ke Google Drive, metadatanya ke Supabase —
 * lihat src/lib/actions/documents.ts.
 */
export function DocumentPanel({
  documents,
  link,
  title = "Dokumen",
}: {
  documents: Document[];
  link: DocumentLink;
  title?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    setError(null);

    startTransition(async () => {
      const result = await uploadDocument(link, formData);
      setError(result.error);
      // Kosongkan input supaya file yang sama bisa dipilih lagi kalau
      // upload pertama gagal.
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base">{title}</h2>
        <button
          type="button"
          className="btn btn-ghost text-xs"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
        >
          {pending ? "Mengunggah…" : "+ Unggah"}
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {error && (
        <p className="mb-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {documents.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-subtle">
          Belum ada dokumen. Maksimal 4MB per file.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <a
                  href={`/api/documents/${doc.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sm hover:text-accent hover:underline"
                >
                  {doc.name}
                </a>
                <p className="font-mono text-xs text-ink-subtle">
                  {formatFileSize(doc.size_bytes)} · {formatDate(doc.created_at)}
                </p>
              </div>
              <DeleteDocumentButton documentId={doc.id} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DeleteDocumentButton({ documentId }: { documentId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label="Hapus dokumen"
      disabled={pending}
      className="shrink-0 rounded p-1.5 text-ink-subtle hover:bg-danger-soft hover:text-danger disabled:opacity-50"
      onClick={() => {
        if (!confirm("Hapus dokumen ini? File akan dipindah ke Trash Drive."))
          return;
        startTransition(() => deleteDocument(documentId));
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
  );
}

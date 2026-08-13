"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { Document } from "@/lib/types";
import { formatDate, formatFileSize } from "@/lib/format";
import { deleteDocument } from "@/lib/actions/documents";
import {
  finalizeToPdf,
  templatePanelContext,
} from "@/lib/actions/document-templates";
import { isGoogleDoc, type DocumentLink } from "@/lib/documents/types";
import { uploadFiles, type UploadProgress } from "@/lib/upload-client";
import { FilePickButton } from "@/components/file-picker";
import { ConfirmDialog } from "@/components/modal";
import {
  DocumentPreviewModal,
  DownloadDocumentButton,
} from "@/components/document-preview";
import { TemplateDialog } from "@/components/template-dialog";
import { UploadProgressBar } from "@/components/upload-progress";

type PanelContext = {
  available: boolean;
  hasTemplates: boolean;
  canFinalize: boolean;
};

/**
 * Panel ini terpasang di enam tempat, dan jawaban atas "ada template?
 * boleh finalisasi?" sama untuk semuanya. Dijawab sekali, bukan sekali
 * per panel.
 *
 * Kedaluwarsa semenit supaya template pertama yang baru didaftarkan tidak
 * perlu muat ulang halaman untuk muncul: navigasi antar-halaman di Next
 * tidak mengevaluasi ulang modul ini, jadi cache tanpa umur akan bertahan
 * sepanjang kunjungan.
 */
const CONTEXT_TTL_MS = 60_000;

let contextCache: { at: number; value: Promise<PanelContext> } | null = null;

function panelContext() {
  if (!contextCache || Date.now() - contextCache.at > CONTEXT_TTL_MS) {
    contextCache = { at: Date.now(), value: templatePanelContext() };
  }
  return contextCache.value;
}

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
  const [previewing, setPreviewing] = useState<Document | null>(null);
  const [generating, setGenerating] = useState(false);
  const [context, setContext] = useState<PanelContext | null>(null);

  const pending = progress !== null;

  useEffect(() => {
    let cancelled = false;
    void panelContext().then((value) => {
      if (!cancelled) setContext(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
        <div className="flex shrink-0 items-center gap-1">
          {context?.available && context.hasTemplates && (
            <button
              type="button"
              onClick={() => setGenerating(true)}
              className={
                inline
                  ? "rounded px-2 py-1.5 text-xs text-accent hover:bg-accent-soft"
                  : "btn btn-ghost text-xs"
              }
            >
              Dari Template
            </button>
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
          {documents.map((doc) => {
            const editable = isGoogleDoc(doc.mime_type) && doc.drive_web_link;

            return (
              <li key={doc.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  {/* Google Doc tidak punya byte tetap untuk diproksikan,
                      jadi namanya mengantar ke editor aslinya — itu juga
                      yang bikin fitur ini ada: menyunting di sana. */}
                  {editable ? (
                    <a
                      href={doc.drive_web_link ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-left text-sm hover:text-accent hover:underline"
                    >
                      {doc.name}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPreviewing(doc)}
                      className="block truncate text-left text-sm hover:text-accent hover:underline"
                    >
                      {doc.name}
                    </button>
                  )}
                  <p className="font-mono text-xs text-ink-subtle">
                    {doc.doc_number ? `${doc.doc_number} · ` : ""}
                    {editable
                      ? "Google Docs"
                      : formatFileSize(doc.size_bytes)}{" "}
                    · {formatDate(doc.created_at)}
                  </p>
                </div>

                {editable && context?.canFinalize && (
                  <FinalizeButton documentId={doc.id} onDone={onChanged} />
                )}
                {!editable && (
                  <DownloadDocumentButton
                    documentId={doc.id}
                    documentName={doc.name}
                  />
                )}
                <DeleteDocumentButton documentId={doc.id} onDeleted={onChanged} />
              </li>
            );
          })}
        </ul>
      )}

      <DocumentPreviewModal doc={previewing} onClose={() => setPreviewing(null)} />

      <TemplateDialog
        open={generating}
        link={link}
        onClose={() => setGenerating(false)}
        onGenerated={() => {
          router.refresh();
          onChanged?.();
        }}
      />
    </section>
  );
}

/**
 * "Jadikan PDF" — ekspor isi Doc apa adanya jadi PDF di folder yang sama.
 *
 * Cuma muncul untuk super admin, dan server action-nya memeriksa ulang hal
 * yang sama: tombol yang tidak tergambar bukan penjagaan, cuma tampilan.
 */
function FinalizeButton({
  documentId,
  onDone,
}: {
  documentId: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={pending}
        title={error ?? "Terbitkan versi PDF dari isi dokumen saat ini"}
        className="shrink-0 rounded px-2 py-1.5 text-xs text-ink-muted hover:bg-surface-muted hover:text-ink disabled:opacity-50"
        onClick={() =>
          startTransition(async () => {
            const result = await finalizeToPdf(documentId);
            setError(result.error);
            if (!result.error) {
              router.refresh();
              onDone?.();
            }
          })
        }
      >
        {pending ? "Membuat…" : "Jadikan PDF"}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </>
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

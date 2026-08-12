"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatDate, formatFileSize } from "@/lib/format";
import type { StorageQuota } from "@/lib/storage";
import type { Document, Folder } from "@/lib/types";
import { deleteDocument } from "@/lib/actions/documents";
import { uploadFiles, type UploadProgress } from "@/lib/upload-client";
import { FilePickButton } from "@/components/file-picker";
import { ConfirmDialog, PromptDialog } from "@/components/modal";
import {
  DocumentPreviewModal,
  DownloadDocumentButton,
} from "@/components/document-preview";
import { UploadProgressBar } from "@/components/upload-progress";
import { createFolder, deleteFolder, renameFolder } from "./actions";

export type BrowserDocument = Document & {
  uploader: { full_name: string } | null;
  client: { id: string; name: string } | null;
};

/**
 * Penjelajah berkas: folder dan file dalam satu daftar, dengan unggah
 * bebas (termasuk seret-dan-lepas ke area daftar) dan pembuatan folder
 * langsung dari sini.
 */
export function FileBrowser({
  currentFolder,
  breadcrumb,
  folders,
  documents,
  quota,
}: {
  currentFolder: Folder | null;
  breadcrumb: Folder[];
  folders: Folder[];
  documents: BrowserDocument[];
  quota: StorageQuota | null;
}) {
  const router = useRouter();
  const folderId = currentFolder?.id ?? null;
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const uploading = progress !== null;

  async function upload(files: File[]) {
    if (files.length === 0 || uploading) return;

    setError(null);
    const { failed } = await uploadFiles(
      files,
      { kind: "folder", folderId },
      setProgress,
    );
    setProgress(null);

    setError(
      failed.length > 0
        ? `Gagal diunggah: ${failed.map((f) => `${f.name} — ${f.reason}`).join("; ")}`
        : null,
    );

    // Daftar file digambar di server, jadi minta halaman ini diambil ulang
    // setelah unggahan selesai.
    router.refresh();
  }

  const empty = folders.length === 0 && documents.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb trail={breadcrumb} />

        {/* Di HP kedua tombol berbagi lebar layar rata dua; berjejer rapat
            di sudut kanan berarti keduanya kecil dan bersebelahan. */}
        <div className="flex w-full gap-2 sm:w-auto">
          <NewFolderButton parentId={folderId} onError={setError} />
          <FilePickButton
            onFiles={upload}
            multiple
            disabled={uploading}
            sheetTitle="Unggah ke folder ini"
            className="btn btn-accent flex-1 sm:flex-none"
          >
            {uploading ? "Mengunggah…" : "+ Unggah File"}
          </FilePickButton>
        </div>
      </div>

      {quota && <StorageQuotaIndicator quota={quota} />}

      {progress && <UploadProgressBar progress={progress} />}

      {error && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div
        // Seret file dari desktop ke mana saja di area ini untuk mengunggah.
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          upload(Array.from(event.dataTransfer.files));
        }}
        className={`card transition-colors ${
          dragging ? "border-accent bg-accent-soft/40" : ""
        }`}
      >
        {empty ? (
          <div className="flex flex-col items-center gap-1.5 px-6 py-16 text-center">
            <p className="font-medium">Folder ini kosong</p>
            <p className="max-w-sm text-sm text-ink-muted">
              Ketuk “Unggah File” untuk mengambil foto, memilih dari galeri,
              atau menaruh berkas. Di laptop, file juga bisa diseret langsung
              ke sini.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {folders.map((folder) => (
              <FolderRow key={folder.id} folder={folder} onError={setError} />
            ))}
            {documents.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} />
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-ink-subtle">
        File dikirim langsung dari browser ke Google Drive tim, jadi tidak ada
        batas 4MB lagi — maksimal 512MB per file. Folder yang dibuat di sini
        ikut terbentuk di Drive dengan struktur yang sama.
      </p>
    </div>
  );
}

/**
 * Sisa kuota Google Drive tim. Ini kuota akun secara keseluruhan (Drive
 * bawaan Google, bukan cuma folder root aplikasi) — Drive API tidak
 * membedakan keduanya, jadi paling jujur ditampilkan apa adanya.
 */
function StorageQuotaIndicator({ quota }: { quota: StorageQuota }) {
  const { usageBytes, limitBytes } = quota;

  // Akun tanpa batas (mis. Workspace tertentu) tidak punya angka
  // pembanding — tampilkan cuma jumlah terpakai, tanpa bar.
  if (limitBytes === null) {
    return (
      <p className="text-xs text-ink-subtle">
        {formatFileSize(usageBytes)} terpakai di Google Drive · kuota tidak
        terbatas.
      </p>
    );
  }

  const percent = limitBytes > 0 ? Math.min(100, (usageBytes / limitBytes) * 100) : 0;
  const nearFull = percent >= 90;

  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2">
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
        <span className={nearFull ? "font-medium text-danger" : "text-ink-muted"}>
          {formatFileSize(usageBytes)} dari {formatFileSize(limitBytes)} terpakai
        </span>
        <span className="font-mono text-[11px] text-ink-subtle">
          {percent.toFixed(1).replace(".", ",")}%
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-surface-muted">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ${
            nearFull ? "bg-danger" : "bg-accent"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {nearFull && (
        <p className="mt-1.5 text-[11px] text-danger">
          Kuota Google Drive hampir habis — file baru bisa gagal diunggah.
        </p>
      )}
    </div>
  );
}

function Breadcrumb({ trail }: { trail: Folder[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm">
      <Link
        href="/documents"
        className={
          trail.length === 0
            ? "font-medium"
            : "text-ink-muted hover:text-accent hover:underline"
        }
      >
        Semua Dokumen
      </Link>
      {trail.map((folder, index) => {
        const last = index === trail.length - 1;
        return (
          <span key={folder.id} className="flex items-center gap-1">
            <span className="text-ink-subtle">/</span>
            {last ? (
              <span className="font-medium">{folder.name}</span>
            ) : (
              <Link
                href={`/documents?folder=${folder.id}`}
                className="text-ink-muted hover:text-accent hover:underline"
              >
                {folder.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function NewFolderButton({
  parentId,
  onError,
}: {
  parentId: string | null;
  onError: (message: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost flex-1 sm:flex-none"
        disabled={pending}
        onClick={() => setOpen(true)}
      >
        + Folder
      </button>
      <PromptDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Folder Baru"
        label="Nama folder"
        confirmLabel="Buat"
        onSubmit={(name) => {
          onError(null);
          startTransition(async () => {
            const result = await createFolder(parentId, name);
            onError(result.error);
          });
        }}
      />
    </>
  );
}

function FolderRow({
  folder,
  onError,
}: {
  folder: Folder;
  onError: (message: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <span className="text-ink-subtle">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <path
            d="M1.5 4a1 1 0 011-1h3.2l1.3 1.5h6.5a1 1 0 011 1v7a1 1 0 01-1 1h-11a1 1 0 01-1-1V4z"
            fill="#e8dcc4"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <Link
        href={`/documents?folder=${folder.id}`}
        className="min-w-0 flex-1 truncate text-sm font-medium hover:text-accent hover:underline"
      >
        {folder.name}
      </Link>

      <button
        type="button"
        disabled={pending}
        className="icon-btn"
        aria-label={`Ganti nama folder ${folder.name}`}
        onClick={() => setRenaming(true)}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path
            d="M11.5 2.5l2 2L6 12l-2.5.5L4 10l7.5-7.5z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <button
        type="button"
        disabled={pending}
        className="icon-btn icon-btn-danger"
        aria-label={`Hapus folder ${folder.name}`}
        onClick={() => setDeleting(true)}
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

      <PromptDialog
        open={renaming}
        onClose={() => setRenaming(false)}
        title="Ganti Nama Folder"
        label="Nama baru"
        defaultValue={folder.name}
        onSubmit={(name) => {
          if (name === folder.name) return;
          startTransition(async () => {
            const result = await renameFolder(folder.id, name);
            onError(result.error);
          });
        }}
      />

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Hapus Folder"
        message={`Hapus folder "${folder.name}"? Subfolder ikut terhapus dari daftar, tapi semua file tetap aman di Google Drive.`}
        onConfirm={() => {
          startTransition(async () => {
            const result = await deleteFolder(folder.id);
            onError(result.error);
          });
        }}
      />
    </li>
  );
}

function DocumentRow({ doc }: { doc: BrowserDocument }) {
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <span className="text-ink-subtle">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <path
            d="M9 2H4.5A1.5 1.5 0 003 3.5v9A1.5 1.5 0 004.5 14h7a1.5 1.5 0 001.5-1.5V6L9 2z"
            fill="#fff"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.1" />
        </svg>
      </span>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setPreviewing(true)}
          className="block truncate text-left text-sm hover:text-accent hover:underline"
        >
          {doc.name}
        </button>
        <p className="font-mono text-[11px] text-ink-subtle">
          {formatFileSize(doc.size_bytes)} · {formatDate(doc.created_at)}
          {doc.uploader && ` · ${doc.uploader.full_name}`}
          {doc.client && ` · ${doc.client.name}`}
        </p>
      </div>

      <DownloadDocumentButton documentId={doc.id} documentName={doc.name} />

      <button
        type="button"
        disabled={pending}
        aria-label={`Hapus ${doc.name}`}
        className="icon-btn icon-btn-danger"
        onClick={() => setDeleting(true)}
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
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Hapus Dokumen"
        message="Hapus dokumen ini? File dipindah ke Trash Drive."
        onConfirm={() => startTransition(() => deleteDocument(doc.id))}
      />

      <DocumentPreviewModal
        doc={previewing ? doc : null}
        onClose={() => setPreviewing(false)}
      />
    </li>
  );
}

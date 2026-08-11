"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { formatDate, formatFileSize } from "@/lib/format";
import type { Document, Folder } from "@/lib/types";
import { deleteDocument } from "@/lib/actions/documents";
import { uploadFiles, type UploadProgress } from "@/lib/upload-client";
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
}: {
  currentFolder: Folder | null;
  breadcrumb: Folder[];
  folders: Folder[];
  documents: BrowserDocument[];
}) {
  const router = useRouter();
  const folderId = currentFolder?.id ?? null;
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploading = progress !== null;

  async function upload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || uploading) return;

    setError(null);
    const { failed } = await uploadFiles(
      Array.from(fileList),
      { kind: "folder", folderId },
      setProgress,
    );
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";

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

        <div className="flex gap-2">
          <NewFolderButton parentId={folderId} onError={setError} />
          <button
            type="button"
            className="btn btn-accent"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Mengunggah…" : "+ Unggah File"}
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => upload(event.target.files)}
          />
        </div>
      </div>

      {progress && <UploadProgressBar progress={progress} />}

      {error && (
        <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
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
          upload(event.dataTransfer.files);
        }}
        className={`card transition-colors ${
          dragging ? "border-accent bg-accent-soft/40" : ""
        }`}
      >
        {empty ? (
          <div className="flex flex-col items-center gap-1.5 px-6 py-16 text-center">
            <p className="font-medium">Folder ini kosong</p>
            <p className="max-w-sm text-sm text-ink-muted">
              Seret file ke sini untuk mengunggah, atau buat folder baru.
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
 * Bilah progres unggahan. Untuk file besar ini yang membedakan "sedang
 * berjalan" dari "aplikasinya hang".
 */
export function UploadProgressBar({ progress }: { progress: UploadProgress }) {
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-xs text-ink-muted">
          {progress.count > 1 && (
            <span className="font-mono text-ink-subtle">
              {progress.index}/{progress.count}{" "}
            </span>
          )}
          {progress.name}
        </p>
        <span className="font-mono text-[11px] text-ink-subtle">
          {progress.percent}%
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-200"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
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

  return (
    <button
      type="button"
      className="btn btn-ghost"
      disabled={pending}
      onClick={() => {
        const name = prompt("Nama folder baru:");
        if (!name) return;
        onError(null);
        startTransition(async () => {
          const result = await createFolder(parentId, name);
          onError(result.error);
        });
      }}
    >
      + Folder
    </button>
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
        className="rounded p-1.5 text-ink-subtle hover:bg-surface-muted hover:text-ink disabled:opacity-50"
        aria-label={`Ganti nama folder ${folder.name}`}
        onClick={() => {
          const name = prompt("Nama baru:", folder.name);
          if (!name || name === folder.name) return;
          startTransition(async () => {
            const result = await renameFolder(folder.id, name);
            onError(result.error);
          });
        }}
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
        className="rounded p-1.5 text-ink-subtle hover:bg-danger-soft hover:text-danger disabled:opacity-50"
        aria-label={`Hapus folder ${folder.name}`}
        onClick={() => {
          if (
            !confirm(
              `Hapus folder "${folder.name}"? Subfolder ikut terhapus dari daftar, tapi semua file tetap aman di Google Drive.`,
            )
          )
            return;
          startTransition(async () => {
            const result = await deleteFolder(folder.id);
            onError(result.error);
          });
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
    </li>
  );
}

function DocumentRow({ doc }: { doc: BrowserDocument }) {
  const [pending, startTransition] = useTransition();

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
        <a
          href={`/api/documents/${doc.id}/download`}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-sm hover:text-accent hover:underline"
        >
          {doc.name}
        </a>
        <p className="font-mono text-[11px] text-ink-subtle">
          {formatFileSize(doc.size_bytes)} · {formatDate(doc.created_at)}
          {doc.uploader && ` · ${doc.uploader.full_name}`}
          {doc.client && ` · ${doc.client.name}`}
        </p>
      </div>

      <button
        type="button"
        disabled={pending}
        aria-label={`Hapus ${doc.name}`}
        className="rounded p-1.5 text-ink-subtle hover:bg-danger-soft hover:text-danger disabled:opacity-50"
        onClick={() => {
          if (!confirm("Hapus dokumen ini? File dipindah ke Trash Drive."))
            return;
          startTransition(() => deleteDocument(doc.id));
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
    </li>
  );
}

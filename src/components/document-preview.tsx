"use client";

import { Modal } from "@/components/modal";

type PreviewableDocument = {
  id: string;
  name: string;
  mime_type: string | null;
};

/** URL yang menyajikan file apa adanya, untuk ditampilkan di tempat. */
function inlineUrl(id: string) {
  return `/api/documents/${id}/download?disposition=inline`;
}

/** URL yang memaksa unduhan. */
function downloadUrl(id: string) {
  return `/api/documents/${id}/download`;
}

/**
 * Pop-up pratinjau dokumen.
 *
 * Gambar, PDF, video, audio, dan teks ditampilkan langsung. Tipe lain
 * (mis. Word, Excel, zip) tidak bisa dirender browser, jadi yang muncul
 * pesan singkat dengan tombol unduh.
 */
export function DocumentPreviewModal({
  doc,
  onClose,
}: {
  doc: PreviewableDocument | null;
  onClose: () => void;
}) {
  return (
    <Modal open={doc !== null} onClose={onClose} title={doc?.name ?? ""} wide>
      {doc && (
        <div className="space-y-3">
          <PreviewBody doc={doc} />

          <div className="flex justify-end gap-2">
            <a
              href={inlineUrl(doc.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost text-sm"
            >
              Buka di Tab Baru
            </a>
            <a
              href={downloadUrl(doc.id)}
              download
              className="btn btn-primary text-sm"
            >
              Unduh
            </a>
          </div>
        </div>
      )}
    </Modal>
  );
}

function PreviewBody({ doc }: { doc: PreviewableDocument }) {
  const mime = doc.mime_type ?? "";
  const src = inlineUrl(doc.id);
  const frame = "h-[65dvh] w-full rounded-md border border-line";

  if (mime.startsWith("image/")) {
    return (
      // File privat dari route API kita sendiri, bukan aset statis yang bisa
      // dioptimalkan next/image.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={doc.name}
        className="max-h-[65dvh] w-full rounded-md border border-line object-contain"
      />
    );
  }

  if (mime.startsWith("video/")) {
    return <video src={src} controls className={frame} />;
  }

  if (mime.startsWith("audio/")) {
    return <audio src={src} controls className="w-full" />;
  }

  if (mime === "application/pdf") {
    // <object>, bukan <iframe>: kalau browser tidak punya penampil PDF —
    // umum di HP — isi di dalamnya yang tampil, bukan kotak kosong.
    return (
      <object data={src} type="application/pdf" className={frame}>
        <Unsupported message="Browser ini tidak bisa menampilkan PDF di tempat." />
      </object>
    );
  }

  if (mime.startsWith("text/") || mime === "application/json") {
    return <iframe src={src} title={doc.name} className={frame} />;
  }

  return <Unsupported message="Pratinjau tidak tersedia untuk tipe file ini." />;
}

function Unsupported({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-line bg-surface-muted px-4 py-8 text-center">
      <p className="text-sm text-ink-muted">{message}</p>
      <p className="mt-1 text-xs text-ink-subtle">
        Buka di tab baru atau unduh untuk melihat isinya.
      </p>
    </div>
  );
}

/** Tombol ikon unduh, dipasang di sebelah nama dokumen. */
export function DownloadDocumentButton({
  documentId,
  documentName,
}: {
  documentId: string;
  documentName: string;
}) {
  return (
    <a
      href={downloadUrl(documentId)}
      download
      aria-label={`Unduh ${documentName}`}
      className="icon-btn"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 2.5v7.5m0 0l-3-3m3 3l3-3M3.5 12.5h9"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}

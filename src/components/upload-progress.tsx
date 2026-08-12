import type { UploadProgress } from "@/lib/upload-client";

/**
 * Bilah progres unggahan. Untuk berkas besar ini yang membedakan "sedang
 * berjalan" dari "aplikasinya hang".
 *
 * Berdiri sebagai komponennya sendiri, bukan ikut di `file-browser.tsx`:
 * `DocumentPanel` menumpang di modal tugas, halaman catatan, project, dan
 * pengeluaran — dan selama ia mengimpor dari file-browser, seluruh
 * penjelajah berkas (beserta server action folder dan `next/link`-nya)
 * ikut terbawa ke bundel semua halaman itu tanpa pernah dipakai.
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
      <div
        role="progressbar"
        aria-label={`Mengunggah ${progress.name}`}
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1 overflow-hidden rounded-full bg-surface-muted"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-200"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
}

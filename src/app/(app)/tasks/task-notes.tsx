"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatDate } from "@/lib/format";
import { NOTE_KIND_LABEL, type NoteSummary } from "@/lib/types";
import { NotePicker } from "@/components/note-picker";
import { createNote, linkNote, unlinkNote } from "@/app/(app)/notes/actions";

/**
 * Catatan yang menempel pada sebuah tugas, ditampilkan di dalam modalnya.
 *
 * Sengaja hanya daftar + tombol, bukan editor yang ikut terbuka di sini.
 * Kolom "Deskripsi" di form tugas sudah menampung satu-dua kalimat; yang
 * dibawa ke sini adalah tulisan yang butuh ruang — dan mengetiknya di
 * dalam jendela setinggi 70vh yang bisa tertutup dengan Escape adalah cara
 * cepat kehilangan setengah paragraf.
 *
 * Dua tombol, bukan satu: menulis catatan baru dan mengaitkan catatan yang
 * sudah ada adalah dua niat yang berbeda. Notulen rapat yang menghasilkan
 * tiga tugas tindak lanjut ditulis sekali, lalu dikaitkan tiga kali —
 * sejak migration 007 satu catatan boleh menempel di beberapa tugas.
 */
export function TaskNotes({
  taskId,
  taskTitle,
  notes,
}: {
  taskId: string;
  taskTitle: string;
  notes: NoteSummary[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Tautan yang baru ditambahkan ditampilkan seketika. Modal tugas ini
  // hidup di atas papan yang datanya dirender di server — menunggu
  // `router.refresh()` selesai berarti beberapa ratus milidetik di mana
  // catatan yang barusan dipilih belum kelihatan di mana-mana.
  const [added, setAdded] = useState<NoteSummary[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);

  const shown = [...notes, ...added].filter(
    (note) => !removed.includes(note.id),
  );

  return (
    <section className="mt-4 border-t border-line pt-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="label mb-0">Catatan</span>
        <div className="flex items-center gap-3">
          <NotePicker
            excludeIds={shown.map((note) => note.id)}
            disabled={pending}
            onPick={(note) => {
              setAdded((current) => [...current, note]);
              setRemoved((current) => current.filter((id) => id !== note.id));
              setError(null);
              startTransition(async () => {
                const result = await linkNote({ noteId: note.id, taskId });
                if (result.error) {
                  setAdded((current) =>
                    current.filter((entry) => entry.id !== note.id),
                  );
                  setError(result.error);
                  return;
                }
                router.refresh();
              });
            }}
          />
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(() => {
                // Berpindah ke halaman editor catatan yang baru dibuat.
                void createNote({ taskIds: [taskId], title: taskTitle });
              })
            }
            className="text-xs text-accent hover:underline disabled:opacity-50"
          >
            + Tulis catatan
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-2 rounded-md bg-danger-soft px-2 py-1.5 text-xs text-danger">
          {error}
        </p>
      )}

      {shown.length === 0 ? (
        <p className="text-xs text-ink-subtle">
          Belum ada catatan untuk tugas ini.
        </p>
      ) : (
        <ul className="space-y-1">
          {shown.map((note) => (
            <li key={note.id} className="group flex items-center gap-1">
              <Link
                href={`/notes/${note.id}`}
                className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-muted"
              >
                <span className="truncate">
                  {note.title || "Tanpa judul"}
                  {note.kind === "mom" && (
                    <span className="ml-1.5 font-mono text-[10px] text-ink-subtle">
                      {NOTE_KIND_LABEL.mom}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-ink-subtle">
                  {formatDate(note.updated_at)}
                </span>
              </Link>

              <button
                type="button"
                aria-label={`Lepas kaitan "${note.title || "Tanpa judul"}"`}
                title="Lepas kaitan (catatannya tidak dihapus)"
                disabled={pending}
                className="shrink-0 rounded p-1 text-ink-subtle opacity-0 transition-opacity hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-50"
                onClick={() => {
                  setRemoved((current) => [...current, note.id]);
                  startTransition(async () => {
                    await unlinkNote({ noteId: note.id, taskId });
                    router.refresh();
                  });
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2.5 2.5l7 7M9.5 2.5l-7 7"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

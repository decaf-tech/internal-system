"use client";

import { useEffect, useRef, useState } from "react";
import { formatDate } from "@/lib/format";
import { NOTE_KIND_LABEL, type NoteSummary } from "@/lib/types";
import { searchNotes } from "@/app/(app)/notes/actions";

/** Jeda ketik sebelum pencarian dikirim ke server. */
const SEARCH_DELAY_MS = 250;

/**
 * Memilih catatan yang SUDAH ADA untuk dikaitkan ke tugas atau rapat.
 *
 * Pencariannya dijalankan di server, sama seperti halaman /notes: daftar
 * catatan tumbuh terus, dan mengirim seluruh arsipnya ke browser demi satu
 * dropdown adalah ongkos yang dibayar tiap kali modal tugas dibuka — bukan
 * hanya saat tombol ini benar-benar ditekan.
 *
 * Kotaknya menutup sendiri saat diklik di luar. Ini hidup di dalam modal
 * tugas yang sudah punya tombol tutupnya sendiri, jadi menambah satu
 * tombol "batal" lagi cuma menumpuk jalan keluar untuk hal yang sama.
 */
export function NotePicker({
  excludeIds,
  onPick,
  disabled,
  label = "+ Kaitkan catatan",
}: {
  /** Catatan yang sudah tertaut — tidak perlu ditawarkan lagi. */
  excludeIds: string[];
  onPick: (note: NoteSummary) => void;
  disabled?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NoteSummary[] | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // `stale` menjaga urutan: hasil pencarian yang lebih lambat untuk kata
    // yang sudah tidak diketik lagi tidak boleh menimpa hasil terbaru.
    let stale = false;
    const timer = setTimeout(async () => {
      const found = await searchNotes({ query, excludeIds });
      if (!stale) setResults(found);
    }, SEARCH_DELAY_MS);

    return () => {
      stale = true;
      clearTimeout(timer);
    };
    // `excludeIds` sengaja dibaca lewat panjangnya: array-nya dirakit ulang
    // tiap render induk, jadi membandingkan referensinya akan memicu
    // pencarian baru pada tiap ketikan di tempat lain di halaman.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query, excludeIds.length]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="text-xs text-accent hover:underline disabled:opacity-50"
      >
        {label}
      </button>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-ink-subtle hover:underline"
      >
        {label}
      </button>

      <div className="absolute right-0 z-30 mt-1.5 w-72 max-w-[85vw] rounded-lg border border-line-strong bg-surface p-2 shadow-lg">
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari judul atau isi catatan…"
          className="field mb-2 text-sm"
        />

        {results === null ? (
          <p className="px-2 py-3 text-xs text-ink-subtle">Mencari…</p>
        ) : results.length === 0 ? (
          <p className="px-2 py-3 text-xs text-ink-subtle">
            {query
              ? `Tidak ada catatan yang cocok dengan "${query}".`
              : "Semua catatan yang ada sudah tertaut di sini."}
          </p>
        ) : (
          <ul className="max-h-64 space-y-0.5 overflow-y-auto">
            {results.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(note);
                    setOpen(false);
                    setQuery("");
                    setResults(null);
                  }}
                  className="w-full rounded-md px-2 py-1.5 text-left hover:bg-surface-muted"
                >
                  <span className="block truncate text-sm">
                    {note.title || "Tanpa judul"}
                  </span>
                  <span className="font-mono text-[10px] text-ink-subtle">
                    {NOTE_KIND_LABEL[note.kind]} · {formatDate(note.updated_at)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

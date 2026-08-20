"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { NoteKind } from "@/lib/types";
import { createNote } from "./actions";

/**
 * Dua tombol, bukan satu dengan dropdown jenis.
 *
 * Notulen dan catatan lepas dimulai dari niat yang berbeda dan lahir
 * dengan isi yang berbeda (notulen langsung berisi kerangkanya). Memilih
 * jenis setelah halaman kosong terbuka berarti kerangkanya baru muncul
 * setelah orangnya terlanjur bingung mau mulai dari mana.
 */
export function NewNoteButtons() {
  const [pending, startTransition] = useTransition();

  function create(kind: NoteKind) {
    // Aksinya berpindah halaman ke editor catatan yang baru dibuat, jadi
    // tidak ada hasil yang perlu ditunggu di sini.
    startTransition(() => {
      void createNote({ kind });
    });
  }

  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
      <button
        type="button"
        className="btn btn-ghost"
        disabled={pending}
        onClick={() => create("note")}
      >
        + Catatan
      </button>
      <button
        type="button"
        className="btn btn-accent"
        disabled={pending}
        onClick={() => create("mom")}
      >
        + Notulen
      </button>
    </div>
  );
}

const TABS: { value: NoteKind | null; label: string }[] = [
  { value: null, label: "Semua" },
  { value: "mom", label: "Notulen" },
  { value: "note", label: "Catatan" },
];

/**
 * Penyaring jenis + kotak cari. Keduanya menulis ke URL, bukan ke state
 * komponen — hasil pencarian jadi bisa di-bookmark & di-share, dan tombol
 * kembali browser mengembalikan pencarian sebelumnya, bukan mengosongkan
 * halaman.
 */
export function NotesFilter({
  kind,
  query,
}: {
  kind: NoteKind | null;
  query: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(query);
  const [pending, startTransition] = useTransition();

  // Kotaknya ikut kalau URL berubah dari luar — tombol kembali browser,
  // atau tautan pencarian yang dibuka dari tempat lain. Disetel saat
  // render (pola resmi "adjusting state on prop change"), bukan lewat
  // efek: efek berjalan setelah cat pertama, jadi kotaknya sempat
  // terlihat berisi pencarian yang lama.
  const [urlQuery, setUrlQuery] = useState(query);
  if (query !== urlQuery) {
    setUrlQuery(query);
    setDraft(query);
  }

  function pushUrl(nextKind: NoteKind | null, nextQuery: string) {
    const params = new URLSearchParams();
    if (nextKind) params.set("kind", nextKind);
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    const search = params.toString();
    startTransition(() => router.replace(search ? `/backoffice/notes?${search}` : "/backoffice/notes"));
  }

  // Menunggu jeda mengetik sebelum menembak server: tiap huruf berarti
  // satu query `ilike` ke database, dan mengetik "proposal" tanpa jeda ini
  // berarti delapan.
  useEffect(() => {
    if (draft.trim() === query) return;
    const timer = setTimeout(() => pushUrl(kind, draft), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="inline-flex rounded-md border border-line bg-surface p-0.5">
        {TABS.map((tab) => {
          const active = kind === tab.value;
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => pushUrl(tab.value, draft)}
              className={`rounded px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-ink font-medium text-ink-inverse"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <input
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Cari judul atau isi…"
          className="field pr-16"
        />
        {pending && (
          <span className="absolute inset-y-0 right-3 flex items-center font-mono text-[10px] text-ink-subtle">
            mencari…
          </span>
        )}
      </div>
    </div>
  );
}

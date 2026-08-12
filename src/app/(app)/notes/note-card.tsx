"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { MarkdownView } from "@/components/markdown-editor";
import { MemberAvatar, MemberAvatarStack } from "@/components/member-avatar";
import { ConfirmButton, Modal } from "@/components/modal";
import { formatDate } from "@/lib/format";
import { NOTE_KIND_LABEL, type NoteWithRelations } from "@/lib/types";
import { deleteNote, noteContent } from "./actions";

/**
 * Catatan versi kartu: seluruh relasinya ikut, isinya tidak.
 *
 * `content` sengaja ditinggal di server dan diganti cuplikan 160 karakter
 * — lihat komentar di `page.tsx`. Isi lengkapnya diambil belakangan lewat
 * `noteContent()` kalau pratinjaunya benar-benar dibuka.
 */
export type NoteCardData = Omit<NoteWithRelations, "content"> & {
  snippet: string;
};

/**
 * Satu kartu catatan di daftar.
 *
 * Mengetuk kartunya membuka **pratinjau**, bukan langsung editor. Dulu
 * seluruh kartu adalah tautan ke `/notes/[id]`, jadi satu-satunya cara
 * mengingat isi sebuah notulen adalah masuk ke editornya — halaman penuh
 * dengan autosave yang menyala, untuk sesuatu yang niatnya cuma "yang mana
 * ya ini". Pratinjau menjawab pertanyaan itu tanpa meninggalkan daftar,
 * dan tombol "Buka penuh" tetap ada satu ketukan jauhnya untuk yang memang
 * mau menyunting.
 *
 * Sunting & hapus diangkat jadi tombol sendiri di kaki kartu, bukan
 * disembunyikan di balik hover: separuh pemakaian sistem ini dari HP, dan
 * di sana tidak ada hover sama sekali.
 */
export function NoteCard({ note }: { note: NoteCardData }) {
  const [open, setOpen] = useState(false);
  // `null` = belum pernah diambil. String kosong tetap string, jadi catatan
  // yang memang kosong tidak ikut memicu pengambilan ulang tiap kali
  // pratinjaunya dibuka.
  const [content, setContent] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, startLoading] = useTransition();

  const isMom = note.kind === "mom";
  const meta = [
    note.client?.name,
    note.project?.name,
    // Satu catatan bisa menempel ke beberapa tugas sekaligus; di kartu
    // sesempit ini yang muat cuma yang pertama.
    note.tasks.length > 1
      ? `${note.tasks[0].title} +${note.tasks.length - 1}`
      : note.tasks[0]?.title,
    note.events[0]?.event?.title,
  ]
    .filter(Boolean)
    .join(" · ");

  function openPreview() {
    setOpen(true);
    if (content !== null) return;
    setFailed(false);
    startLoading(async () => {
      const result = await noteContent(note.id);
      if (result === null) setFailed(true);
      else setContent(result);
    });
  }

  return (
    <li className="card flex h-full flex-col">
      <button
        type="button"
        onClick={openPreview}
        className="flex flex-1 flex-col gap-2 rounded-t-lg p-4 text-left transition-colors hover:bg-surface-muted/50"
      >
        <div className="flex items-center gap-2">
          <span
            className={`badge ${
              isMom
                ? "bg-forest-soft text-forest"
                : "bg-surface-sunken text-ink-muted"
            }`}
          >
            {NOTE_KIND_LABEL[note.kind]}
          </span>
          {isMom && note.meeting_date && (
            <span className="font-mono text-[11px] text-ink-subtle">
              {formatDate(note.meeting_date)}
            </span>
          )}
        </div>

        <h2 className="line-clamp-2 text-base leading-snug">
          {note.title || "Tanpa judul"}
        </h2>

        {note.snippet && (
          <p className="line-clamp-3 text-sm text-ink-muted">{note.snippet}</p>
        )}

        {meta && (
          <p className="truncate font-mono text-[11px] text-ink-subtle">
            {meta}
          </p>
        )}
      </button>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line py-1.5 pr-1.5 pl-4">
        <div className="flex min-w-0 items-center gap-2">
          {note.participants.length > 0 ? (
            <MemberAvatarStack members={note.participants} size="xs" />
          ) : (
            <MemberAvatar member={note.editor ?? note.author} size="xs" />
          )}
          <span className="truncate text-xs text-ink-subtle">
            {formatDate(note.updated_at)}
          </span>
        </div>

        <div className="flex shrink-0 items-center">
          <Link
            href={`/notes/${note.id}`}
            aria-label={`Sunting ${note.title || "catatan tanpa judul"}`}
            title="Sunting"
            className="icon-btn"
          >
            <IconPencil />
          </Link>
          <DeleteNoteButton note={note} />
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={note.title || "Tanpa judul"}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className={`badge ${
              isMom
                ? "bg-forest-soft text-forest"
                : "bg-surface-sunken text-ink-muted"
            }`}
          >
            {NOTE_KIND_LABEL[note.kind]}
          </span>
          {isMom && note.meeting_date && (
            <span className="font-mono text-[11px] text-ink-subtle">
              {formatDate(note.meeting_date)}
            </span>
          )}
          {note.participants.length > 0 && (
            <MemberAvatarStack members={note.participants} size="xs" />
          )}
        </div>

        {meta && (
          <p className="mb-3 font-mono text-[11px] text-ink-subtle">{meta}</p>
        )}

        {loading ? (
          <p className="py-6 text-center text-sm text-ink-subtle">Memuat isi…</p>
        ) : failed ? (
          <p
            role="alert"
            className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            Gagal memuat isi catatan. Buka penuh untuk mencoba lagi.
          </p>
        ) : content?.trim() ? (
          <MarkdownView content={content} />
        ) : (
          <p className="py-6 text-center text-sm text-ink-subtle">
            Catatan ini masih kosong.
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
          <DeleteNoteButton
            note={note}
            className="text-sm text-danger hover:underline disabled:opacity-50"
          >
            Hapus
          </DeleteNoteButton>
          <Link href={`/notes/${note.id}`} className="btn btn-primary">
            Buka penuh
          </Link>
        </div>
      </Modal>
    </li>
  );
}

/**
 * Tombol hapus yang dipakai dua kali: sebagai ikon di kaki kartu, dan
 * sebagai tautan teks di kaki pratinjau. Yang dibagi bukan tampilannya,
 * tapi kalimat konfirmasi & aksinya — supaya keduanya tidak sempat
 * berbeda bunyi.
 */
function DeleteNoteButton({
  note,
  className = "icon-btn icon-btn-danger",
  children,
}: {
  note: NoteCardData;
  className?: string;
  children?: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const title = note.title || "catatan tanpa judul";

  return (
    <ConfirmButton
      disabled={pending}
      className={className}
      label={`Hapus ${title}`}
      title={`Hapus "${title}"?`}
      message="Tidak bisa dibatalkan. Lampirannya tetap ada di Google Drive."
      onConfirm={() =>
        startTransition(() => {
          void deleteNote(note.id);
        })
      }
    >
      {children ?? <IconTrash />}
    </ConfirmButton>
  );
}

function IconPencil() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M11.2 2.3l2.5 2.5-8 8-3.2.7.7-3.2 8-8zM9.9 3.6l2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 4.5h10M6.5 4V2.5h3V4M4.5 4.5l.5 9h6l.5-9"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

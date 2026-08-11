import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader } from "@/components/page-header";
import { MemberAvatar, MemberAvatarStack } from "@/components/member-avatar";
import { formatDate } from "@/lib/format";
import { markdownSnippet } from "@/lib/markdown";
import { NOTE_KIND_LABEL, type NoteKind, type NoteWithRelations } from "@/lib/types";
import { NewNoteButtons, NotesFilter } from "./notes-toolbar";
import { NOTE_SELECT, flattenNote, type NoteRow } from "./query";

export default async function NotesPage({ searchParams }: PageProps<"/notes">) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const kind =
    params.kind === "note" || params.kind === "mom"
      ? (params.kind as NoteKind)
      : null;

  const supabase = await createClient();

  let request = supabase
    .from("notes")
    // Diurutkan menurut kapan terakhir disentuh, bukan kapan dibuat —
    // catatan yang sedang dikerjakan minggu ini selalu di atas, dan itu
    // yang hampir selalu dicari.
    .select(NOTE_SELECT)
    .order("updated_at", { ascending: false });

  if (kind) request = request.eq("kind", kind);

  // Pencarian dijalankan di database, bukan di browser. Menyaring di klien
  // berarti seluruh isi setiap catatan harus ikut dikirim dulu — beberapa
  // ratus KB yang dibayar tiap kali halaman ini dibuka dari HP, hanya
  // supaya sesekali bisa mengetik satu kata di kotak cari.
  if (query) {
    const pattern = `%${query.replace(/[%_]/g, (char) => `\\${char}`)}%`;
    request = request.or(`title.ilike.${pattern},content.ilike.${pattern}`);
  }

  const { data } = await request;
  const notes = ((data ?? []) as unknown as NoteRow[]).map(flattenNote);

  return (
    <>
      <PageHeader
        eyebrow="06 · Catatan"
        title="Catatan & Notulen"
        description="Tempat menulis panjang: notulen rapat, rincian tugas, apa pun yang tidak muat di kartu."
        action={<NewNoteButtons />}
      />

      <NotesFilter kind={kind} query={query} />

      {notes.length === 0 ? (
        <EmptyState
          title={query ? `Tidak ada yang cocok dengan "${query}"` : "Belum ada catatan"}
          description={
            query
              ? "Coba kata lain — pencarian mencakup judul dan isi catatan."
              : "Notulen rapat, hasil diskusi, rincian tugas yang terlalu panjang untuk kartu — semuanya bisa ditulis di sini."
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </ul>
      )}
    </>
  );
}

function NoteCard({ note }: { note: NoteWithRelations }) {
  const snippet = markdownSnippet(note.content);
  const isMom = note.kind === "mom";

  return (
    <li>
      <Link
        href={`/notes/${note.id}`}
        className="card flex h-full flex-col gap-2 p-4 transition-colors hover:border-line-strong hover:bg-surface-muted/50"
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

        {snippet && (
          <p className="line-clamp-3 text-sm text-ink-muted">{snippet}</p>
        )}

        {(note.tasks.length > 0 ||
          note.events.length > 0 ||
          note.client ||
          note.project) && (
          <p className="truncate font-mono text-[11px] text-ink-subtle">
            {[
              note.client?.name,
              note.project?.name,
              // Satu catatan bisa menempel ke beberapa tugas sekaligus;
              // di kartu sesempit ini yang muat cuma yang pertama.
              note.tasks.length > 1
                ? `${note.tasks[0].title} +${note.tasks.length - 1}`
                : note.tasks[0]?.title,
              note.events[0]?.event?.title,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-2.5">
          <span className="truncate text-xs text-ink-subtle">
            Diubah {formatDate(note.updated_at)}
          </span>
          {note.participants.length > 0 ? (
            <MemberAvatarStack members={note.participants} size="xs" />
          ) : (
            <MemberAvatar member={note.editor ?? note.author} size="xs" />
          )}
        </div>
      </Link>
    </li>
  );
}

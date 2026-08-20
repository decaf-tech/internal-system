import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader } from "@/components/page-header";
import { markdownSnippet } from "@/lib/markdown";
import type { NoteKind } from "@/lib/types";
import { NoteCard, type NoteCardData } from "./note-card";
import { NewNoteButtons, NotesFilter } from "./notes-toolbar";
import { NOTE_SELECT, flattenNote, type NoteRow } from "./query";

export default async function NotesPage({ searchParams }: PageProps<"/backoffice/notes">) {
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
  // Isi catatan ditinggal di server: kartunya cuma butuh 160 karakter
  // pertama, sementara `content` sebuah notulen panjang bisa puluhan KB —
  // dan kartunya kini komponen klien, jadi apa pun yang ikut lewat sini
  // benar-benar dikirim ke HP. Yang butuh isi lengkap (pratinjau) memintanya
  // sendiri lewat `noteContent()`, satu catatan saja, saat dibuka.
  const notes: NoteCardData[] = ((data ?? []) as unknown as NoteRow[])
    .map(flattenNote)
    .map(({ content, ...note }) => ({
      ...note,
      snippet: markdownSnippet(content),
    }));

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

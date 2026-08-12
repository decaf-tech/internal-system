"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { MarkdownEditor } from "@/components/markdown-editor";
import { ConfirmButton } from "@/components/modal";
import { MemberAvatar } from "@/components/member-avatar";
import { formatDate } from "@/lib/format";
import { DocumentPanel } from "@/components/document-panel";
import {
  MOM_TEMPLATE,
  NOTE_KIND_LABEL,
  type Document,
  type Member,
  type NoteKind,
  type NoteWithRelations,
} from "@/lib/types";
import { AssigneePicker } from "@/app/(app)/tasks/pickers";
import {
  deleteNote,
  saveNote,
  type EventRefInput,
  type NotePatch,
} from "../actions";

/** Jeda diam sebelum simpanan otomatis dikirim. */
const AUTOSAVE_DELAY_MS = 2000;

type Option = { id: string; name: string };

/** Satu kemunculan rapat yang bisa dipilih, sudah berlabel siap tampil. */
export type MeetingOption = EventRefInput & { label: string };

const refKey = (ref: EventRefInput) => `${ref.eventId}|${ref.occurrenceDate}`;

function snapshot(patch: NotePatch) {
  // Urutan tautan dan peserta tidak berarti apa-apa, jadi diratakan dulu —
  // tanpa ini, melepas lalu memilih ulang hal yang sama membuat catatannya
  // dianggap berubah dan memicu simpanan yang tidak mengubah apa pun.
  return JSON.stringify({
    ...patch,
    participantIds: [...patch.participantIds].sort(),
    taskIds: [...patch.taskIds].sort(),
    eventRefs: patch.eventRefs.map(refKey).sort(),
  });
}

/**
 * Halaman menulis satu catatan / notulen.
 *
 * Halaman penuh, bukan modal seperti form lain di sistem ini. Menulis
 * notulen rapat satu jam adalah pekerjaan sepuluh menit dengan banyak
 * menengok ke atas — dan jendela setinggi 70vh dengan tombol "Batal" di
 * kakinya mengirim pesan yang salah tentang berapa lama orang boleh
 * berada di situ.
 *
 * Konsekuensinya: tidak ada tombol "Batal" yang membatalkan. Yang ada
 * simpanan otomatis, seperti aplikasi catatan mana pun.
 */
export function NoteEditor({
  note,
  members,
  tasks,
  meetings,
  clients,
  projects,
  documents,
}: {
  note: NoteWithRelations;
  members: Member[];
  tasks: { id: string; title: string }[];
  meetings: MeetingOption[];
  clients: Option[];
  projects: { id: string; name: string; client_id: string }[];
  documents: Document[];
}) {
  const initial: NotePatch = {
    title: note.title,
    content: note.content,
    kind: note.kind,
    meetingDate: note.meeting_date,
    taskIds: note.task_ids,
    eventRefs: note.events.map((ref) => ({
      eventId: ref.event_id,
      occurrenceDate: ref.occurrence_date,
    })),
    clientId: note.client_id,
    projectId: note.project_id,
    participantIds: note.participant_ids,
  };

  const [form, setForm] = useState<NotePatch>(initial);

  // Cap isi terakhir yang sudah pasti mendarat di database. Disimpan
  // sebagai state, bukan ref, karena tampilan ikut bergantung padanya —
  // baris "Tersimpan / Belum tersimpan" dan tombol Simpan dibaca dari
  // perbandingannya dengan isi sekarang.
  const [savedSnapshot, setSavedSnapshot] = useState(() => snapshot(initial));
  const saving = useRef(false);

  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLinks, setShowLinks] = useState(
    note.task_ids.length > 0 ||
      note.events.length > 0 ||
      Boolean(note.client_id || note.project_id),
  );
  const [, startTransition] = useTransition();

  const dirty = snapshot(form) !== savedSnapshot;

  function patch(changes: Partial<NotePatch>) {
    setForm((current) => ({ ...current, ...changes }));
  }

  const save = useCallback(
    async (options: { log?: boolean } = {}) => {
      // Satu simpanan berjalan pada satu waktu. Simpanan otomatis dan
      // ⌘S bisa berbarengan, dan dua penulisan ke baris yang sama tanpa
      // urutan pasti berarti yang menang bisa jadi yang lebih tua.
      if (saving.current) return;

      const pendingSnapshot = snapshot(form);
      if (pendingSnapshot === savedSnapshot && !options.log) return;

      saving.current = true;
      setError(null);

      const result = await saveNote(note.id, form, options);

      saving.current = false;
      if (result.error) {
        setError(result.error);
        return;
      }

      // Yang ditandai tersimpan adalah isi PADA SAAT dikirim, bukan isi
      // sekarang — kalau user mengetik lagi selama permintaan berjalan,
      // perubahan itu harus tetap terhitung belum tersimpan.
      setSavedSnapshot(pendingSnapshot);
      setSavedAt(new Date());
    },
    [form, note.id, savedSnapshot],
  );

  // Simpanan otomatis setelah diam sejenak.
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => void save(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [dirty, save]);

  // ⌘S / Ctrl+S menyimpan sekarang juga, dan yang ini ikut tercatat di log
  // aktivitas — perbedaan antara "sistem menyimpan" dan "saya menyimpan".
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s")
        return;
      event.preventDefault();
      void save({ log: true });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [save]);

  // Jaring pengaman terakhir: menutup tab di tengah kalimat, sebelum
  // jeda simpanan otomatis lewat.
  useEffect(() => {
    if (!dirty) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const isMom = form.kind === "mom";

  // Tugas yang sudah selesai dan rapat yang sudah lewat tidak ikut di
  // daftar pilihan (lihat page.tsx), jadi tautan yang sudah ada
  // disisipkan kembali — kalau tidak, chip-nya tampil tanpa nama dan
  // melepasnya jadi satu-satunya hal yang bisa dilakukan.
  const taskChoices = [...tasks];
  for (const linked of note.tasks) {
    if (!taskChoices.some((task) => task.id === linked.id)) {
      taskChoices.unshift(linked);
    }
  }

  const meetingChoices = [...meetings];
  for (const linked of note.events) {
    const ref = {
      eventId: linked.event_id,
      occurrenceDate: linked.occurrence_date,
    };
    if (meetingChoices.some((option) => refKey(option) === refKey(ref))) continue;
    meetingChoices.unshift({
      ...ref,
      label: `${linked.event?.title ?? "Rapat"} — ${formatDate(
        linked.occurrence_date,
      )}`,
    });
  }

  const projectChoices = form.clientId
    ? projects.filter((project) => project.client_id === form.clientId)
    : [];

  return (
    // Melebar di layar besar supaya editor & pratinjaunya muat bersisian
    // (ambangnya ada di markdown-editor.tsx). Di bawah itu tetap 3xl —
    // lebar baca yang nyaman untuk catatan yang cuma dibaca.
    <div className="mx-auto max-w-3xl xl:max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/notes"
          className="font-mono text-xs text-ink-subtle hover:text-ink"
        >
          ← Semua catatan
        </Link>

        <div className="flex items-center gap-3">
          <SaveStatus dirty={dirty} savedAt={savedAt} error={error} />
          <button
            type="button"
            className="btn btn-primary"
            disabled={!dirty}
            onClick={() => startTransition(() => void save({ log: true }))}
          >
            Simpan
          </button>
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(["mom", "note"] as NoteKind[]).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() =>
                patch({
                  kind,
                  // Berpindah ke notulen pada catatan yang masih kosong
                  // mengisikan kerangkanya. Kalau sudah ada tulisan,
                  // jangan disentuh — kerangka yang menimpa tulisan orang
                  // adalah kerusakan, bukan bantuan.
                  content:
                    kind === "mom" && form.content.trim().length === 0
                      ? MOM_TEMPLATE
                      : form.content,
                  meetingDate:
                    kind === "mom" && !form.meetingDate
                      ? new Date().toISOString().slice(0, 10)
                      : form.meetingDate,
                })
              }
              aria-pressed={form.kind === kind}
              className={`badge border px-2.5 py-1 transition-colors ${
                form.kind === kind
                  ? "border-transparent bg-forest-soft text-forest"
                  : "border-line-strong text-ink-subtle hover:text-ink"
              }`}
            >
              {NOTE_KIND_LABEL[kind]}
            </button>
          ))}

          {note.events[0]?.event && (
            <span className="font-mono text-[11px] text-ink-subtle">
              dari rapat “{note.events[0].event.title}”
            </span>
          )}
        </div>

        <input
          value={form.title}
          onChange={(event) => patch({ title: event.target.value })}
          placeholder={isMom ? "Notulen rapat apa?" : "Judul catatan"}
          autoFocus={note.title.length === 0}
          className="w-full border-0 bg-transparent p-0 font-serif text-2xl leading-tight text-ink outline-none placeholder:text-ink-subtle"
        />

        {isMom && (
          <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="meeting_date">
                Tanggal rapat
              </label>
              <input
                id="meeting_date"
                type="date"
                value={form.meetingDate ?? ""}
                onChange={(event) =>
                  patch({ meetingDate: event.target.value || null })
                }
                className="field"
              />
            </div>
            <div>
              <span className="label">Yang hadir</span>
              <AssigneePicker
                members={members}
                value={form.participantIds}
                onChange={(ids) => patch({ participantIds: ids })}
                size="sm"
                actionLabel="Tandai hadir:"
                emptyLabel="Belum diisi"
              />
            </div>
          </div>
        )}

        <div className="mt-4 border-t border-line pt-4">
          <MarkdownEditor
            value={form.content}
            onChange={(content) => patch({ content })}
            placeholder={
              isMom
                ? "Apa yang dibahas, apa yang diputuskan, siapa mengerjakan apa…"
                : "Tulis apa saja. Ketik “- ” untuk daftar, “## ” untuk judul bagian."
            }
            minHeight="26rem"
          />
        </div>

        <DocumentPanel
          documents={documents}
          link={{
            noteId: note.id,
            clientId: form.clientId,
            projectId: form.projectId,
          }}
          title="Lampiran"
          variant="inline"
          emptyLabel="Belum ada lampiran. Materi rapat, deck, atau berkas rujukan bisa ditempel di sini."
        />

        <div className="mt-4 border-t border-line pt-3">
          <button
            type="button"
            onClick={() => setShowLinks((current) => !current)}
            aria-expanded={showLinks}
            className="flex w-full items-center justify-between text-sm text-ink-muted hover:text-ink"
          >
            <span>Tautkan ke tugas / rapat / klien</span>
            <span className="font-mono text-xs">{showLinks ? "−" : "+"}</span>
          </button>

          {showLinks && (
            <div className="mt-3 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <LinkChips
                  label="Tugas"
                  addLabel="+ Kaitkan tugas…"
                  emptyLabel="Belum dikaitkan ke tugas mana pun."
                  options={taskChoices.map((task) => ({
                    key: task.id,
                    label: task.title,
                  }))}
                  selected={form.taskIds}
                  onAdd={(key) => patch({ taskIds: [...form.taskIds, key] })}
                  onRemove={(key) =>
                    patch({
                      taskIds: form.taskIds.filter((id) => id !== key),
                    })
                  }
                />

                <LinkChips
                  label="Rapat"
                  addLabel="+ Kaitkan rapat…"
                  emptyLabel="Belum dikaitkan ke rapat mana pun."
                  options={meetingChoices.map((option) => ({
                    key: refKey(option),
                    label: option.label,
                  }))}
                  selected={form.eventRefs.map(refKey)}
                  onAdd={(key) => {
                    const picked = meetingChoices.find(
                      (option) => refKey(option) === key,
                    );
                    if (!picked) return;
                    patch({
                      eventRefs: [
                        ...form.eventRefs,
                        {
                          eventId: picked.eventId,
                          occurrenceDate: picked.occurrenceDate,
                        },
                      ],
                    });
                  }}
                  onRemove={(key) =>
                    patch({
                      eventRefs: form.eventRefs.filter(
                        (ref) => refKey(ref) !== key,
                      ),
                    })
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="client_id">
                    Klien
                  </label>
                  <select
                    id="client_id"
                    value={form.clientId ?? ""}
                    onChange={(event) =>
                      patch({
                        clientId: event.target.value || null,
                        // Project selalu milik satu klien; membiarkan
                        // pilihan lama berarti catatan bisa tertaut ke
                        // project milik klien yang berbeda.
                        projectId: null,
                      })
                    }
                    className="field"
                  >
                    <option value="">— Internal —</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label" htmlFor="project_id">
                    Project
                  </label>
                  <select
                    id="project_id"
                    value={form.projectId ?? ""}
                    onChange={(event) =>
                      patch({ projectId: event.target.value || null })
                    }
                    className="field"
                    disabled={projectChoices.length === 0}
                  >
                    <option value="">
                      {form.clientId
                        ? "— Tanpa project —"
                        : "— Pilih klien dulu —"}
                    </option>
                    {projectChoices.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="flex items-center gap-1.5 text-xs text-ink-subtle">
          <MemberAvatar member={note.editor ?? note.author} size="xs" />
          <span>
            {note.editor?.full_name ?? note.author?.full_name ?? "Seseorang"} ·
            terakhir diubah {formatDate(note.updated_at)}
          </span>
        </p>

        <DeleteNoteButton noteId={note.id} title={form.title} />
      </div>
    </div>
  );
}

/**
 * Daftar tautan yang bisa lebih dari satu: yang sudah dipilih jadi chip
 * yang bisa dilepas, sisanya tinggal di dropdown "tambah".
 *
 * Bukan daftar centang seperti pemilih orang di sebelahnya — tugas bisa
 * berjumlah ratusan, dan menampilkan semuanya sekaligus berarti bagian
 * tautan ini lebih tinggi daripada editornya sendiri. Dropdown yang
 * menyusut tiap kali sesuatu dipilih menjaga daftarnya tetap sependek
 * yang tersisa.
 */
function LinkChips({
  label,
  addLabel,
  emptyLabel,
  options,
  selected,
  onAdd,
  onRemove,
}: {
  label: string;
  addLabel: string;
  emptyLabel: string;
  options: { key: string; label: string }[];
  selected: string[];
  onAdd: (key: string) => void;
  onRemove: (key: string) => void;
}) {
  const byKey = new Map(options.map((option) => [option.key, option.label]));
  const remaining = options.filter((option) => !selected.includes(option.key));

  return (
    <div>
      <span className="label">{label}</span>

      {selected.length === 0 ? (
        <p className="mb-2 text-xs text-ink-subtle">{emptyLabel}</p>
      ) : (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((key) => (
            <li key={key}>
              <span className="badge inline-flex max-w-full items-center gap-1 bg-surface-sunken text-ink-muted">
                <span className="truncate">{byKey.get(key) ?? "…"}</span>
                <button
                  type="button"
                  aria-label={`Lepas ${byKey.get(key) ?? label}`}
                  onClick={() => onRemove(key)}
                  className="shrink-0 rounded text-ink-subtle hover:text-danger"
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.5 2.5l7 7M9.5 2.5l-7 7"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <select
        // Selalu kembali ke pilihan kosong: kotak ini adalah tombol
        // "tambah", bukan tampilan nilai sekarang — nilainya ada di chip.
        value=""
        onChange={(event) => {
          if (event.target.value) onAdd(event.target.value);
        }}
        disabled={remaining.length === 0}
        className="field"
      >
        <option value="">
          {remaining.length === 0 ? "— Semua sudah dipilih —" : addLabel}
        </option>
        {remaining.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Satu baris yang menjawab satu pertanyaan: apakah tulisan saya aman.
 * Ketiga keadaannya sengaja berbeda warna, bukan hanya berbeda kata —
 * ini dilirik, bukan dibaca.
 */
function SaveStatus({
  dirty,
  savedAt,
  error,
}: {
  dirty: boolean;
  savedAt: Date | null;
  error: string | null;
}) {
  if (error) {
    return <span className="font-mono text-xs text-danger">{error}</span>;
  }
  if (dirty) {
    return (
      <span className="font-mono text-xs text-ink-subtle">
        Belum tersimpan…
      </span>
    );
  }
  return (
    <span className="font-mono text-xs text-forest">
      {savedAt
        ? `Tersimpan ${savedAt.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })}`
        : "Tersimpan"}
    </span>
  );
}

function DeleteNoteButton({
  noteId,
  title,
}: {
  noteId: string;
  title: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <ConfirmButton
      disabled={pending}
      className="text-sm text-danger hover:underline disabled:opacity-50"
      title={`Hapus "${title || "catatan ini"}"?`}
      message="Tidak bisa dibatalkan. Lampirannya tetap ada di Google Drive."
      onConfirm={() =>
        startTransition(() => {
          void deleteNote(noteId);
        })
      }
    >
      {pending ? "Menghapus…" : "Hapus catatan ini"}
    </ConfirmButton>
  );
}

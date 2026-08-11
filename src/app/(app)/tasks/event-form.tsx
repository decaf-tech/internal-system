"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { todayKey, parseKey } from "@/lib/date-range";
import { formatDate } from "@/lib/format";
import { NOTE_KIND_LABEL, type Document, type NoteSummary } from "@/lib/types";
import { NotePicker } from "@/components/note-picker";
import { DocumentPanel } from "@/components/document-panel";
import { documentsForEvent } from "@/lib/actions/documents";
import {
  CARD_COLOR_ORDER,
  CARD_COLORS,
  type CardColor,
  type EventOccurrence,
  type EventRecurrence,
  type Member,
} from "@/lib/types";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { AssigneePicker as AttendeePicker } from "./pickers";
import {
  linkNote,
  notesForOccurrence,
  openMeetingNote,
  unlinkNote,
} from "@/app/(app)/notes/actions";
import {
  cancelEventOccurrence,
  createEvent,
  deleteEventSeries,
  updateEventOccurrence,
  updateEventSeries,
} from "./event-actions";

/**
 * Catatan yang sudah menempel pada pertemuan ini, plus cara mengaitkan
 * catatan yang sudah ditulis di tempat lain.
 *
 * Tombol "Notulen rapat ini" di atas menjawab satu pertanyaan: notulen
 * resmi pertemuan ini yang mana. Yang di sini menjawab pertanyaan lain —
 * "bahan rapat ini sudah saya tulis kemarin, kaitkan ke sini" — dan sejak
 * migration 007 satu catatan boleh menempel di beberapa rapat sekaligus.
 *
 * Dimuat saat form dibuka, bukan ikut dikirim bersama seluruh kalender:
 * satu bulan bisa berisi ratusan kemunculan rapat.
 */
function MeetingNotes({
  eventId,
  occurrenceDate,
}: {
  eventId: string;
  occurrenceDate: string;
}) {
  const [notes, setNotes] = useState<NoteSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let stale = false;
    void notesForOccurrence(eventId, occurrenceDate).then((found) => {
      if (!stale) setNotes(found);
    });
    return () => {
      stale = true;
    };
  }, [eventId, occurrenceDate]);

  return (
    <section className="rounded-md border border-line px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="label mb-0">Catatan terkait</span>
        <NotePicker
          excludeIds={(notes ?? []).map((note) => note.id)}
          disabled={pending || notes === null}
          onPick={(note) => {
            setNotes((current) => [...(current ?? []), note]);
            setError(null);
            startTransition(async () => {
              const result = await linkNote({
                noteId: note.id,
                event: { eventId, occurrenceDate },
              });
              if (result.error) {
                setNotes((current) =>
                  (current ?? []).filter((entry) => entry.id !== note.id),
                );
                setError(result.error);
              }
            });
          }}
        />
      </div>

      {error && (
        <p className="mt-2 rounded-md bg-danger-soft px-2 py-1.5 text-xs text-danger">
          {error}
        </p>
      )}

      {notes === null ? (
        <p className="mt-1.5 text-xs text-ink-subtle">Memuat…</p>
      ) : notes.length === 0 ? (
        <p className="mt-1.5 text-xs text-ink-subtle">
          Belum ada catatan untuk pertemuan ini.
        </p>
      ) : (
        <ul className="mt-1.5 space-y-0.5">
          {notes.map((note) => (
            <li key={note.id} className="group flex items-center gap-1">
              <Link
                href={`/notes/${note.id}`}
                className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded px-1.5 py-1 text-sm hover:bg-surface-muted"
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
                  setNotes((current) =>
                    (current ?? []).filter((entry) => entry.id !== note.id),
                  );
                  startTransition(async () => {
                    await unlinkNote({
                      noteId: note.id,
                      event: { eventId, occurrenceDate },
                    });
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

/**
 * Lampiran seri rapat: agenda, deck, berkas rujukan.
 *
 * Sama seperti catatan di atasnya, dimuat saat form dibuka. Bedanya
 * daftarnya diambil sendiri lewat server action, bukan dirender server —
 * jadi `router.refresh()` di dalam DocumentPanel tidak cukup, dan
 * `onChanged` yang memuat ulang daftarnya.
 */
function MeetingDocuments({ eventId }: { eventId: string }) {
  const [documents, setDocuments] = useState<Document[] | null>(null);

  const reload = useCallback(() => {
    void documentsForEvent(eventId).then((found) =>
      setDocuments(found as Document[]),
    );
  }, [eventId]);

  useEffect(reload, [reload]);

  if (documents === null) {
    return (
      <p className="rounded-md border border-line px-3 py-2.5 text-xs text-ink-subtle">
        Memuat lampiran…
      </p>
    );
  }

  return (
    <div className="rounded-md border border-line px-3 pb-2.5">
      <DocumentPanel
        documents={documents}
        link={{ eventId }}
        title="Lampiran rapat"
        variant="inline"
        emptyLabel="Belum ada lampiran. Agenda atau deck bisa ditempel di sini."
        onChanged={reload}
      />
    </div>
  );
}

const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: "Sen" },
  { value: 2, label: "Sel" },
  { value: 3, label: "Rab" },
  { value: 4, label: "Kam" },
  { value: 5, label: "Jum" },
  { value: 6, label: "Sab" },
  { value: 7, label: "Min" },
];

/** Semua field & aksi yang dipakai form, tak peduli dibuat langsung dari
 *  angka mentah (form field) demi kesederhanaan implementasi (bukan FormData
 *  seperti form lain di app ini — form ini punya dua target aksi berbeda
 *  tergantung cakupan yang dipilih, jadi statenya dipegang manual). */
export function EventForm({
  occurrence,
  defaultDate,
  members,
  onDone,
}: {
  /** Diisi kalau sedang mengedit rapat yang sudah ada. */
  occurrence?: EventOccurrence;
  /** Diisi saat membuat rapat baru. */
  defaultDate?: string;
  members: Member[];
  onDone: () => void;
}) {
  const series = occurrence?.series;
  const isRecurring = series ? series.recurrence !== "none" : false;

  // Rapat berulang yang dibuka dari satu tanggal tertentu defaultnya
  // dianggap "cuma rapat ini" — mengubah seluruh seri adalah tindakan yang
  // lebih besar dan sengaja perlu diklik pindah dulu, bukan default.
  const [scope, setScope] = useState<"occurrence" | "series">("occurrence");
  const effectiveScope = isRecurring ? scope : "series";

  const [title, setTitle] = useState(occurrence?.title ?? "");
  const [description, setDescription] = useState(series?.description ?? "");
  const [location, setLocation] = useState(series?.location ?? "");
  const [eventDate, setEventDate] = useState(
    series?.event_date ?? defaultDate ?? todayKey(),
  );
  const [isAllDay, setIsAllDay] = useState(series?.is_all_day ?? false);
  const [startTime, setStartTime] = useState(
    (occurrence?.start_time ?? series?.start_time ?? "").slice(0, 5),
  );
  const [endTime, setEndTime] = useState(
    (occurrence?.end_time ?? series?.end_time ?? "").slice(0, 5),
  );
  const [recurrence, setRecurrence] = useState<EventRecurrence>(
    series?.recurrence ?? "none",
  );
  const [weekdays, setWeekdays] = useState<number[]>(
    series?.recurrence_weekdays ?? [],
  );
  const [until, setUntil] = useState(series?.recurrence_until ?? "");
  const [attendeeIds, setAttendeeIds] = useState<string[]>(
    series?.attendee_ids ?? [],
  );
  const [color, setColor] = useState<CardColor>(series?.color ?? "blue");

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleWeekday(day: number) {
    setWeekdays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort(),
    );
  }

  function buildSeriesFormData() {
    const data = new FormData();
    data.set("title", title);
    data.set("description", description);
    data.set("location", location);
    data.set("event_date", eventDate);
    if (isAllDay) data.set("is_all_day", "on");
    data.set("start_time", startTime);
    data.set("end_time", endTime);
    data.set("recurrence", recurrence);
    data.set("recurrence_weekdays", weekdays.join(","));
    data.set("recurrence_until", until);
    data.set("attendee_ids", attendeeIds.join(","));
    data.set("color", color);
    return data;
  }

  function buildOccurrenceFormData() {
    const data = new FormData();
    data.set("title", title);
    if (isAllDay) data.set("is_all_day", "on");
    data.set("start_time", startTime);
    data.set("end_time", endTime);
    return data;
  }

  function save() {
    if (!title.trim()) {
      setError("Judul rapat wajib diisi.");
      return;
    }

    startTransition(async () => {
      const result =
        effectiveScope === "series"
          ? series
            ? await updateEventSeries(series.id, { error: null }, buildSeriesFormData())
            : await createEvent({ error: null }, buildSeriesFormData())
          : await updateEventOccurrence(
              series!.id,
              occurrence!.occurrenceDate,
              { error: null },
              buildOccurrenceFormData(),
            );

      if (result.error) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  function remove() {
    if (!series) return;
    const label =
      effectiveScope === "series"
        ? `Hapus seluruh seri rapat "${series.title}"? Semua kemunculannya ikut hilang.`
        : `Batalkan rapat "${occurrence?.title}" tanggal ${format(
            parseKey(occurrence!.occurrenceDate),
            "d MMMM",
            { locale: localeId },
          )} saja?`;
    if (!confirm(label)) return;

    startTransition(async () => {
      if (effectiveScope === "series") {
        await deleteEventSeries(series.id);
      } else {
        await cancelEventOccurrence(series.id, occurrence!.occurrenceDate);
      }
      onDone();
    });
  }

  /**
   * Buka notulen pertemuan ini — dibuat dulu kalau belum ada.
   *
   * Menempel ke KEMUNCULAN, bukan ke seri: "Daily Standup" punya satu
   * notulen per hari, bukan satu notulen untuk selamanya.
   */
  function openNotes() {
    if (!series || !occurrence) return;
    startTransition(() => {
      void openMeetingNote({
        eventId: series.id,
        occurrenceDate: occurrence.occurrenceDate,
        title: `Notulen — ${occurrence.title} (${format(
          parseKey(occurrence.occurrenceDate),
          "d MMM yyyy",
          { locale: localeId },
        )})`,
        // Yang diundang jadi daftar hadir awal; siapa yang ternyata tidak
        // datang tinggal dilepas di halaman notulennya.
        attendeeIds: series.attendee_ids,
      });
    });
  }

  return (
    <div className="space-y-4">
      {occurrence && (
        <button
          type="button"
          disabled={pending}
          onClick={openNotes}
          className="flex w-full items-center justify-between gap-2 rounded-md border border-line-strong bg-surface-muted px-3 py-2.5 text-left text-sm transition-colors hover:border-accent hover:bg-accent-soft disabled:opacity-50"
        >
          <span>
            <span className="font-medium">Notulen rapat ini</span>
            <span className="block text-xs text-ink-muted">
              {format(parseKey(occurrence.occurrenceDate), "d MMMM yyyy", {
                locale: localeId,
              })}{" "}
              · dibuat otomatis kalau belum ada
            </span>
          </span>
          <span className="font-mono text-xs text-ink-subtle">→</span>
        </button>
      )}

      {occurrence && series && (
        <MeetingNotes
          eventId={series.id}
          occurrenceDate={occurrence.occurrenceDate}
        />
      )}

      {series && <MeetingDocuments eventId={series.id} />}

      {isRecurring && (
        <div className="inline-flex rounded-md border border-line bg-surface-muted p-0.5 text-xs">
          <ScopeTab
            active={scope === "occurrence"}
            onClick={() => {
              // Judul & jam kembali ke nilai kemunculan yang sedang dibuka
              // (bisa berbeda dari seri kalau sebelumnya pernah punya
              // pengecualian sendiri) — bukan nilai seri yang mungkin
              // sempat diketik saat tab "Seluruh seri" terbuka.
              setScope("occurrence");
              setTitle(occurrence?.title ?? "");
              setStartTime((occurrence?.start_time ?? "").slice(0, 5));
              setEndTime((occurrence?.end_time ?? "").slice(0, 5));
            }}
          >
            Rapat ini saja
          </ScopeTab>
          <ScopeTab
            active={scope === "series"}
            onClick={() => {
              setScope("series");
              setTitle(series?.title ?? "");
              setStartTime((series?.start_time ?? "").slice(0, 5));
              setEndTime((series?.end_time ?? "").slice(0, 5));
            }}
          >
            Seluruh seri
          </ScopeTab>
        </div>
      )}

      {isRecurring && effectiveScope === "occurrence" && occurrence && (
        <p className="text-xs text-ink-subtle">
          Mengubah kemunculan tanggal{" "}
          <span className="font-medium text-ink">
            {format(parseKey(occurrence.occurrenceDate), "d MMMM yyyy", {
              locale: localeId,
            })}
          </span>{" "}
          saja. Deskripsi, lokasi, peserta, dan pola pengulangan cuma bisa
          diubah lewat &ldquo;Seluruh seri&rdquo;.
        </p>
      )}

      <div>
        <label className="label" htmlFor="event-title">
          Judul <span className="text-accent">*</span>
        </label>
        <input
          id="event-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          autoFocus
          className="field"
          placeholder="Daily Standup"
        />
      </div>

      {effectiveScope === "series" && (
        <div>
          <label className="label" htmlFor="event-date">
            Tanggal {isRecurring ? "mulai" : ""}
          </label>
          <input
            id="event-date"
            type="date"
            value={eventDate}
            onChange={(event) => setEventDate(event.target.value)}
            className="field"
          />
        </div>
      )}

      <div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isAllDay}
            onChange={(event) => setIsAllDay(event.target.checked)}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
          Sepanjang hari
        </label>
      </div>

      {!isAllDay && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="event-start">
              Mulai
            </label>
            <input
              id="event-start"
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className="field"
            />
          </div>
          <div>
            <label className="label" htmlFor="event-end">
              Selesai
            </label>
            <input
              id="event-end"
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              className="field"
            />
          </div>
        </div>
      )}

      {effectiveScope === "series" && (
        <>
          <div>
            <label className="label" htmlFor="event-location">
              Lokasi / tautan
            </label>
            <input
              id="event-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="field"
              placeholder="Kantor, atau tautan Meet/Zoom"
            />
          </div>

          <div>
            <label className="label" htmlFor="event-description">
              Catatan
            </label>
            <textarea
              id="event-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              className="field resize-y"
            />
          </div>

          <div>
            <span className="label">Ulangi</span>
            <div className="flex gap-1.5">
              {(
                [
                  ["none", "Sekali saja"],
                  ["daily", "Tiap hari"],
                  ["weekly", "Tiap minggu"],
                ] as [EventRecurrence, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRecurrence(value)}
                  aria-pressed={recurrence === value}
                  className={`rounded border px-2.5 py-1 text-xs ${
                    recurrence === value
                      ? "border-ink bg-ink text-ink-inverse"
                      : "border-line-strong text-ink-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {recurrence === "weekly" && (
            <div>
              <span className="label">Hari</span>
              <div className="flex gap-1">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleWeekday(day.value)}
                    aria-pressed={weekdays.includes(day.value)}
                    className={`h-8 w-9 rounded border text-xs ${
                      weekdays.includes(day.value)
                        ? "border-ink bg-ink text-ink-inverse"
                        : "border-line-strong text-ink-muted hover:text-ink"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-ink-subtle">
                Kosong berarti mengikuti hari dari tanggal mulai.
              </p>
            </div>
          )}

          {recurrence !== "none" && (
            <div>
              <label className="label" htmlFor="event-until">
                Sampai tanggal (opsional)
              </label>
              <input
                id="event-until"
                type="date"
                value={until}
                onChange={(event) => setUntil(event.target.value)}
                className="field"
              />
              <p className="mt-1 text-xs text-ink-subtle">
                Kosong berarti tanpa batas akhir.
              </p>
            </div>
          )}

          <div>
            <span className="label">Peserta</span>
            <AttendeePicker
              members={members}
              value={attendeeIds}
              onChange={setAttendeeIds}
              size="sm"
            />
          </div>

          <div>
            <span className="label">Warna</span>
            <div className="flex gap-1">
              {CARD_COLOR_ORDER.map((option) => {
                const palette = CARD_COLORS[option];
                return (
                  <button
                    key={option}
                    type="button"
                    title={palette.label}
                    aria-pressed={color === option}
                    onClick={() => setColor(option)}
                    style={{
                      backgroundColor: palette.bg,
                      borderColor:
                        color === option ? "var(--color-ink)" : palette.border,
                    }}
                    className={`h-5 w-5 rounded-full border transition-transform ${
                      color === option ? "scale-110" : "hover:scale-110"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}

      {error && (
        <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        {series ? (
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className="text-sm text-danger hover:underline disabled:opacity-50"
          >
            {effectiveScope === "series" ? "Hapus seluruh seri" : "Batalkan rapat ini"}
          </button>
        ) : (
          <span />
        )}

        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost" onClick={onDone}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={pending}
            onClick={save}
          >
            {pending
              ? "Menyimpan…"
              : effectiveScope === "series" && recurrence !== "none"
                ? "Simpan seluruh seri"
                : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScopeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2.5 py-1 transition-colors ${
        active ? "bg-ink font-medium text-ink-inverse" : "text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

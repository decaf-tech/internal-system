"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/modal";
import type {
  BoardColumn,
  EventOccurrence,
  EventSeriesWithRelations,
  TaskStatus,
  TaskWithRelations,
} from "@/lib/types";
import { createTask, deleteTask, updateTask } from "./actions";
import { EMPTY_FILTER, FilterBar, applyFilter, type TaskFilter } from "./filter-bar";
import { EventForm } from "./event-form";
import { TaskBoard } from "./task-board";
import { TaskCalendar } from "./task-calendar";
import { TaskForm, type TaskFormOptions } from "./task-form";
import { DocumentPanel } from "@/components/document-panel";
import { TaskNotes } from "./task-notes";

type View = "board" | "calendar";

/** Tugas yang sedang dibuat lewat modal, beserta isian awalnya. */
type Draft = {
  status: TaskStatus;
  startDate?: string | null;
  dueDate?: string | null;
};

export function TaskWorkspace({
  tasks,
  columns,
  events,
  options,
}: {
  tasks: TaskWithRelations[];
  columns: BoardColumn[];
  events: EventSeriesWithRelations[];
  options: TaskFormOptions;
}) {
  const [view, setView] = useState<View>("board");
  const [filter, setFilter] = useState<TaskFilter>(EMPTY_FILTER);
  const [creating, setCreating] = useState<Draft | null>(null);
  // Yang disimpan ID-nya saja, bukan salinan tugasnya. Menyimpan objeknya
  // berarti modal memegang potret dari saat ia dibuka: mengunggah lampiran
  // memang menyegarkan data server lewat `router.refresh()`, tapi potret itu
  // tidak ikut berubah, jadi file yang baru naik tidak muncul sampai modal
  // ditutup dan dibuka lagi.
  const [editingId, setEditingId] = useState<string | null>(null);
  // `true` (tanpa detail) berarti "buat rapat baru"; objek berarti sedang
  // membuka kemunculan rapat tertentu untuk diedit.
  const [eventModal, setEventModal] = useState<EventOccurrence | true | null>(
    null,
  );

  const closeCreate = useCallback(() => setCreating(null), []);
  const closeEdit = useCallback(() => setEditingId(null), []);
  const openTask = useCallback(
    (task: TaskWithRelations) => setEditingId(task.id),
    [],
  );

  // Tugas yang hilang dari daftar (dihapus) membuat ini null, dan modalnya
  // menutup sendiri — perilaku yang memang diinginkan.
  const editing = useMemo(
    () => tasks.find((task) => task.id === editingId) ?? null,
    [tasks, editingId],
  );
  const closeEventModal = useCallback(() => setEventModal(null), []);

  // Filter berlaku untuk kedua tampilan. Menyaring papan lalu menemukan
  // kalender masih menampilkan semuanya akan terasa seperti filternya
  // rusak — yang disaring adalah "tugas yang sedang saya urus", bukan
  // "kartu di papan".
  const visible = useMemo(() => applyFilter(tasks, filter), [tasks, filter]);

  // Tanggal yang diklik/diseret di kalender langsung jadi isian awal tugas
  // baru — kalendernya jadi tempat mencatat, bukan cuma tempat melihat.
  const createFromCalendar = useCallback(
    (range: { start: string | null; due: string }) =>
      setCreating({ status: "todo", startDate: range.start, dueDate: range.due }),
    [],
  );

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border border-line bg-surface p-0.5">
          <ViewTab active={view === "board"} onClick={() => setView("board")}>
            Papan
          </ViewTab>
          <ViewTab
            active={view === "calendar"}
            onClick={() => setView("calendar")}
          >
            Kalender
          </ViewTab>
        </div>

        {visible.length !== tasks.length && (
          <p className="font-mono text-xs text-ink-subtle">
            {visible.length} dari {tasks.length} tugas
          </p>
        )}
      </div>

      <FilterBar
        members={options.members}
        labels={options.labels}
        value={filter}
        onChange={setFilter}
      />

      {/* Papan dan kalender sama-sama tetap tampil meski belum ada tugas.
          Kisi kalender yang kosong tapi bisa diklik jauh lebih mengundang
          daripada layar kosong dengan satu tombol — dan tanpa kisinya,
          tidak ada tempat untuk mencatat tugas pertama. */}
      {view === "board" ? (
        <TaskBoard
          tasks={visible}
          columns={columns}
          members={options.members}
          labels={options.labels}
          onOpenTask={openTask}
        />
      ) : (
        <TaskCalendar
          tasks={visible}
          eventSeries={events}
          onOpenTask={openTask}
          onOpenEvent={setEventModal}
          onCreateEvent={() => setEventModal(true)}
          onCreate={createFromCalendar}
        />
      )}

      <Modal open={creating !== null} onClose={closeCreate} title="Tugas Baru">
        {/* `key` memaksa form dibuat ulang setiap kali dibuka dari kolom
            atau tanggal yang berbeda. Tanpa ini, defaultValue tidak ikut
            berubah (React mengabaikan defaultValue pada input yang sudah
            ter-mount), dan isian lama dari pembukaan sebelumnya tertinggal. */}
        {creating !== null && (
          <TaskForm
            key={`${creating.status}-${creating.startDate ?? ""}-${creating.dueDate ?? ""}`}
            action={createTask}
            options={options}
            defaultStatus={creating.status}
            defaultStartDate={creating.startDate}
            defaultDueDate={creating.dueDate}
            onDone={closeCreate}
          />
        )}
      </Modal>

      <Modal open={editing !== null} onClose={closeEdit} title="Edit Tugas">
        {editing && (
          <>
            <TaskForm
              key={editing.id}
              action={updateTask.bind(null, editing.id)}
              initial={editing}
              initialLabelIds={editing.label_ids}
              initialAssigneeIds={editing.assignee_ids}
              options={options}
              onDone={closeEdit}
            />
            <TaskNotes
              taskId={editing.id}
              taskTitle={editing.title}
              notes={editing.notes}
            />
            <DocumentPanel
              documents={editing.documents}
              link={{
                taskId: editing.id,
                // Ikut dicatat supaya lampirannya mendarat di folder klien
                // yang sama dengan dokumen lain milik klien itu, bukan di
                // tumpukan "Umum".
                clientId: editing.client_id,
                projectId: editing.project_id,
              }}
              title="Lampiran"
              variant="inline"
              emptyLabel="Belum ada lampiran untuk tugas ini."
            />
            <div className="mt-4 border-t border-line pt-3">
              <DeleteTaskButton
                taskId={editing.id}
                title={editing.title}
                onDeleted={closeEdit}
              />
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={eventModal !== null}
        onClose={closeEventModal}
        title={eventModal === true ? "Rapat Baru" : "Edit Rapat"}
      >
        {eventModal !== null && (
          <EventForm
            key={eventModal === true ? "new" : eventModal.occurrenceDate + eventModal.series.id}
            occurrence={eventModal === true ? undefined : eventModal}
            members={options.members}
            onDone={closeEventModal}
          />
        )}
      </Modal>
    </>
  );
}

/** Tombol tambah di header halaman — perlu client karena membuka modal. */
export function NewTaskButton({ options }: { options: TaskFormOptions }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        className="btn btn-accent flex-1 sm:flex-none"
        onClick={() => setOpen(true)}
      >
        + Tugas Baru
      </button>
      <Modal open={open} onClose={close} title="Tugas Baru">
        {open && (
          <TaskForm action={createTask} options={options} onDone={close} />
        )}
      </Modal>
    </>
  );
}

function ViewTab({
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
      className={`rounded px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-ink font-medium text-ink-inverse"
          : "text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function DeleteTaskButton({
  taskId,
  title,
  onDeleted,
}: {
  taskId: string;
  title: string;
  onDeleted: () => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="text-sm text-danger hover:underline disabled:opacity-50"
      onClick={() => {
        if (!confirm(`Hapus tugas "${title}"?`)) return;
        startTransition(async () => {
          await deleteTask(taskId);
          onDeleted();
        });
      }}
    >
      {pending ? "Menghapus…" : "Hapus tugas ini"}
    </button>
  );
}

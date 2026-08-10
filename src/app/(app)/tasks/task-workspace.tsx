"use client";

import { useCallback, useState, useTransition } from "react";
import { Modal } from "@/components/modal";
import { EmptyState } from "@/components/page-header";
import type { BoardColumn, TaskStatus, TaskWithRelations } from "@/lib/types";
import { createTask, deleteTask, updateTask } from "./actions";
import { TaskBoard } from "./task-board";
import { TaskCalendar } from "./task-calendar";
import { TaskForm, type TaskFormOptions } from "./task-form";

type View = "board" | "calendar";

export function TaskWorkspace({
  tasks,
  columns,
  options,
}: {
  tasks: TaskWithRelations[];
  columns: BoardColumn[];
  options: TaskFormOptions;
}) {
  const [view, setView] = useState<View>("board");
  const [creating, setCreating] = useState<TaskStatus | null>(null);
  const [editing, setEditing] = useState<TaskWithRelations | null>(null);

  const closeCreate = useCallback(() => setCreating(null), []);
  const closeEdit = useCallback(() => setEditing(null), []);

  return (
    <>
      <div className="mb-4 inline-flex rounded-md border border-line bg-surface p-0.5">
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

      {/* Papan tetap ditampilkan meski belum ada tugas — kolom kosong
          dengan input tambah-cepat di dalamnya jauh lebih mengundang
          daripada layar kosong dengan satu tombol. */}
      {view === "board" ? (
        <TaskBoard tasks={tasks} columns={columns} onOpenTask={setEditing} />
      ) : tasks.length === 0 ? (
        <EmptyState
          title="Belum ada tugas"
          description="Tambahkan tugas dari tampilan Papan — tugas yang punya tenggat akan otomatis muncul di kalender."
          action={
            <button className="btn btn-accent" onClick={() => setView("board")}>
              Buka Papan
            </button>
          }
        />
      ) : (
        <TaskCalendar tasks={tasks} onOpenTask={setEditing} />
      )}

      <Modal open={creating !== null} onClose={closeCreate} title="Tugas Baru">
        {/* `key` memaksa form dibuat ulang setiap kali dibuka dari kolom
            yang berbeda. Tanpa ini, defaultValue select Status tidak ikut
            berubah (React mengabaikan defaultValue pada input yang sudah
            ter-mount), dan isian lama dari pembukaan sebelumnya tertinggal. */}
        {creating !== null && (
          <TaskForm
            key={creating}
            action={createTask}
            options={options}
            defaultStatus={creating}
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
              options={options}
              onDone={closeEdit}
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
    </>
  );
}

/** Tombol tambah di header halaman — perlu client karena membuka modal. */
export function NewTaskButton({ options }: { options: TaskFormOptions }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button className="btn btn-accent" onClick={() => setOpen(true)}>
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
      className={`rounded px-3 py-1.5 text-sm transition-colors ${
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

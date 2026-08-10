"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  TASK_STATUS_LABEL,
  TASK_STATUS_ORDER,
  type TaskStatus,
  type TaskWithRelations,
} from "@/lib/types";
import { moveTask } from "./actions";
import { SortableTaskCard, TaskCardBody } from "./task-card";

export function TaskBoard({
  tasks,
  onOpenTask,
  onAddTask,
}: {
  tasks: TaskWithRelations[];
  onOpenTask: (task: TaskWithRelations) => void;
  onAddTask: (status: TaskStatus) => void;
}) {
  // Salinan lokal supaya kartu langsung berpindah saat dilepas, tanpa
  // menunggu server. Server action yang menyusul akan menyamakan data.
  const [items, setItems] = useState(tasks);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Sinkronkan ulang kalau data dari server berubah (mis. setelah tugas
  // baru dibuat atau revalidatePath berjalan).
  const [syncedFrom, setSyncedFrom] = useState(tasks);
  if (syncedFrom !== tasks) {
    setSyncedFrom(tasks);
    setItems(tasks);
  }

  const sensors = useSensors(
    // Jarak 5px supaya klik judul kartu tidak dianggap awal drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const columns = useMemo(() => {
    const grouped = new Map<TaskStatus, TaskWithRelations[]>(
      TASK_STATUS_ORDER.map((status) => [status, []]),
    );
    for (const task of items) grouped.get(task.status)?.push(task);
    for (const list of grouped.values())
      list.sort((a, b) => a.position - b.position);
    return grouped;
  }, [items]);

  const activeTask = activeId
    ? (items.find((task) => task.id === activeId) ?? null)
    : null;

  function columnOf(id: string): TaskStatus | null {
    if (TASK_STATUS_ORDER.includes(id as TaskStatus)) return id as TaskStatus;
    return items.find((task) => task.id === id)?.status ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  // Saat kartu melintasi batas kolom, pindahkan di state lokal duluan
  // supaya kolom tujuan langsung memberi ruang secara visual.
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeColumn = columnOf(String(active.id));
    const overColumn = columnOf(String(over.id));
    if (!activeColumn || !overColumn || activeColumn === overColumn) return;

    setItems((current) =>
      current.map((task) =>
        task.id === String(active.id) ? { ...task, status: overColumn } : task,
      ),
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const taskId = String(active.id);
    const targetStatus = columnOf(String(over.id));
    if (!targetStatus) return;

    const column = (columns.get(targetStatus) ?? []).filter(
      (task) => task.id !== taskId,
    );

    // Sisipkan tepat di posisi kartu yang dilewati; kalau dilepas di area
    // kosong kolom, taruh di paling bawah.
    const overIndex = column.findIndex((task) => task.id === String(over.id));
    const insertAt = overIndex === -1 ? column.length : overIndex;

    const before = column[insertAt - 1]?.position;
    const after = column[insertAt]?.position;
    const position = computePosition(before, after);

    setItems((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, status: targetStatus, position } : task,
      ),
    );

    // Kalau server menolak, kembalikan papan ke kondisi terakhir yang
    // dikonfirmasi server — lebih baik kartu melompat balik daripada
    // layar menampilkan status yang sebenarnya tidak tersimpan.
    moveTask(taskId, targetStatus, position).catch((error) => {
      console.error("Gagal memindahkan tugas:", error);
      setItems(syncedFrom);
      alert("Perpindahan tugas gagal disimpan. Papan dikembalikan.");
    });
  }

  return (
    <DndContext
      // ID eksplisit. Tanpa ini dnd-kit membuat ID berurutan sendiri yang
      // berbeda antara render server dan hidrasi klien, dan React membuang
      // seluruh HTML papan karena dianggap tidak cocok.
      id="task-board"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {TASK_STATUS_ORDER.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={columns.get(status) ?? []}
            onOpenTask={onOpenTask}
            onAddTask={onAddTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="card cursor-grabbing p-3 shadow-lg">
            <TaskCardBody task={activeTask} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  tasks,
  onOpenTask,
  onAddTask,
}: {
  status: TaskStatus;
  tasks: TaskWithRelations[];
  onOpenTask: (task: TaskWithRelations) => void;
  onAddTask: (status: TaskStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      className={`flex flex-col rounded-lg border p-3 transition-colors ${
        isOver ? "border-accent bg-accent-soft/40" : "border-line bg-surface-muted"
      }`}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <p className="eyebrow">{TASK_STATUS_LABEL[status]}</p>
        <span className="font-mono text-xs text-ink-subtle">{tasks.length}</span>
      </header>

      <SortableContext
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex min-h-16 flex-col gap-2">
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onOpen={() => onOpenTask(task)}
            />
          ))}
        </ul>
      </SortableContext>

      <button
        type="button"
        onClick={() => onAddTask(status)}
        className="mt-2 rounded-md px-2 py-1.5 text-left text-xs text-ink-subtle hover:bg-surface hover:text-ink"
      >
        + Tambah tugas
      </button>
    </section>
  );
}

/**
 * Posisi baru = titik tengah antara dua tetangga. Kalau kartu ditaruh di
 * ujung, cukup geser 1 dari tetangga yang ada.
 */
function computePosition(before?: number, after?: number) {
  if (before === undefined && after === undefined) return 0;
  if (before === undefined) return after! - 1;
  if (after === undefined) return before + 1;
  return (before + after) / 2;
}

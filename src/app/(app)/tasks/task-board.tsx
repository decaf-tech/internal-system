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
  CARD_COLORS,
  TASK_STATUS_LABEL,
  TASK_STATUS_ORDER,
  TASK_STATUS_TINT,
  type BoardColumn,
  type TaskStatus,
  type TaskWithRelations,
} from "@/lib/types";
import { moveTask } from "./actions";
import { QuickAdd } from "./quick-add";
import { SortableTaskCard, TaskCardBody } from "./task-card";
import { WipLimitControl } from "./wip-limit";

export function TaskBoard({
  tasks,
  columns: columnConfig,
  onOpenTask,
}: {
  tasks: TaskWithRelations[];
  columns: BoardColumn[];
  onOpenTask: (task: TaskWithRelations) => void;
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

  const grouped = useMemo(() => {
    const map = new Map<TaskStatus, TaskWithRelations[]>(
      TASK_STATUS_ORDER.map((status) => [status, []]),
    );
    for (const task of items) map.get(task.status)?.push(task);
    for (const list of map.values())
      list.sort((a, b) => a.position - b.position);
    return map;
  }, [items]);

  const limits = useMemo(() => {
    const map = new Map<TaskStatus, number | null>();
    for (const column of columnConfig) map.set(column.status, column.wip_limit);
    return map;
  }, [columnConfig]);

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

    const column = (grouped.get(targetStatus) ?? []).filter(
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
      <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-2 xl:grid-cols-4">
        {TASK_STATUS_ORDER.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={grouped.get(status) ?? []}
            wipLimit={limits.get(status) ?? null}
            onOpenTask={onOpenTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div
            style={{
              backgroundColor: CARD_COLORS[activeTask.color]?.bg,
              borderColor: CARD_COLORS[activeTask.color]?.border,
            }}
            className="rotate-2 cursor-grabbing rounded-sm border p-2.5 shadow-lg"
          >
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
  wipLimit,
  onOpenTask,
}: {
  status: TaskStatus;
  tasks: TaskWithRelations[];
  wipLimit: number | null;
  onOpenTask: (task: TaskWithRelations) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const tint = TASK_STATUS_TINT[status];
  const overLimit = wipLimit !== null && tasks.length > wipLimit;

  return (
    <section className="flex flex-col">
      <header
        className="border-b border-line px-3 py-2.5 text-center"
        style={{ backgroundColor: tint.header }}
      >
        <p className="text-sm font-medium text-ink">
          {TASK_STATUS_LABEL[status]}
        </p>
      </header>

      <div
        ref={setNodeRef}
        className="flex flex-1 flex-col p-2.5 transition-colors"
        style={{
          backgroundColor: isOver ? tint.header : tint.body,
        }}
      >
        {/* Kartu dan input mengisi ruang yang tersisa, supaya penanda
            LIMIT selalu menempel di dasar kolom — sejajar antar kolom
            meski jumlah kartunya berbeda jauh. */}
        <div className="flex-1">
          <SortableContext
            items={tasks.map((task) => task.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex min-h-20 flex-col gap-2">
              {tasks.map((task) => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  onOpen={() => onOpenTask(task)}
                />
              ))}
            </ul>
          </SortableContext>

          <QuickAdd status={status} />
        </div>

        <div className="mt-3 border-t border-line/70 pt-2.5 text-center">
          <WipLimitControl
            status={status}
            limit={wipLimit}
            current={tasks.length}
          />
          {overLimit && (
            <p className="mt-1 font-mono text-[10px] text-danger">
              Kelebihan {tasks.length - wipLimit} tugas
            </p>
          )}
        </div>
      </div>
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

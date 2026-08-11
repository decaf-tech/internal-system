"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { parseIdList, syncJoinTable } from "@/lib/join-table";
import { TASK_STATUS_LABEL } from "@/lib/types";
import type {
  CardColor,
  Label,
  LabelColor,
  TaskPriority,
  TaskStatus,
} from "@/lib/types";

export type FormState = { error: string | null; ok?: true };

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

function syncTaskLabels(
  supabase: Awaited<ReturnType<typeof createClient>>,
  taskId: string,
  wanted: string[],
) {
  return syncJoinTable(supabase, {
    table: "task_labels",
    anchorColumn: "task_id",
    anchorId: taskId,
    otherColumn: "label_id",
    wanted,
  });
}

function syncTaskAssignees(
  supabase: Awaited<ReturnType<typeof createClient>>,
  taskId: string,
  wanted: string[],
) {
  return syncJoinTable(supabase, {
    table: "task_assignees",
    anchorColumn: "task_id",
    anchorId: taskId,
    otherColumn: "profile_id",
    wanted,
  });
}

export async function createTask(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  const title = text(formData, "title");
  if (!title) return { error: "Judul tugas wajib diisi." };

  const status = (text(formData, "status") ?? "todo") as TaskStatus;

  // Tugas baru masuk ke bawah kolomnya: ambil posisi terbesar lalu +1.
  const { data: last } = await supabase
    .from("tasks")
    .select("position")
    .eq("status", status)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from("tasks")
    .insert({
      title,
      description: text(formData, "description"),
      status,
      priority: (text(formData, "priority") ?? "medium") as TaskPriority,
      color: (text(formData, "color") ?? "blue") as CardColor,
      client_id: text(formData, "client_id"),
      project_id: text(formData, "project_id"),
      start_date: text(formData, "start_date"),
      due_date: text(formData, "due_date"),
      position: (last?.position ?? 0) + 1,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("Gagal menambah tugas:", error);
    return { error: "Gagal menyimpan tugas." };
  }

  const assignees = parseIdList(formData, "assignee_ids");
  if (assignees.length > 0) await syncTaskAssignees(supabase, created.id, assignees);

  const labels = parseIdList(formData, "label_ids");
  if (labels.length > 0) await syncTaskLabels(supabase, created.id, labels);

  await logActivity(supabase, {
    actorId: user.id,
    entityType: "task",
    entityId: created.id,
    action: "created",
    summary: `membuat tugas "${title}"`,
  });

  revalidatePath("/tasks");
  revalidatePath("/");
  return { error: null, ok: true };
}

export async function updateTask(
  taskId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const title = text(formData, "title");
  if (!title) return { error: "Judul tugas wajib diisi." };

  const { error } = await supabase
    .from("tasks")
    .update({
      title,
      description: text(formData, "description"),
      status: (text(formData, "status") ?? "todo") as TaskStatus,
      priority: (text(formData, "priority") ?? "medium") as TaskPriority,
      color: (text(formData, "color") ?? "blue") as CardColor,
      client_id: text(formData, "client_id"),
      project_id: text(formData, "project_id"),
      start_date: text(formData, "start_date"),
      due_date: text(formData, "due_date"),
    })
    .eq("id", taskId);

  if (error) {
    console.error("Gagal memperbarui tugas:", error);
    return { error: "Gagal menyimpan perubahan." };
  }

  await syncTaskAssignees(supabase, taskId, parseIdList(formData, "assignee_ids"));
  await syncTaskLabels(supabase, taskId, parseIdList(formData, "label_ids"));

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    entityType: "task",
    entityId: taskId,
    action: "updated",
    summary: `mengubah tugas "${title}"`,
  });

  revalidatePath("/tasks");
  revalidatePath("/");
  return { error: null, ok: true };
}

export type QuickAddInput = {
  status: TaskStatus;
  title: string;
  color?: CardColor;
  assigneeIds?: string[];
  dueDate?: string | null;
  labelIds?: string[];
};

/**
 * Tambah cepat: judul saja sudah cukup, sisanya opsional.
 *
 * Penugasan dan tenggat ikut di sini karena keduanya yang paling sering
 * diketahui persis saat tugasnya dicatat — kalau harus buka modal dulu,
 * dua field itu biasanya berakhir tidak pernah diisi.
 */
export async function quickAddTask(
  input: QuickAddInput,
): Promise<{ error: string | null }> {
  const trimmed = input.title.trim();
  if (!trimmed) return { error: "Judul tugas kosong." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  const { data: last } = await supabase
    .from("tasks")
    .select("position")
    .eq("status", input.status)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from("tasks")
    .insert({
      title: trimmed,
      status: input.status,
      color: input.color ?? "blue",
      due_date: input.dueDate || null,
      position: (last?.position ?? 0) + 1,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("Gagal menambah tugas cepat:", error);
    return { error: "Gagal menyimpan tugas." };
  }

  if (input.assigneeIds && input.assigneeIds.length > 0) {
    await syncTaskAssignees(supabase, created.id, input.assigneeIds);
  }
  if (input.labelIds && input.labelIds.length > 0) {
    await syncTaskLabels(supabase, created.id, input.labelIds);
  }

  await logActivity(supabase, {
    actorId: user.id,
    entityType: "task",
    entityId: created.id,
    action: "created",
    summary: `membuat tugas "${trimmed}"`,
  });

  revalidatePath("/tasks");
  revalidatePath("/");
  return { error: null };
}

/**
 * Geser/ubah panjang jadwal sebuah tugas langsung dari kalender.
 *
 * Dipanggil sekali saat batangnya dilepas, bukan setiap piksel — Next.js
 * mengantre server action satu per satu per klien, jadi mengirim tiap
 * gerakan akan menumpuk antrean dan membuat batangnya terasa berat.
 */
export async function updateTaskSchedule(
  taskId: string,
  startDate: string | null,
  dueDate: string | null,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: task, error } = await supabase
    .from("tasks")
    .update({ start_date: startDate, due_date: dueDate })
    .eq("id", taskId)
    .select("title")
    .single();

  if (error) {
    console.error("Gagal mengubah jadwal tugas:", error);
    return { error: "Gagal menyimpan jadwal." };
  }

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    entityType: "task",
    entityId: taskId,
    action: "updated",
    summary: `mengubah jadwal tugas "${task?.title ?? ""}"`,
  });

  revalidatePath("/tasks");
  revalidatePath("/");
  return { error: null };
}

/** Buat label baru dari dalam pemilih label, tanpa pindah halaman. */
export async function createLabel(
  name: string,
  color: LabelColor,
): Promise<{ error: string | null; label?: Label }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Nama label kosong." };

  const supabase = await createClient();

  const { data: last } = await supabase
    .from("labels")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("labels")
    .insert({ name: trimmed, color, position: (last?.position ?? 0) + 1 })
    .select("*")
    .single();

  if (error || !data) {
    console.error("Gagal membuat label:", error);
    // Nama label unik (indeks di migration 003); ini kesalahan yang paling
    // mungkin terjadi dan layak disebut spesifik.
    return {
      error:
        error?.code === "23505"
          ? `Label "${trimmed}" sudah ada.`
          : "Gagal membuat label.",
    };
  }

  revalidatePath("/tasks");
  return { error: null, label: data as Label };
}

export async function deleteLabel(labelId: string) {
  const supabase = await createClient();
  await supabase.from("labels").delete().eq("id", labelId);
  revalidatePath("/tasks");
}

/** Ubah warna kartu langsung dari papan, tanpa membuka modal. */
export async function updateTaskColor(taskId: string, color: CardColor) {
  const supabase = await createClient();
  await supabase.from("tasks").update({ color }).eq("id", taskId);
  revalidatePath("/tasks");
}

/** Simpan batas WIP sebuah kolom. `limit` null berarti tanpa batas. */
export async function updateWipLimit(status: TaskStatus, limit: number | null) {
  const supabase = await createClient();
  await supabase
    .from("board_columns")
    .update({ wip_limit: limit, updated_at: new Date().toISOString() })
    .eq("status", status);
  revalidatePath("/tasks");
}

/**
 * Dipanggil setelah kartu di-drag. `position` sudah dihitung di sisi klien
 * sebagai rata-rata posisi dua kartu tetangganya, jadi cukup satu update
 * baris — kartu lain di kolom itu tidak perlu ditulis ulang.
 */
export async function moveTask(
  taskId: string,
  status: TaskStatus,
  position: number,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: task } = await supabase
    .from("tasks")
    .update({ status, position })
    .eq("id", taskId)
    .select("title")
    .single();

  if (task) {
    await logActivity(supabase, {
      actorId: user?.id ?? null,
      entityType: "task",
      entityId: taskId,
      action: "moved",
      summary: `memindahkan tugas "${task.title}" ke ${TASK_STATUS_LABEL[status]}`,
    });
  }

  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: task } = await supabase
    .from("tasks")
    .select("title")
    .eq("id", taskId)
    .single();

  await supabase.from("tasks").delete().eq("id", taskId);

  if (task) {
    await logActivity(supabase, {
      actorId: user?.id ?? null,
      entityType: "task",
      entityId: null,
      action: "deleted",
      summary: `menghapus tugas "${task.title}"`,
    });
  }

  revalidatePath("/tasks");
  revalidatePath("/");
}

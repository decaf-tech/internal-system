"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TaskPriority, TaskStatus } from "@/lib/types";

export type FormState = { error: string | null; ok?: true };

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
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

  const { error } = await supabase.from("tasks").insert({
    title,
    description: text(formData, "description"),
    status,
    priority: (text(formData, "priority") ?? "medium") as TaskPriority,
    assignee_id: text(formData, "assignee_id"),
    client_id: text(formData, "client_id"),
    project_id: text(formData, "project_id"),
    due_date: text(formData, "due_date"),
    position: (last?.position ?? 0) + 1,
    created_by: user.id,
  });

  if (error) {
    console.error("Gagal menambah tugas:", error);
    return { error: "Gagal menyimpan tugas." };
  }

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

  const title = text(formData, "title");
  if (!title) return { error: "Judul tugas wajib diisi." };

  const { error } = await supabase
    .from("tasks")
    .update({
      title,
      description: text(formData, "description"),
      status: (text(formData, "status") ?? "todo") as TaskStatus,
      priority: (text(formData, "priority") ?? "medium") as TaskPriority,
      assignee_id: text(formData, "assignee_id"),
      client_id: text(formData, "client_id"),
      project_id: text(formData, "project_id"),
      due_date: text(formData, "due_date"),
    })
    .eq("id", taskId);

  if (error) {
    console.error("Gagal memperbarui tugas:", error);
    return { error: "Gagal menyimpan perubahan." };
  }

  revalidatePath("/tasks");
  revalidatePath("/");
  return { error: null, ok: true };
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
  await supabase.from("tasks").update({ status, position }).eq("id", taskId);
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  await supabase.from("tasks").delete().eq("id", taskId);
  revalidatePath("/tasks");
  revalidatePath("/");
}

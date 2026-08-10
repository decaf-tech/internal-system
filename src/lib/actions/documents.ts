"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clientFolderPath, getStorage, receiptFolderPath } from "@/lib/storage";

// Batas ukuran file. Vercel membatasi body request serverless di 4.5MB,
// jadi angka ini jangan dinaikkan tanpa pindah ke upload langsung
// (resumable upload ke Drive dari browser).
const MAX_FILE_BYTES = 4 * 1024 * 1024;

export type DocumentLink = {
  clientId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  expenseId?: string | null;
};

export type UploadResult = { error: string | null };

/**
 * Upload satu file ke Google Drive lalu catat metadatanya di Supabase.
 *
 * Folder tujuan ditentukan dari entitas yang ditempeli: dokumen klien
 * masuk ke /Clients/<nama klien>/..., struk masuk ke /Expenses/<bulan>.
 */
export async function uploadDocument(
  link: DocumentLink,
  formData: FormData,
): Promise<UploadResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Tidak ada file yang dipilih." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "Ukuran file melebihi 4MB." };
  }

  const folderPath = await resolveFolderPath(link);

  let stored;
  try {
    stored = await getStorage().upload({
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      content: file.stream(),
      folderPath,
    });
  } catch (error) {
    console.error("Upload ke Google Drive gagal:", error);
    return {
      error: "Upload ke Google Drive gagal. Cek koneksi & kredensial Drive.",
    };
  }

  const { error: dbError } = await supabase.from("documents").insert({
    name: stored.name,
    mime_type: stored.mimeType,
    size_bytes: stored.sizeBytes,
    drive_file_id: stored.id,
    drive_web_link: stored.webLink,
    client_id: link.clientId ?? null,
    project_id: link.projectId ?? null,
    task_id: link.taskId ?? null,
    expense_id: link.expenseId ?? null,
    uploaded_by: user.id,
  });

  if (dbError) {
    // File sudah terlanjur naik ke Drive tapi metadata gagal disimpan.
    // Buang lagi filenya supaya tidak jadi file yatim yang tak terlacak.
    await getStorage()
      .remove(stored.id)
      .catch(() => {});
    console.error("Gagal menyimpan metadata dokumen:", dbError);
    return { error: "File gagal dicatat di database." };
  }

  revalidatePath("/", "layout");
  return { error: null };
}

export async function deleteDocument(documentId: string) {
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("drive_file_id")
    .eq("id", documentId)
    .single();

  if (!doc) return;

  // Hapus record dulu; kalau penghapusan di Drive gagal, file cuma jadi
  // sampah di Trash Drive — jauh lebih aman daripada record menggantung
  // yang menunjuk ke file yang sudah tidak ada.
  await supabase.from("documents").delete().eq("id", documentId);
  await getStorage()
    .remove(doc.drive_file_id)
    .catch((error) => console.error("Gagal menghapus file di Drive:", error));

  revalidatePath("/", "layout");
}

async function resolveFolderPath(link: DocumentLink): Promise<string[]> {
  const supabase = await createClient();

  if (link.expenseId) {
    const { data } = await supabase
      .from("expenses")
      .select("expense_date")
      .eq("id", link.expenseId)
      .single();
    return receiptFolderPath(
      data?.expense_date ? new Date(data.expense_date) : new Date(),
    );
  }

  if (link.projectId) {
    const { data } = await supabase
      .from("projects")
      .select("name, client:clients(name)")
      .eq("id", link.projectId)
      .single();

    if (data) {
      const client = data.client as unknown as { name: string } | null;
      return clientFolderPath(client?.name ?? "Tanpa Klien", data.name);
    }
  }

  if (link.clientId) {
    const { data } = await supabase
      .from("clients")
      .select("name")
      .eq("id", link.clientId)
      .single();
    if (data) return clientFolderPath(data.name);
  }

  if (link.taskId) {
    const { data } = await supabase
      .from("tasks")
      .select("client:clients(name)")
      .eq("id", link.taskId)
      .single();
    const client = data?.client as unknown as { name: string } | null;
    if (client?.name) return clientFolderPath(client.name);
  }

  return ["Umum"];
}

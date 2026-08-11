"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStorage } from "@/lib/storage";
import { folderPathOf } from "@/lib/documents/paths";

export type ActionResult = { error: string | null };

export async function createFolder(
  parentId: string | null,
  name: string,
): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Nama folder tidak boleh kosong." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  const parentPath = await folderPathOf(parentId);

  let driveFolderId: string;
  try {
    // ensureFolder membuat folder di Drive kalau belum ada, dan memakai
    // yang sudah ada kalau namanya sama — jadi struktur di Drive dan di
    // database tidak pernah bercabang dua.
    driveFolderId = await getStorage().ensureFolder([...parentPath, trimmed]);
  } catch (error) {
    console.error("Gagal membuat folder di Drive:", error);
    return { error: "Gagal membuat folder di Google Drive." };
  }

  const { error } = await supabase.from("folders").insert({
    name: trimmed,
    parent_id: parentId,
    drive_folder_id: driveFolderId,
    created_by: user.id,
  });

  if (error) {
    // Kode 23505 = unique violation pada drive_folder_id, artinya folder
    // dengan nama itu sudah tercatat di tempat yang sama.
    if (error.code === "23505") {
      return { error: "Folder dengan nama itu sudah ada di sini." };
    }
    console.error("Gagal menyimpan folder:", error);
    return { error: "Folder dibuat di Drive tapi gagal dicatat." };
  }

  revalidatePath("/documents");
  return { error: null };
}

export async function renameFolder(
  folderId: string,
  name: string,
): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Nama folder tidak boleh kosong." };

  const supabase = await createClient();
  // Catatan: nama di Drive tidak ikut berubah. File tetap ketemu karena
  // yang dipakai sistem adalah drive_file_id, bukan jalur folder.
  const { error } = await supabase
    .from("folders")
    .update({ name: trimmed })
    .eq("id", folderId);

  if (error) return { error: "Gagal mengubah nama folder." };

  revalidatePath("/documents");
  return { error: null };
}

export async function deleteFolder(folderId: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Folder anak ikut terhapus lewat ON DELETE CASCADE, dan dokumen di
  // dalamnya jadi folder_id NULL (tidak ikut terhapus). File fisiknya
  // tetap aman di Drive — sengaja, supaya salah klik tidak berujung
  // kehilangan dokumen.
  const { error } = await supabase.from("folders").delete().eq("id", folderId);

  if (error) return { error: "Gagal menghapus folder." };

  revalidatePath("/documents");
  return { error: null };
}

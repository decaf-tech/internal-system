"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStorage } from "@/lib/storage";

export type ActionResult = { error: string | null };

// Batas ukuran file. Vercel membatasi body request serverless di 4.5MB,
// jadi angka ini jangan dinaikkan tanpa pindah ke upload langsung
// (resumable upload ke Drive dari browser).
const MAX_FILE_BYTES = 4 * 1024 * 1024;

/**
 * Rangkai nama folder dari root sampai folder tujuan.
 * Dipakai untuk memberi tahu StorageProvider harus menaruh file di mana.
 */
async function pathOf(folderId: string | null): Promise<string[]> {
  if (!folderId) return [];

  const supabase = await createClient();
  const path: string[] = [];
  let current: string | null = folderId;

  // Batas 20 tingkat sebagai jaring pengaman: kalau data folder sempat
  // rusak dan membentuk lingkaran, loop ini tetap berhenti.
  for (let depth = 0; current && depth < 20; depth += 1) {
    const { data }: { data: { name: string; parent_id: string | null } | null } =
      await supabase
        .from("folders")
        .select("name, parent_id")
        .eq("id", current)
        .single();
    if (!data) break;
    path.unshift(data.name);
    current = data.parent_id;
  }

  return path;
}

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

  const parentPath = await pathOf(parentId);

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

export async function uploadToFolder(
  folderId: string | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return { error: "Tidak ada file yang dipilih." };

  const folderPath = await pathOf(folderId);
  const storage = getStorage();
  const failed: string[] = [];

  for (const file of files) {
    if (file.size === 0) continue;
    if (file.size > MAX_FILE_BYTES) {
      failed.push(`${file.name} (lebih dari 4MB)`);
      continue;
    }

    try {
      const stored = await storage.upload({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        content: file.stream(),
        // Folder kosong berarti taruh langsung di root Drive.
        folderPath: folderPath.length > 0 ? folderPath : ["Umum"],
      });

      const { error } = await supabase.from("documents").insert({
        name: stored.name,
        mime_type: stored.mimeType,
        size_bytes: stored.sizeBytes,
        drive_file_id: stored.id,
        drive_web_link: stored.webLink,
        folder_id: folderId,
        uploaded_by: user.id,
      });

      if (error) {
        // Metadata gagal disimpan — buang lagi filenya supaya tidak jadi
        // file yatim yang tak terlacak sistem.
        await storage.remove(stored.id).catch(() => {});
        failed.push(file.name);
      }
    } catch (error) {
      console.error(`Gagal mengunggah ${file.name}:`, error);
      failed.push(file.name);
    }
  }

  revalidatePath("/documents");

  if (failed.length > 0) {
    return { error: `Gagal diunggah: ${failed.join(", ")}` };
  }
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

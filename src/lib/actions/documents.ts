"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStorage } from "@/lib/storage";
import { targetColumns, targetFolderPath } from "@/lib/documents/paths";
import {
  MAX_FALLBACK_BYTES,
  MAX_FILE_BYTES,
  formatLimit,
  type UploadTarget,
} from "@/lib/documents/types";

// Catatan: file ini "use server", jadi SEMUA ekspornya harus fungsi async.
// Tipe dan konstanta tinggal di @/lib/documents/types — menaruhnya di sini
// membuat Next.js melempar "A use server file can only export async
// functions" saat modulnya dievaluasi.

/**
 * Langkah 1 dari upload: buka sesi di Drive dan serahkan URL-nya ke browser.
 * Browser yang mengirim byte-nya sendiri ke Google — server kita tidak
 * pernah memegang isi file, jadi tidak ada lagi plafon 4.5MB.
 */
export async function startDocumentUpload(
  target: UploadTarget,
  file: { name: string; mimeType: string; sizeBytes: number },
): Promise<
  { error: null; uploadUrl: string } | { error: string; uploadUrl?: undefined }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  if (!file.name.trim()) return { error: "Nama file kosong." };
  if (file.sizeBytes <= 0) return { error: "File kosong." };
  if (file.sizeBytes > MAX_FILE_BYTES) {
    return { error: `Ukuran file melebihi ${formatLimit(MAX_FILE_BYTES)}.` };
  }

  const origin = await requestOrigin();
  if (!origin) {
    return { error: "Tidak bisa menentukan origin aplikasi untuk upload." };
  }

  try {
    const { uploadUrl } = await getStorage().createResumableUpload({
      name: file.name,
      mimeType: file.mimeType || "application/octet-stream",
      sizeBytes: file.sizeBytes,
      folderPath: await targetFolderPath(target),
      origin,
    });
    return { error: null, uploadUrl };
  } catch (error) {
    console.error("Gagal membuka sesi upload Drive:", error);
    return { error: "Gagal menyiapkan upload ke Google Drive." };
  }
}

/**
 * Langkah 2: browser sudah selesai mengunggah, sekarang catat metadatanya.
 *
 * Metadata dibaca ulang dari Drive, bukan diambil dari kiriman browser —
 * jadi ukuran dan nama yang tercatat selalu apa adanya. Induk file juga
 * diperiksa supaya ID file sembarangan tidak bisa didaftarkan ke sini.
 */
export async function finishDocumentUpload(
  target: UploadTarget,
  driveFileId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  const storage = getStorage();

  let stored;
  try {
    stored = await storage.getFile(driveFileId);
    const expectedFolder = await storage.ensureFolder(
      await targetFolderPath(target),
    );
    if (stored.parentIds && !stored.parentIds.includes(expectedFolder)) {
      return { error: "File tidak berada di folder tujuan." };
    }
  } catch (error) {
    console.error("Gagal membaca file hasil upload:", error);
    return { error: "File terunggah tapi metadatanya tidak terbaca." };
  }

  const { error } = await supabase.from("documents").insert({
    name: stored.name,
    mime_type: stored.mimeType,
    size_bytes: stored.sizeBytes,
    drive_file_id: stored.id,
    drive_web_link: stored.webLink,
    ...(await targetColumns(target)),
    uploaded_by: user.id,
  });

  if (error) {
    // File sudah terlanjur naik ke Drive tapi metadata gagal disimpan.
    // Buang lagi filenya supaya tidak jadi file yatim yang tak terlacak.
    await storage.remove(stored.id).catch(() => {});
    console.error("Gagal menyimpan metadata dokumen:", error);
    return { error: "File gagal dicatat di database." };
  }

  revalidatePath("/", "layout");
  return { error: null };
}

/**
 * Jalur cadangan: file dikirim lewat server kita, seperti sebelumnya.
 *
 * Dipakai hanya kalau upload langsung ke Drive gagal di sisi browser
 * (mis. jaringan kantor yang memblokir googleapis.com). Karena melewati
 * serverless function, di sini plafon 4.5MB Vercel berlaku penuh.
 */
export async function uploadDocumentViaServer(
  target: UploadTarget,
  formData: FormData,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Tidak ada file yang dipilih." };
  }
  if (file.size > MAX_FALLBACK_BYTES) {
    return {
      error: `Upload langsung ke Drive gagal, dan file lebih dari ${formatLimit(MAX_FALLBACK_BYTES)} sehingga tidak bisa lewat server.`,
    };
  }

  const storage = getStorage();

  let stored;
  try {
    stored = await storage.upload({
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      content: file.stream(),
      folderPath: await targetFolderPath(target),
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
    ...(await targetColumns(target)),
    uploaded_by: user.id,
  });

  if (dbError) {
    await storage.remove(stored.id).catch(() => {});
    console.error("Gagal menyimpan metadata dokumen:", dbError);
    return { error: "File gagal dicatat di database." };
  }

  revalidatePath("/", "layout");
  return { error: null };
}

/**
 * Lampiran sebuah seri rapat.
 *
 * Menempel ke SERI, bukan ke kemunculan: deck dan agenda rapat rutin
 * hampir selalu dipakai ulang tiap minggu, sementara yang berbeda tiap
 * pertemuan adalah notulennya — dan itu sudah punya tempatnya sendiri.
 */
export async function documentsForEvent(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal memuat lampiran rapat:", error);
    return [];
  }
  return data ?? [];
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

/** Origin halaman pemanggil, untuk izin CORS sesi upload Drive. */
async function requestOrigin(): Promise<string | null> {
  const headerList = await headers();

  const origin = headerList.get("origin");
  if (origin) return origin;

  // Beberapa proxy tidak meneruskan Origin — susun ulang dari host.
  const host = headerList.get("host");
  if (!host) return null;
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

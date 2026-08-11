"use client";

import {
  finishDocumentUpload,
  startDocumentUpload,
  uploadDocumentViaServer,
} from "@/lib/actions/documents";
import type { UploadTarget } from "@/lib/documents/types";

/**
 * Pengunggah sisi browser.
 *
 * Alurnya tiga langkah: minta URL sesi ke server kita, kirim byte-nya
 * langsung ke Google, lalu minta server mencatat metadatanya. Server kita
 * tidak pernah menyentuh isi file — itu yang menghapus batas 4.5MB body
 * request Vercel dan batas body Server Action Next.js.
 *
 * Kalau pengiriman langsung gagal (jaringan memblokir googleapis.com,
 * CORS ditolak), file di bawah 4MB otomatis dicoba lagi lewat server.
 */

export type UploadProgress = {
  /** File ke berapa dari total, mulai dari 1. */
  index: number;
  count: number;
  name: string;
  /** 0–100, untuk file yang sedang berjalan. */
  percent: number;
};

export type UploadFailure = { name: string; reason: string };

export async function uploadFiles(
  files: File[],
  target: UploadTarget,
  onProgress?: (progress: UploadProgress) => void,
): Promise<{ failed: UploadFailure[] }> {
  const failed: UploadFailure[] = [];

  for (const [position, file] of files.entries()) {
    if (file.size === 0) continue;

    const report = (percent: number) =>
      onProgress?.({
        index: position + 1,
        count: files.length,
        name: file.name,
        percent,
      });

    report(0);

    const started = await startDocumentUpload(target, {
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    });

    if (started.error !== null) {
      failed.push({ name: file.name, reason: started.error });
      continue;
    }

    let driveFileId: string;
    try {
      driveFileId = await putToDrive(started.uploadUrl, file, report);
    } catch (error) {
      console.error(`Upload langsung gagal untuk ${file.name}:`, error);
      const fallback = await uploadViaServer(file, target);
      if (fallback) failed.push({ name: file.name, reason: fallback });
      continue;
    }

    const finished = await finishDocumentUpload(target, driveFileId);
    if (finished.error) {
      failed.push({ name: file.name, reason: finished.error });
      continue;
    }

    report(100);
  }

  return { failed };
}

/**
 * Kirim isi file ke URL sesi Drive. Pakai XMLHttpRequest, bukan fetch,
 * karena cuma XHR yang melaporkan progres unggah — dan untuk file besar
 * bilah progres itu bedanya antara "sedang jalan" dan "aplikasi hang".
 */
function putToDrive(
  uploadUrl: string,
  file: File,
  onPercent: (percent: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadUrl, true);
    request.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onPercent(Math.round((event.loaded / event.total) * 100));
      }
    };

    request.onerror = () =>
      reject(new Error("Koneksi ke Google Drive terputus."));
    request.ontimeout = () => reject(new Error("Upload ke Drive kehabisan waktu."));

    request.onload = () => {
      if (request.status !== 200 && request.status !== 201) {
        reject(
          new Error(`Drive menolak unggahan (${request.status}): ${request.responseText}`),
        );
        return;
      }
      try {
        const id = JSON.parse(request.responseText)?.id;
        if (typeof id !== "string" || id.length === 0) {
          reject(new Error("Drive tidak mengembalikan ID file."));
          return;
        }
        resolve(id);
      } catch {
        reject(new Error("Balasan Drive tidak bisa dibaca."));
      }
    };

    request.send(file);
  });
}

/** Jalur cadangan lewat server kita. Mengembalikan pesan error, atau null kalau berhasil. */
async function uploadViaServer(
  file: File,
  target: UploadTarget,
): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const result = await uploadDocumentViaServer(target, formData);
    return result.error;
  } catch (error) {
    console.error(`Upload lewat server juga gagal untuk ${file.name}:`, error);
    return "Upload gagal, baik langsung ke Drive maupun lewat server.";
  }
}

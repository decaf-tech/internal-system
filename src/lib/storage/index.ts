import "server-only";

import { GoogleDriveProvider } from "./google-drive";
import type { StorageProvider } from "./types";

export type {
  StorageProvider,
  StorageQuota,
  StoredFile,
  UploadInput,
} from "./types";

let cached: StorageProvider | null = null;

/**
 * Satu-satunya tempat yang menentukan provider penyimpanan mana yang dipakai.
 * Mau pindah dari Google Drive? Ganti baris `new GoogleDriveProvider()` —
 * tidak ada file lain yang perlu disentuh.
 */
export function getStorage(): StorageProvider {
  cached ??= new GoogleDriveProvider();
  return cached;
}

/** Folder tujuan dokumen milik seorang klien (opsional per project). */
export function clientFolderPath(clientName: string, projectName?: string) {
  const path = ["Clients", clientName];
  if (projectName) path.push(projectName);
  return path;
}

/** Folder tujuan struk pengeluaran, dikelompokkan per bulan. */
export function receiptFolderPath(date: Date) {
  const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  return ["Expenses", month];
}

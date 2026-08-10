import type { Readable } from "node:stream";

/**
 * Kontrak penyimpanan file.
 *
 * Seluruh aplikasi hanya bicara lewat interface ini — tidak ada satu pun
 * halaman atau action yang memanggil Google Drive langsung. Itu yang
 * membuat rencana "mulai gratis, pindah kalau sudah butuh" bisa dieksekusi:
 * saat kuota 15GB Drive habis, cukup tulis provider baru (Supabase Storage,
 * S3, atau server sendiri) dan ganti satu baris di getStorage().
 */
export interface StorageProvider {
  /**
   * Pastikan sebuah folder ada, buat kalau belum. Mengembalikan ID folder.
   * `path` relatif terhadap folder root, contoh: ["Clients", "Mammo's Bakery"].
   */
  ensureFolder(path: string[]): Promise<string>;

  upload(input: UploadInput): Promise<StoredFile>;

  /** Untuk dialirkan (stream) ke browser lewat route handler kita sendiri. */
  download(fileId: string): Promise<DownloadResult>;

  remove(fileId: string): Promise<void>;
}

export type UploadInput = {
  name: string;
  mimeType: string;
  /** Isi file. Web ReadableStream (dari objek File) atau Buffer. */
  content: ReadableStream<Uint8Array> | Buffer;
  /** Folder tujuan, relatif terhadap root. Dibuat otomatis kalau belum ada. */
  folderPath: string[];
};

export type StoredFile = {
  /** ID file di sisi provider. Disimpan di kolom documents.drive_file_id. */
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  /** Link untuk dibuka manual di UI provider, kalau ada. */
  webLink: string | null;
};

export type DownloadResult = {
  stream: Readable;
  mimeType: string;
  name: string;
};

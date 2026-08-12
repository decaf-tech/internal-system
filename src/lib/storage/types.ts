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

  /**
   * Buka sesi upload yang byte-nya dikirim browser langsung ke provider,
   * tanpa melewati server kita. Ini yang membuat file besar mungkin:
   * server kita di Vercel cuma boleh menerima body ~4.5MB per request.
   */
  createResumableUpload(input: ResumableUploadInput): Promise<ResumableUpload>;

  /** Baca metadata file yang sudah ada, mis. setelah upload langsung selesai. */
  getFile(fileId: string): Promise<StoredFile>;

  /** Untuk dialirkan (stream) ke browser lewat route handler kita sendiri. */
  download(fileId: string): Promise<DownloadResult>;

  remove(fileId: string): Promise<void>;

  /** Kuota penyimpanan akun Drive yang dipakai — untuk indikator sisa ruang. */
  getQuota(): Promise<StorageQuota>;
}

export type StorageQuota = {
  usageBytes: number;
  /** `null` kalau akun tidak berbatas kuota (mis. Google Workspace tertentu). */
  limitBytes: number | null;
};

export type UploadInput = {
  name: string;
  mimeType: string;
  /** Isi file. Web ReadableStream (dari objek File) atau Buffer. */
  content: ReadableStream<Uint8Array> | Buffer;
  /** Folder tujuan, relatif terhadap root. Dibuat otomatis kalau belum ada. */
  folderPath: string[];
};

export type ResumableUploadInput = {
  name: string;
  mimeType: string;
  /** Ukuran file, dipakai provider untuk memvalidasi kiriman browser. */
  sizeBytes: number;
  folderPath: string[];
  /**
   * Origin halaman yang akan mengirim byte-nya (mis. https://decaf.vercel.app).
   * Provider memasang izin lintas-asal berdasarkan ini — tanpa dikirim saat
   * sesi dibuat, browser akan diblokir CORS waktu mengunggah.
   */
  origin: string;
};

export type ResumableUpload = {
  /**
   * URL sekali pakai untuk file ini saja. Boleh dikirim ke browser: dia
   * tidak memberi akses ke file lain dan tidak mengandung token akun.
   */
  uploadUrl: string;
};

export type StoredFile = {
  /** ID file di sisi provider. Disimpan di kolom documents.drive_file_id. */
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  /** Link untuk dibuka manual di UI provider, kalau ada. */
  webLink: string | null;
  /**
   * ID folder induk. Hanya diisi oleh getFile — dipakai untuk memastikan
   * file yang dilaporkan browser memang mendarat di folder yang kita minta.
   */
  parentIds?: string[];
};

export type DownloadResult = {
  stream: Readable;
  mimeType: string;
  name: string;
};

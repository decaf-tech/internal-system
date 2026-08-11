// Tipe & konstanta seputar dokumen.
//
// Sengaja dipisah dari paths.ts (server-only) dan dari file "use server":
// file "use server" cuma boleh mengekspor fungsi async, jadi konstanta
// seperti batas ukuran file tidak bisa tinggal di sana. Modul ini polos —
// aman diimpor dari server maupun browser.

/** Entitas yang ditempeli sebuah dokumen. */
export type DocumentLink = {
  clientId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  expenseId?: string | null;
  noteId?: string | null;
  eventId?: string | null;
};

/** Sasaran unggahan: sebuah folder di penjelajah berkas, atau sebuah entitas. */
export type UploadTarget =
  | { kind: "folder"; folderId: string | null }
  | { kind: "link"; link: DocumentLink };

/**
 * Batas keras ukuran file. Bukan batas teknis — byte-nya tidak lewat
 * server kita — melainkan rem supaya satu file tidak menghabiskan kuota
 * 15GB Drive tim. Naikkan kalau memang perlu simpan video.
 */
export const MAX_FILE_BYTES = 512 * 1024 * 1024;

/**
 * Batas jalur cadangan (upload lewat server kita). Vercel memotong body
 * request serverless di 4.5MB, dan Next.js memotong body Server Action di
 * `serverActions.bodySizeLimit` — lihat next.config.ts. Angka di sini harus
 * lebih kecil dari keduanya.
 */
export const MAX_FALLBACK_BYTES = 4 * 1024 * 1024;

export function formatLimit(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

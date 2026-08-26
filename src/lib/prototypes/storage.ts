import "server-only";

import { createReadStream } from "node:fs";
import { readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { prototypesDir } from "@/lib/env";

/**
 * Isi prototipe di disk server.
 *
 * BUKAN lewat `StorageProvider`/Google Drive, dan itu disengaja — alasan
 * lengkapnya di kepala `supabase/migrations/014_prototipe.sql`. Ringkasnya:
 * prototipe adalah barang sekali pakai yang selalu bisa diunggah ulang,
 * dan menyajikan ratusan aset kecil sebuah situs lewat Drive berarti satu
 * panggilan ke server Google per aset, per pengunjung.
 *
 * Folder dinamai `id`, bukan `slug`: slug boleh diganti kapan saja, dan
 * penggantian nama yang harus ikut memindahkan folder adalah operasi yang
 * bisa gagal separuh jalan.
 */
export function prototypeDir(id: string): string {
  return path.join(prototypesDir(), id);
}

/**
 * Ubah path yang diminta pengunjung jadi path absolut di dalam folder
 * prototipe — atau `null` kalau hasilnya keluar dari folder itu.
 *
 * Ini pagar path traversal, dan ia bekerja dengan MENGHITUNG hasil
 * akhirnya, bukan dengan mencari pola mencurigakan di masukannya. Daftar
 * hitam (menolak "..", menolak "%2e%2e", …) selalu kalah cepat dari cara
 * baru menuliskan hal yang sama; `path.resolve` sebaliknya sudah
 * menyelesaikan setiap "..", setiap garis miring ganda, setiap segmen
 * kosong, dan yang tersisa untuk diperiksa cuma satu pertanyaan: apakah
 * hasilnya masih di dalam folder yang boleh dibaca?
 *
 * Pemeriksaannya memakai `path.relative` dan bukan `startsWith(dir)` —
 * `startsWith` menganggap `/data/proto-jahat` ada di dalam `/data/proto`.
 */
export function resolveAssetPath(id: string, requestPath: string): string | null {
  const root = path.resolve(prototypeDir(id));

  // `decodeURIComponent` bisa melempar untuk persentase yang cacat
  // (mis. "%zz"). Permintaan seperti itu bukan aset yang ada.
  let decoded: string;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch {
    return null;
  }

  // NUL memutus string saat sampai di syscall, jadi sebuah path bisa
  // terlihat aman di sini tapi berarti lain di kernel.
  if (decoded.includes("\0")) return null;

  const target = path.resolve(root, `.${path.posix.sep}${decoded}`);

  const relative = path.relative(root, target);
  const escapes =
    relative.startsWith("..") || path.isAbsolute(relative);

  return escapes ? null : target;
}

/** Berkas yang benar-benar ada dan memang berkas (bukan folder). */
async function isFile(absolutePath: string): Promise<boolean> {
  try {
    return (await stat(absolutePath)).isFile();
  } catch {
    return false;
  }
}

export type ResolvedAsset = {
  absolutePath: string;
  /** Path relatif terhadap akar prototipe — dipakai menentukan MIME. */
  relativePath: string;
  sizeBytes: number;
};

/**
 * Cari berkas yang harus dilayani untuk sebuah permintaan.
 *
 * Mengikuti kebiasaan hosting statis: sebuah path yang menunjuk folder
 * dilayani dengan `index.html` di dalamnya, sehingga tautan seperti
 * `/tentang/` tetap bekerja tanpa prototipe perlu tahu ia sedang disajikan
 * dari mana.
 */
export async function findAsset(
  id: string,
  requestPath: string,
): Promise<ResolvedAsset | null> {
  const candidates = requestPath.endsWith("/")
    ? [`${requestPath}index.html`]
    : [requestPath, `${requestPath}/index.html`];

  for (const candidate of candidates) {
    const absolutePath = resolveAssetPath(id, candidate);
    if (!absolutePath) return null;
    if (!(await isFile(absolutePath))) continue;

    return {
      absolutePath,
      relativePath: candidate.replace(/^\/+/, ""),
      sizeBytes: (await stat(absolutePath)).size,
    };
  }

  return null;
}

/** Baca berkas kecil (HTML) utuh — perlu utuh karena isinya disunting. */
export function readAsset(absolutePath: string): Promise<Buffer> {
  return readFile(absolutePath);
}

/** Aliran untuk berkas yang dilewatkan apa adanya (gambar, js, font). */
export function assetStream(absolutePath: string) {
  return createReadStream(absolutePath);
}

/** Buang seluruh isi sebuah prototipe. Aman dipanggil kalau sudah tidak ada. */
export async function removePrototypeFiles(id: string): Promise<void> {
  await rm(prototypeDir(id), { recursive: true, force: true });
}

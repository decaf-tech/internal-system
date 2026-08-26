import "server-only";

import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { unzipSync } from "fflate";
import { prototypesDir } from "@/lib/env";
import { prototypeDir } from "./storage";
import {
  DEFAULT_ENTRY_POINT,
  MAX_EXTRACTED_BYTES,
  MAX_FILE_COUNT,
  type ExtractResult,
} from "./types";

/**
 * Kesalahan yang pesannya memang untuk dibaca orang yang mengunggah,
 * bukan untuk log. Route pemanggilnya mengirim `message`-nya apa adanya.
 */
export class PrototypeZipError extends Error {}

/**
 * Bongkar zip hasil build ke folder prototipe.
 *
 * `fflate` dipilih karena murni JavaScript, tanpa native binding — image
 * Docker-nya berbasis glibc dan pengalaman dengan `sharp` (PRD v3.4 §6.5)
 * sudah cukup jadi alasan untuk tidak menambah binding baru.
 *
 * Yang lebih penting: `unzipSync` mengembalikan PETA path→byte, dan yang
 * menulis ke disk adalah kode di bawah ini. Tidak ada library yang pernah
 * memegang kendali penulisan, jadi tidak ada versi library yang bisa
 * menaruh berkas di tempat yang tidak kita setujui — riwayat CVE
 * "zip slip" di pustaka-pustaka ekstraksi hampir seluruhnya lahir dari
 * penyerahan langkah itu.
 */
export async function extractPrototypeZip(
  id: string,
  zip: Buffer,
): Promise<ExtractResult> {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(new Uint8Array(zip));
  } catch (error) {
    console.error("Gagal membaca zip prototipe:", error);
    throw new PrototypeZipError(
      "Berkasnya tidak bisa dibaca sebagai zip. Pastikan yang diunggah benar-benar file .zip, bukan .rar atau .7z.",
    );
  }

  const files = collectFiles(entries);
  if (files.length === 0) {
    throw new PrototypeZipError("Zip-nya kosong — tidak ada berkas di dalamnya.");
  }

  const prefix = commonWrapperFolder(files.map(([name]) => name));
  const flattened = prefix
    ? files.map(
        ([name, bytes]) => [name.slice(prefix.length), bytes] as const,
      )
    : files;

  const entryPoint = findEntryPoint(flattened.map(([name]) => name));
  if (!entryPoint) {
    throw new PrototypeZipError(
      `Tidak ada ${DEFAULT_ENTRY_POINT} di dalam zip. Yang diunggah harus HASIL BUILD (folder berisi ${DEFAULT_ENTRY_POINT} — biasanya "dist" atau "build"), bukan folder proyeknya.`,
    );
  }

  // Dirakit di folder sementara dulu, baru dipindahkan sekali jadi. Kalau
  // ekstraksi gagal separuh jalan — kehabisan ruang, zip cacat di entry
  // ke-200 — yang lama tetap utuh melayani pengunjung, dan tidak pernah
  // ada baris basis data yang menunjuk folder setengah jadi.
  //
  // Foldernya bertetangga dengan tujuan akhirnya, bukan di /tmp: `rename`
  // hanya atomik di dalam satu filesystem, dan /tmp di container sering
  // filesystem yang berbeda dari volume data.
  await mkdir(prototypesDir(), { recursive: true });
  const staging = await mkdtemp(path.join(prototypesDir(), `.staging-${id}-`));

  try {
    let sizeBytes = 0;

    for (const [name, bytes] of flattened) {
      sizeBytes += bytes.byteLength;
      if (sizeBytes > MAX_EXTRACTED_BYTES) {
        throw new PrototypeZipError(
          `Isi zip melebihi ${Math.round(MAX_EXTRACTED_BYTES / 1024 / 1024)}MB setelah dibuka.`,
        );
      }

      const target = safeJoin(staging, name);
      if (!target) {
        // Entry yang menunjuk ke luar folder tujuan. Zip normal tidak
        // pernah punya ini — yang punya, dibuat untuk menimpa berkas di
        // luar sana.
        throw new PrototypeZipError(
          `Zip berisi jalur berkas yang tidak sah: ${name}`,
        );
      }

      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, bytes);
    }

    // Ganti isi lama dengan yang baru. Dua langkah ini adalah satu-satunya
    // jendela ketika prototipe tidak bisa dilayani, dan lebarnya cuma
    // selama satu `rename`.
    await rm(prototypeDir(id), { recursive: true, force: true });
    await rename(staging, prototypeDir(id));

    return { entryPoint, fileCount: flattened.length, sizeBytes };
  } catch (error) {
    await rm(staging, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

/**
 * Saring peta entry jadi daftar berkas yang layak ditulis.
 *
 * Yang dibuang: entry folder (fflate menandainya dengan panjang 0 dan
 * nama berakhiran "/"), berkas metadata yang diselipkan pengarsip macOS,
 * dan berkas tersembunyi seperti .DS_Store — semuanya tidak pernah jadi
 * bagian dari situs yang disajikan, tapi ikut menghabiskan jatah jumlah
 * berkas dan mengacaukan deteksi folder pembungkus di bawah.
 */
function collectFiles(
  entries: Record<string, Uint8Array>,
): (readonly [string, Uint8Array])[] {
  const files: (readonly [string, Uint8Array])[] = [];

  for (const [rawName, bytes] of Object.entries(entries)) {
    const name = rawName.replace(/\\/g, "/");

    if (name.endsWith("/")) continue;
    if (name.startsWith("__MACOSX/")) continue;

    const base = name.split("/").pop() ?? "";
    if (base === "" || base === ".DS_Store" || base.startsWith("._")) continue;

    files.push([name, bytes] as const);

    if (files.length > MAX_FILE_COUNT) {
      throw new PrototypeZipError(
        `Zip berisi lebih dari ${MAX_FILE_COUNT} berkas.`,
      );
    }
  }

  return files;
}

/**
 * Kalau SEMUA berkas berada di bawah satu folder yang sama, kembalikan
 * nama folder itu (berikut garis miringnya) supaya isinya bisa diratakan.
 *
 * Ini menutup selisih antara "zip hasil build" dan "zip yang dibuat orang".
 * Mengarsipkan folder `dist` lewat klik kanan di Finder atau Explorer
 * menghasilkan zip yang isinya `dist/index.html`, bukan `index.html` —
 * dan tanpa perataan ini, setiap unggahan yang dibuat dengan cara paling
 * wajar akan ditolak karena "tidak ada index.html".
 */
function commonWrapperFolder(names: string[]): string | null {
  const firstSegment = names[0].split("/")[0];

  // Berkas di akar zip berarti tidak ada pembungkus tunggal.
  if (!names[0].includes("/")) return null;
  if (!names.every((name) => name.startsWith(`${firstSegment}/`))) return null;

  return `${firstSegment}/`;
}

/**
 * Halaman pembukanya. Yang di akar menang; kalau tidak ada, sebuah
 * `index.html` yang paling dangkal letaknya dipakai — zip yang isinya
 * `web/index.html` tetap bisa dilayani alih-alih ditolak.
 */
function findEntryPoint(names: string[]): string | null {
  if (names.includes(DEFAULT_ENTRY_POINT)) return DEFAULT_ENTRY_POINT;

  const candidates = names
    .filter((name) => name.endsWith(`/${DEFAULT_ENTRY_POINT}`))
    .sort((a, b) => a.split("/").length - b.split("/").length);

  return candidates[0] ?? null;
}

/**
 * Gabungkan nama entry ke folder tujuan, atau null kalau hasilnya keluar.
 * Sama seperti `resolveAssetPath` di storage.ts: yang diperiksa hasil
 * akhirnya, bukan pola di masukannya.
 */
function safeJoin(root: string, name: string): string | null {
  if (name.includes("\0")) return null;

  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, `.${path.posix.sep}${name}`);
  const relative = path.relative(resolvedRoot, target);

  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }

  return target;
}

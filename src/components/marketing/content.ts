import type { StaticImageData } from "next/image";
import abiPhoto from "../../../public/brand/team/abi.webp";
import fauzanPhoto from "../../../public/brand/team/fauzan.webp";

/**
 * Data situs publik yang TIDAK berubah mengikuti bahasa: alamat kontak
 * dan daftar tim.
 *
 * Seluruh kalimatnya ada di `copy-id.ts` / `copy-en.ts`; lihat `copy.ts`
 * untuk bentuk dan alasannya. Kontak yang dipajang situs cuma LinkedIn:
 * setiap ajakan menuju form sesi discovery atau ke sana.
 */

export const CONTACT = {
  email: "nafidzabiyyu@gmail.com",
  linkedin: "linkedin.com/in/nafidz-abiyyu-h-09660a15a",
  linkedinUrl: "https://www.linkedin.com/in/nafidz-abiyyu-h-09660a15a",
} as const;

/**
 * Halaman `/tim`, berurutan seperti tampil di kisi. Perannya ada di
 * `team.roles` tiap berkas copy, dikunci `id`: menambah orang di sini
 * tanpa menambah perannya di kedua bahasa ditolak kompiler.
 *
 * Fotonya potret setengah badan, latar dihapus (WebP transparan, lebar
 * 900px), dibingkai seragam: kepala di atas, bahu memenuhi lebar foto.
 * Halamannya bergantung penuh pada keseragaman itu.
 */
export type TeamMember = {
  id: string;
  name: string;
  linkedinUrl: string;
  photo: StaticImageData;
};

export const TEAM = [
  {
    id: "abi",
    name: "Abi",
    linkedinUrl: CONTACT.linkedinUrl,
    photo: abiPhoto,
  },
  {
    id: "fauzan",
    name: "Fauzan",
    linkedinUrl: "https://www.linkedin.com/in/fauzan-kamil-03b95b267",
    photo: fauzanPhoto,
  },
] as const satisfies readonly TeamMember[];

export type TeamMemberId = (typeof TEAM)[number]["id"];

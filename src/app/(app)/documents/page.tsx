import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { getStorage, type StorageQuota } from "@/lib/storage";
import type { Folder } from "@/lib/types";
import { FileBrowser, type BrowserDocument } from "./file-browser";

export default async function DocumentsPage({
  searchParams,
}: PageProps<"/documents">) {
  const params = await searchParams;
  const raw = params.folder;
  const folderId = typeof raw === "string" && raw.length > 0 ? raw : null;

  const supabase = await createClient();

  // Ketiganya berangkat bersamaan. Kuota Drive dulu ditunggu sendirian di
  // atas blok ini, jadi setiap kali halaman arsip dibuka, seluruh query
  // Supabase antre di belakang satu panggilan ke server Google — padahal
  // hasilnya cuma indikator sisa ruang di pojok layar.
  const [foldersResult, documentsResult, quota] = await Promise.all([
    // Seluruh pohon folder, sekali jalan. Isinya folder yang dibuat manual
    // oleh tim bertiga — puluhan baris berisi teks pendek — dan mengambil
    // semuanya sekaligus jauh lebih murah daripada menyusuri induknya
    // selapis demi selapis lewat jaringan (lihat perakitan breadcrumb di
    // bawah).
    supabase.from("folders").select("*").order("name"),
    supabase
      .from("documents")
      .select(
        `*,
         uploader:profiles!documents_uploaded_by_fkey(full_name),
         client:clients(id, name)`,
      )
      // `is` untuk null, `eq` untuk id — PostgREST membedakan keduanya.
      [folderId ? "eq" : "is"]("folder_id", folderId)
      .order("created_at", { ascending: false }),
    // Kuota murni informatif — kalau Drive lagi bermasalah, jangan sampai
    // seluruh halaman ikut gagal cuma karena indikator ini.
    getStorage()
      .getQuota()
      .catch((error) => {
        console.error("Gagal membaca kuota Google Drive:", error);
        return null;
      }) as Promise<StorageQuota | null>,
  ]);

  const allFolders = (foldersResult.data ?? []) as Folder[];
  const folderById = new Map(allFolders.map((folder) => [folder.id, folder]));

  const currentFolder = folderId ? (folderById.get(folderId) ?? null) : null;
  const folders = allFolders.filter((folder) => folder.parent_id === folderId);

  // Jejak folder dari root sampai yang sedang dibuka. Dirakit dari peta di
  // memori, bukan satu query per tingkat seperti sebelumnya: folder tiga
  // tingkat dalam berarti tiga perjalanan bolak-balik ke Supabase yang
  // harus berurutan — tidak bisa diparalelkan, karena induk berikutnya baru
  // diketahui setelah yang sekarang terbaca.
  //
  // Batas 20 tetap dipertahankan sebagai penjaga: kalau suatu saat ada
  // baris yang parent_id-nya melingkar, halaman ini berhenti, bukan
  // menggantung selamanya.
  const breadcrumb: Folder[] = [];
  let cursor: Folder | null = currentFolder;
  for (let depth = 0; cursor && depth < 20; depth += 1) {
    breadcrumb.unshift(cursor);
    cursor = cursor.parent_id
      ? (folderById.get(cursor.parent_id) ?? null)
      : null;
  }

  return (
    <>
      <PageHeader
        eyebrow="04 · Arsip"
        title="Dokumen"
        description="Simpan apa saja, susun sesukamu. Semua tersimpan di Google Drive tim."
      />

      <FileBrowser
        currentFolder={currentFolder}
        breadcrumb={breadcrumb}
        folders={folders}
        documents={(documentsResult.data ?? []) as unknown as BrowserDocument[]}
        quota={quota}
      />
    </>
  );
}

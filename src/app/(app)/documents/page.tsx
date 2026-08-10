import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import type { Folder } from "@/lib/types";
import { FileBrowser, type BrowserDocument } from "./file-browser";

export default async function DocumentsPage({
  searchParams,
}: PageProps<"/documents">) {
  const params = await searchParams;
  const raw = params.folder;
  const folderId = typeof raw === "string" && raw.length > 0 ? raw : null;

  const supabase = await createClient();

  const [currentResult, foldersResult, documentsResult] = await Promise.all([
    folderId
      ? supabase.from("folders").select("*").eq("id", folderId).single()
      : Promise.resolve({ data: null }),
    supabase
      .from("folders")
      .select("*")
      // `is` untuk null, `eq` untuk id — PostgREST membedakan keduanya.
      [folderId ? "eq" : "is"]("parent_id", folderId)
      .order("name"),
    supabase
      .from("documents")
      .select(
        `*,
         uploader:profiles!documents_uploaded_by_fkey(full_name),
         client:clients(id, name)`,
      )
      [folderId ? "eq" : "is"]("folder_id", folderId)
      .order("created_at", { ascending: false }),
  ]);

  const currentFolder = (currentResult.data ?? null) as Folder | null;

  // Rangkai jejak folder dari root sampai folder yang sedang dibuka,
  // supaya breadcrumb bisa menampilkan seluruh jalurnya.
  const breadcrumb: Folder[] = [];
  if (currentFolder) {
    let cursor: Folder | null = currentFolder;
    for (let depth = 0; cursor && depth < 20; depth += 1) {
      breadcrumb.unshift(cursor);
      if (!cursor.parent_id) break;
      const { data } = await supabase
        .from("folders")
        .select("*")
        .eq("id", cursor.parent_id)
        .single();
      cursor = (data ?? null) as Folder | null;
    }
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
        folders={(foldersResult.data ?? []) as Folder[]}
        documents={(documentsResult.data ?? []) as unknown as BrowserDocument[]}
      />
    </>
  );
}

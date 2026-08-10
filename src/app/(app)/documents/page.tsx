import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader } from "@/components/page-header";
import { formatDate, formatFileSize } from "@/lib/format";
import type { Document } from "@/lib/types";

type DocumentRow = Document & {
  client: { id: string; name: string } | null;
  uploader: { full_name: string } | null;
};

export default async function DocumentsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("documents")
    .select(
      `*,
       client:clients(id, name),
       uploader:profiles!documents_uploaded_by_fkey(full_name)`,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const documents = (data ?? []) as unknown as DocumentRow[];

  return (
    <>
      <PageHeader
        eyebrow="04 · Arsip"
        title="Semua Dokumen"
        description="File tersimpan di Google Drive tim; halaman ini indeks pencariannya."
      />

      {documents.length === 0 ? (
        <EmptyState
          title="Belum ada dokumen"
          description="Unggah dokumen dari halaman klien atau catatan pengeluaran — file akan otomatis dirapikan ke folder Drive yang sesuai."
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-2xl text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-muted">
                <Th>Nama File</Th>
                <Th>Klien</Th>
                <Th>Ukuran</Th>
                <Th>Diunggah</Th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-line last:border-b-0">
                  <td className="px-3 py-2.5">
                    <a
                      href={`/api/documents/${doc.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-accent hover:underline"
                    >
                      {doc.name}
                    </a>
                  </td>
                  <td className="px-3 py-2.5 text-ink-muted">
                    {doc.client ? (
                      <Link
                        href={`/clients/${doc.client.id}`}
                        className="hover:text-accent hover:underline"
                      >
                        {doc.client.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-ink-subtle">
                    {formatFileSize(doc.size_bytes)}
                  </td>
                  <td className="px-3 py-2.5 text-ink-muted">
                    {formatDate(doc.created_at)}
                    {doc.uploader && ` · ${doc.uploader.full_name}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="eyebrow px-3 py-2.5 font-normal">{children}</th>;
}

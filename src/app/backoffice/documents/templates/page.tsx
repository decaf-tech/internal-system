import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { getTemplateDocs } from "@/lib/storage";
import type { DocumentTemplate } from "@/lib/types";
import { DocumentTabs } from "../tabs";
import { templateSourceChoices } from "./actions";
import { TemplateManager } from "./template-manager";

export default async function TemplatesPage() {
  const supabase = await createClient();

  const [{ data }, sources] = await Promise.all([
    supabase
      .from("document_templates")
      .select("*")
      .order("name"),
    templateSourceChoices(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="04 · Arsip"
        title="Template Dokumen"
        description="Invoice, penawaran, kontrak, berita acara — semuanya lahir dari template Google Docs yang sudah terisi data klien & project."
      />

      <DocumentTabs active="/backoffice/documents/templates" />

      <TemplateManager
        templates={(data ?? []) as DocumentTemplate[]}
        sources={sources}
        // Kalau penyimpanan yang aktif tidak bisa mengurus dokumen
        // template, halamannya menjelaskan itu alih-alih menampilkan form
        // yang setiap kirimannya pasti gagal.
        supported={getTemplateDocs() !== null}
      />
    </>
  );
}

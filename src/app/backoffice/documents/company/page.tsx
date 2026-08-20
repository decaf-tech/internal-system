import { PageHeader } from "@/components/page-header";
import { getCompanySettings } from "@/lib/company";
import { DocumentTabs } from "../tabs";
import { CompanyForm } from "./company-form";

export default async function CompanySettingsPage() {
  const settings = await getCompanySettings();

  return (
    <>
      <PageHeader
        eyebrow="04 · Arsip"
        title="Identitas Perusahaan"
        description="Nama, alamat, dan rekening yang otomatis terisi di dokumen dari template — invoice, penawaran, kontrak."
      />

      <DocumentTabs active="/backoffice/documents/company" />

      <section className="card max-w-2xl p-5">
        <CompanyForm settings={settings} />
      </section>
    </>
  );
}

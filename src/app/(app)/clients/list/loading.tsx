import {
  SkeletonCardGrid,
  SkeletonPageHeader,
  SkeletonStatGrid,
} from "@/components/skeleton";
import { ClientTabs } from "../tabs";
import { CLIENT_STAT_LABELS } from "../stats";

export default function ClientsListLoading() {
  return (
    <>
      <SkeletonPageHeader
        eyebrow="01 · Klien"
        title="Daftar Klien"
        description="Siapa saja yang sedang, akan, dan pernah kita kerjakan."
      />
      {/* Tabnya digambar utuh, bukan sebagai rangka: mana yang aktif sudah
          diketahui dari rutenya sendiri, jadi tidak ada gunanya menunggu
          database untuk menggambar dua tautan yang isinya konstanta. */}
      <ClientTabs active="/clients/list" />
      <SkeletonStatGrid labels={CLIENT_STAT_LABELS} />
      <SkeletonCardGrid count={6} />
    </>
  );
}

import {
  SkeletonPageHeader,
  SkeletonRowCard,
  SkeletonStatGrid,
} from "@/components/skeleton";
import { FinanceTabs } from "../tabs";

export default function ExpensesLoading() {
  return (
    <>
      <SkeletonPageHeader
        eyebrow="03 · Keuangan"
        title="Pengeluaran & Reimburse"
        description="Catatan pengeluaran tim beserta struknya."
      />

      <FinanceTabs active="/backoffice/finance/expenses" />

      <SkeletonStatGrid
        labels={[
          "Menunggu Persetujuan",
          "Total Bulan Ini",
          "Kas Keluar Bulan Ini",
        ]}
        className="grid-cols-2 sm:grid-cols-3"
      />

      <SkeletonRowCard rows={5} />
    </>
  );
}

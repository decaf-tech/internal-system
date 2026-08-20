import {
  SkeletonPageHeader,
  SkeletonRowCard,
  SkeletonStatGrid,
} from "@/components/skeleton";
import { FinanceTabs } from "../tabs";

export default function IncomeLoading() {
  return (
    <>
      <SkeletonPageHeader
        eyebrow="03 · Keuangan"
        title="Pemasukan"
        description="Deal yang sudah disepakati, ditagih, dan yang uangnya sudah masuk."
      />

      <FinanceTabs active="/backoffice/finance/income" />

      <SkeletonStatGrid
        labels={["Total Diterima", "Menunggu Masuk", "Lewat Jatuh Tempo"]}
        className="grid-cols-2 sm:grid-cols-3"
      />

      <SkeletonRowCard rows={5} />
    </>
  );
}

import { SkeletonPageHeader, SkeletonStatGrid } from "@/components/skeleton";
import { ClientTabs } from "./tabs";
import { CLIENT_STAT_LABELS } from "./stats";

export default function ClientsPipelineLoading() {
  return (
    <>
      <SkeletonPageHeader
        eyebrow="01 · Klien"
        title="Pipeline Prospek"
        description="Calon klien dari perkenalan sampai deal — atau sampai batal."
      />
      <ClientTabs active="/clients" />
      <SkeletonStatGrid labels={CLIENT_STAT_LABELS} />
      <div className="h-64 rounded-lg border border-line bg-surface-muted" />
    </>
  );
}

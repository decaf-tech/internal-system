import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import type { PrototypeWithRelations } from "@/lib/prototypes/types";
import { DocumentTabs } from "../tabs";
import { PrototypeManager } from "./prototype-manager";

export default async function PrototypesPage() {
  const supabase = await createClient();

  const [{ data }, { data: clients }, origin] = await Promise.all([
    supabase
      .from("prototypes")
      .select(
        `*,
         client:clients(id, name),
         uploader:profiles!prototypes_uploaded_by_fkey(full_name)`,
      )
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").order("name"),
    publicOrigin(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="04 · Arsip"
        title="Prototipe"
        description="Jatuhkan zip hasil build, dapat satu tautan untuk dikirim ke calon klien — lengkap dengan tanda Decaf di pojoknya."
      />

      <DocumentTabs active="/backoffice/documents/prototypes" />

      <PrototypeManager
        prototypes={(data ?? []) as PrototypeWithRelations[]}
        clients={(clients ?? []) as { id: string; name: string }[]}
        origin={origin}
      />
    </>
  );
}

/**
 * Asal alamat untuk merangkai tautan yang disalin tim.
 *
 * Dibaca dari header permintaan, bukan dari env var: aplikasinya dibuka
 * lewat decaf.id di produksi dan localhost saat dikembangkan, dan tautan
 * yang disalin harus cocok dengan yang sedang dipakai — tautan produksi
 * yang muncul di layar developer adalah tautan yang tidak bisa diuji.
 *
 * `x-forwarded-proto` diperiksa karena Cloudflare Tunnel yang menghadap
 * internet, bukan container-nya (PRD v3.4 §6.1): dari dalam sini
 * permintaannya tiba sebagai http, dan tautan http ke decaf.id akan
 * dipentalkan browser.
 */
async function publicOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return "";

  const proto =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");

  return `${proto}://${host}`;
}

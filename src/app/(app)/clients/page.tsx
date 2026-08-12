import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { todayJakarta } from "@/lib/format";
import type { Member, ProspectWithRelations } from "@/lib/types";
import { ClientTabs } from "./tabs";
import { ClientStatStrip, loadClientStats } from "./stats";
import { NewProspectButton, ProspectBoard } from "./prospect-board";

/**
 * Tab Pipeline — landing halaman klien.
 *
 * Pipeline jadi tab default, bukan daftar klien yang sebelumnya satu-satunya
 * isi halaman ini: pipeline adalah tempat kerja aktif (follow-up dicek tiap
 * hari), daftar klien lebih ke arsip yang dibuka saat butuh. (PRD v3.0 §2.4)
 */
export default async function ClientsPipelinePage() {
  const supabase = await createClient();

  const [prospectsResult, membersResult, userResult, stats] = await Promise.all([
    supabase
      .from("prospects")
      // `profiles` ditunjuk dua kali dari tabel ini (owner_id & created_by),
      // jadi embed-nya harus menyebut nama constraint — tanpa itu PostgREST
      // tidak tahu relasi mana yang dimaksud.
      .select(
        `*,
         owner:profiles!prospects_owner_id_fkey(id, full_name, color),
         client:clients(id, name)`,
      )
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, color").order("full_name"),
    supabase.auth.getUser(),
    loadClientStats(supabase),
  ]);

  // Tabelnya mungkin belum ada (migration 008 dijalankan manual di SQL
  // Editor) — papannya tetap tampil kosong, bukan halaman error.
  const prospects = (prospectsResult.data ?? []) as unknown as ProspectWithRelations[];
  const members = (membersResult.data ?? []) as Member[];

  return (
    <>
      <PageHeader
        eyebrow="01 · Klien"
        title="Pipeline Prospek"
        description="Calon klien dari perkenalan sampai deal — atau sampai batal."
        action={
          <NewProspectButton
            members={members}
            currentUserId={userResult.data.user?.id ?? null}
          />
        }
      />

      <ClientTabs active="/clients" />
      <ClientStatStrip stats={stats} />

      <ProspectBoard
        prospects={prospects}
        members={members}
        // Dihitung di server, dalam jam Jakarta: kalau kartu menghitungnya
        // sendiri di browser, sorotan "jatuh tempo" ikut zona waktu mesin
        // yang membukanya — dan berubah saat hidrasi.
        today={todayJakarta()}
        currentUserId={userResult.data.user?.id ?? null}
      />
    </>
  );
}

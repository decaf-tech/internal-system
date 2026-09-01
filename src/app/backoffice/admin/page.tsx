import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/page-header";
import { SkeletonListCard } from "@/components/skeleton";
import { formatDateTime } from "@/lib/format";
import type { ActivityLogWithActor, Profile } from "@/lib/types";
import { MemberRow } from "./admin-ui";
import { InfraPanel } from "./infra-tools";

const ACTIVITY_LIMIT = 150;

export default async function AdminPage({
  searchParams,
}: PageProps<"/backoffice/admin">) {
  const current = await getCurrentUser();
  // Bukan cuma disembunyikan dari menu — kalau ada yang mengetik alamatnya
  // langsung, tetap ditolak di sini. RLS di database juga menjaga sisi
  // tulisnya (lihat migration 005), tapi bacaan log & daftar tim tetap
  // lewat halaman ini, jadi gerbangnya harus ada di render juga.
  if (!current?.profile?.is_super_admin) redirect("/backoffice");

  const params = await searchParams;
  const rawActor = params.actor;
  const actorFilter = typeof rawActor === "string" ? rawActor : null;

  const supabase = await createClient();

  const [membersResult, activityResult] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    (() => {
      let query = supabase
        .from("activity_log")
        .select(`*, actor:profiles(id, full_name)`)
        .order("created_at", { ascending: false })
        .limit(ACTIVITY_LIMIT);
      if (actorFilter) query = query.eq("actor_id", actorFilter);
      return query;
    })(),
  ]);

  const members = (membersResult.data ?? []) as Profile[];
  const activity = (activityResult.data ??
    []) as unknown as ActivityLogWithActor[];

  const activeActor = members.find((member) => member.id === actorFilter);

  return (
    <>
      <PageHeader
        eyebrow="Super Admin"
        title="Dashboard Admin"
        description="Kontrol anggota tim & riwayat aktivitas di seluruh sistem — cuma kamu yang bisa lihat halaman ini."
        action={
          <Link href="/backoffice/admin/analytics" className="btn btn-ghost">
            Analitik Pengunjung →
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-4 lg:col-span-1">
          <h2 className="mb-1 text-base">Anggota Tim</h2>
          <p className="mb-3 text-xs text-ink-subtle">
            Ubah nama & peran orang lain. Peran cuma label — hak akses semua
            orang tetap rata (lihat PRD §2.3).
          </p>
          <ul className="divide-y divide-line">
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isSelf={member.id === current.user.id}
              />
            ))}
          </ul>
        </section>

        {/* `<details>` bawaan, bukan state React: log ini yang paling
            jarang dibuka sekali klik masuk ke halaman ini, jadi dilipat
            bawaan — tetap bisa dibuka tanpa JavaScript. */}
        <details className="card p-4 lg:col-span-2" open={Boolean(activeActor)}>
          <summary className="cursor-pointer text-base select-none">
            Log Aktivitas
          </summary>

          <div className="mt-3">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-ink-subtle">
                {ACTIVITY_LIMIT} aktivitas terbaru
                {activeActor ? ` oleh ${activeActor.full_name}` : " dari semua orang"}
                . Ketuk nama di daftar kiri untuk menyaring per orang.
              </p>
              {activeActor && (
                <Link
                  href="/backoffice/admin"
                  className="text-xs text-accent hover:underline"
                >
                  × Hapus filter {activeActor.full_name}
                </Link>
              )}
            </div>

            {activity.length === 0 ? (
              <EmptyState
                title="Belum ada aktivitas tercatat"
                description="Log ini mulai terisi begitu ada tugas, klien, atau catatan keuangan yang dibuat/diubah."
              />
            ) : (
              <ul className="max-h-[32rem] divide-y divide-line overflow-y-auto">
                {activity.map((entry) => (
                  <li key={entry.id} className="py-2.5 text-sm">
                    <p>
                      <Link
                        href={`/backoffice/admin?actor=${entry.actor_id ?? ""}`}
                        className="font-medium hover:text-accent hover:underline"
                      >
                        {entry.actor?.full_name ?? "Sistem"}
                      </Link>{" "}
                      <span className="text-ink-muted">{entry.summary}</span>
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-ink-subtle">
                      {formatDateTime(entry.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      </div>

      {/* Di balik Suspense karena isinya menunggu dua layanan lain di
          jaringan: keduanya berbatas 4 detik, dan tanpa pembatas ini
          seluruh dashboard admin ikut menunggu selama itu tiap kali dibuka. */}
      <div className="mt-4">
        <Suspense
          fallback={
            <div className="grid gap-4 lg:grid-cols-2">
              <SkeletonListCard title="Kesehatan Server" rows={2} />
              <SkeletonListCard title="Pemantauan Layanan" rows={3} />
            </div>
          }
        >
          <InfraPanel />
        </Suspense>
      </div>
    </>
  );
}

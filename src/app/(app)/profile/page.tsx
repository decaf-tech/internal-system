import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { initials } from "@/lib/format";
import { USER_ROLE_LABEL, type Profile } from "@/lib/types";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const supabase = await createClient();
  const { data: team } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");

  const profile = current.profile as Profile | null;

  return (
    <>
      <PageHeader
        eyebrow="Akun"
        title="Profil Saya"
        description="Perbaiki nama tampilan dan peranmu di tim."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          {profile ? (
            <ProfileForm profile={profile} />
          ) : (
            <p className="text-sm text-danger">
              Baris profil untuk akun ini belum ada. Jalankan migration
              <code className="mx-1 font-mono text-xs">
                002_board_and_calendar.sql
              </code>
              lalu muat ulang halaman.
            </p>
          )}

          <div className="mt-5 border-t border-line pt-4">
            <p className="eyebrow">Email</p>
            <p className="mt-0.5 text-sm">{current.user.email}</p>
            <p className="mt-1 text-xs text-ink-subtle">
              Email dan password diubah lewat dashboard Supabase, bukan dari
              sini.
            </p>
          </div>
        </section>

        <aside className="card h-fit p-5">
          <h2 className="mb-3 text-base">Tim</h2>
          <ul className="space-y-3">
            {(team ?? []).map((member: Profile) => (
              <li key={member.id} className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-soft font-mono text-xs text-forest">
                  {initials(member.full_name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {member.full_name}
                    {member.id === current.user.id && (
                      <span className="ml-1.5 text-xs text-ink-subtle">
                        (kamu)
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-ink-subtle">
                    {USER_ROLE_LABEL[member.role]}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-line pt-3 text-xs text-ink-subtle">
            Tiap orang mengubah namanya sendiri. Kalau ada nama yang masih
            terbaca seperti potongan email, minta orangnya membuka halaman ini.
          </p>
        </aside>
      </div>
    </>
  );
}

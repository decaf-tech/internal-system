import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/page-header";
import { ClientStatusBadge } from "@/components/badge";
import { NewClientButton } from "./client-dialogs";
import type { Client } from "@/lib/types";

type ClientRow = Client & {
  projects: { count: number }[];
  tasks: { count: number }[];
};

export default async function ClientsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("clients")
    .select("*, projects(count), tasks(count)")
    .order("created_at", { ascending: false });

  const clients = (data ?? []) as ClientRow[];

  return (
    <>
      <PageHeader
        eyebrow="01 · Klien"
        title="Daftar Klien"
        description="Siapa saja yang sedang, akan, dan pernah kita kerjakan."
        action={<NewClientButton />}
      />

      {clients.length === 0 ? (
        <EmptyState
          title="Belum ada klien"
          description="Tambahkan klien pertama untuk mulai melacak project dan tugas terkait."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {clients.map((client) => (
            <li key={client.id}>
              <Link
                href={`/clients/${client.id}`}
                className="card block h-full p-4 transition-colors hover:border-line-strong hover:bg-surface-muted"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{client.name}</p>
                    {client.company && (
                      <p className="truncate text-sm text-ink-muted">
                        {client.company}
                      </p>
                    )}
                  </div>
                  <ClientStatusBadge status={client.status} />
                </div>

                <div className="mt-4 flex gap-4 font-mono text-xs text-ink-subtle">
                  <span>{client.projects[0]?.count ?? 0} project</span>
                  <span>{client.tasks[0]?.count ?? 0} tugas</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

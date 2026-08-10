import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientStatusBadge, TaskStatusBadge } from "@/components/badge";
import { DocumentPanel } from "@/components/document-panel";
import { formatDate } from "@/lib/format";
import type { Client, Document, Project, Task } from "@/lib/types";
import { EditClientButton } from "../client-dialogs";
import { DeleteClientButton } from "./delete-client-button";
import { ProjectSection } from "./project-section";

export default async function ClientDetailPage({
  params,
}: PageProps<"/clients/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const client = data as Client;

  const [{ data: projects }, { data: tasks }, { data: documents }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("tasks")
        .select("*")
        .eq("client_id", id)
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(20),
      supabase
        .from("documents")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
    ]);

  return (
    <>
      <Link
        href="/clients"
        className="eyebrow mb-4 inline-block hover:text-accent"
      >
        ← Semua Klien
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl">{client.name}</h1>
            <ClientStatusBadge status={client.status} />
          </div>
          {client.company && (
            <p className="mt-1 text-sm text-ink-muted">{client.company}</p>
          )}
          <div className="mt-3 h-0.5 w-10 bg-accent" />
        </div>

        <div className="flex gap-2">
          <EditClientButton client={client} />
          <DeleteClientButton clientId={client.id} clientName={client.name} />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ProjectSection
            clientId={client.id}
            projects={(projects ?? []) as Project[]}
          />

          <section className="card p-4">
            <h2 className="mb-3 text-base">Tugas Terkait</h2>
            {!tasks || tasks.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-subtle">
                Belum ada tugas yang ditautkan ke klien ini.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {(tasks as Task[]).map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {task.title}
                    </span>
                    {task.due_date && (
                      <span className="shrink-0 font-mono text-xs text-ink-subtle">
                        {formatDate(task.due_date)}
                      </span>
                    )}
                    <TaskStatusBadge status={task.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <DocumentPanel
            documents={(documents ?? []) as Document[]}
            link={{ clientId: client.id }}
          />
        </div>

        <aside className="card h-fit p-4">
          <h2 className="mb-3 text-base">Kontak</h2>
          <dl className="space-y-3 text-sm">
            <Detail label="Narahubung" value={client.contact_person} />
            <Detail
              label="Email"
              value={client.email}
              href={client.email ? `mailto:${client.email}` : undefined}
            />
            <Detail
              label="Telepon"
              value={client.phone}
              href={
                client.phone
                  ? `https://wa.me/${client.phone.replace(/\D/g, "")}`
                  : undefined
              }
            />
            <Detail label="Ditambahkan" value={formatDate(client.created_at)} />
          </dl>

          {client.notes && (
            <>
              <h2 className="mt-5 mb-2 text-base">Catatan</h2>
              <p className="text-sm whitespace-pre-wrap text-ink-muted">
                {client.notes}
              </p>
            </>
          )}
        </aside>
      </div>
    </>
  );
}

function Detail({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null;
  href?: string;
}) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-0.5">
        {value ? (
          href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="break-words hover:text-accent hover:underline"
            >
              {value}
            </a>
          ) : (
            <span className="break-words">{value}</span>
          )
        ) : (
          <span className="text-ink-subtle">—</span>
        )}
      </dd>
    </div>
  );
}

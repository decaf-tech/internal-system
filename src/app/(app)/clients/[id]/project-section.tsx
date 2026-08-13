"use client";

import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { ConfirmButton, Modal, SubmitButton } from "@/components/modal";
import { ProjectStatusBadge } from "@/components/badge";
import { BillingSchemeFields } from "@/components/billing-fields";
import { DocumentPanel } from "@/components/document-panel";
import { formatDate, formatRupiah } from "@/lib/format";
import {
  BILLING_PERIOD_UNIT,
  CONTRACT_RENEWAL_WARNING_DAYS,
  billingSchedule,
  contractDaysLeft,
  contractEndDate,
  contractValue,
  isSubscription,
  periodCount,
} from "@/lib/billing";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_TRACK_LABEL,
  type Document,
  type Project,
  type ProjectStatus,
} from "@/lib/types";
import {
  createProject,
  deleteProject,
  generateSubscriptionIncomes,
  updateProjectDeal,
  updateProjectStatus,
  type FormState,
} from "../actions";

/**
 * Uang sebuah project, sudah diringkas di server.
 *
 * Tanggal jatuh tempo ikut dibawa, bukan cuma rupiahnya: untuk langganan,
 * "periode mana yang tagihannya belum terbit" adalah pertanyaan yang berbeda
 * dari "sudah masuk berapa rupiah", dan keduanya perlu terjawab di tempat
 * yang sama supaya periode yang terlewat tidak diam-diam hilang.
 *
 * Yang disimpan tanggalnya, bukan sekadar jumlah barisnya: satu project
 * langganan bisa juga punya pemasukan lain (DP, biaya setup), dan menghitung
 * semua baris akan membuat periode yang belum tertagih terlihat sudah
 * tertagih. Tanggal jatuh tempo adalah identitas periode — kunci yang sama
 * yang dipakai `generateSubscriptionIncomes` untuk melewati yang sudah ada.
 */
export type ProjectMoney = {
  received: number;
  dueDates: string[];
};

const NO_MONEY: ProjectMoney = { received: 0, dueDates: [] };

export function ProjectSection({
  clientId,
  projects,
  moneyByProject,
  documents,
  today,
}: {
  clientId: string;
  projects: Project[];
  moneyByProject: Record<string, ProjectMoney>;
  /** Seluruh dokumen klien ini; disaring per project di tiap barisnya. */
  documents: Document[];
  /** Tanggal Jakarta dari server — dasar hitungan sisa kontrak. */
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base">Project</h2>
        <button
          type="button"
          className="btn btn-ghost text-xs"
          onClick={() => setOpen(true)}
        >
          + Project
        </button>
      </div>

      {projects.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-subtle">
          Belum ada project untuk klien ini.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {projects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              clientId={clientId}
              money={moneyByProject[project.id] ?? NO_MONEY}
              today={today}
              documents={documents.filter(
                (doc) => doc.project_id === project.id,
              )}
            />
          ))}
        </ul>
      )}

      <Modal open={open} onClose={close} title="Project Baru">
        <ProjectForm clientId={clientId} today={today} onDone={close} />
      </Modal>
    </section>
  );
}

function ProjectRow({
  project,
  clientId,
  money,
  documents,
  today,
}: {
  project: Project;
  clientId: string;
  money: ProjectMoney;
  documents: Document[];
  today: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{project.name}</p>
          <p className="font-mono text-xs text-ink-subtle">
            {PROJECT_TRACK_LABEL[project.track]}
            {project.target_date && ` · target ${formatDate(project.target_date)}`}
          </p>
          {project.description && (
            <p className="mt-1 text-sm text-ink-muted">{project.description}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ProjectStatusBadge status={project.status} />
          <ConfirmButton
            label="Hapus project"
            disabled={pending}
            className="icon-btn icon-btn-danger"
            title={`Hapus project "${project.name}"?`}
            message="Tugas dan pemasukan yang menempel padanya ikut terlepas."
            onConfirm={() =>
              startTransition(() => deleteProject(project.id, clientId))
            }
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 4.5h10M6.5 4V2.5h3V4M4.5 4.5l.5 9h6l.5-9"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </ConfirmButton>
        </div>
      </div>

      <DealBlock
        project={project}
        clientId={clientId}
        money={money}
        today={today}
      />

      <select
        value={project.status}
        disabled={pending}
        aria-label={`Ubah status project ${project.name}`}
        className="field mt-2 max-w-48 py-1 text-base sm:text-xs"
        onChange={(event) =>
          startTransition(() =>
            updateProjectStatus(
              project.id,
              clientId,
              event.target.value as ProjectStatus,
            ),
          )
        }
      >
        {Object.entries(PROJECT_STATUS_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {/* `clientId` ikut dikirim supaya lampirannya mendarat di
          /Clients/<klien>/<project>/ — folder yang sama dengan di Drive,
          dan yang sama pula dengan yang tampil di /documents. */}
      <DocumentPanel
        documents={documents}
        link={{ projectId: project.id, clientId }}
        title="Lampiran project"
        variant="inline"
        emptyLabel="Belum ada lampiran untuk project ini."
      />
    </li>
  );
}

/**
 * Baris uang sebuah project: nilai deal, berapa yang sudah masuk, sisanya —
 * dan untuk langganan, sekalian jendela kontraknya.
 *
 * Angkanya bisa diubah dari sini karena nilai deal paling sering berubah saat
 * sedang menatap halaman kliennya; membuka form project penuh untuk itu adalah
 * alasan bagus untuk menunda, lalu lupa. Yang dibuka sekarang modal kecil
 * (bukan lagi isian di tempat) karena satu angka tidak lagi cukup sejak ada
 * skema langganan — nilai per periode tanpa periode & durasinya tidak berarti
 * apa-apa.
 */
function DealBlock({
  project,
  clientId,
  money,
  today,
}: {
  project: Project;
  clientId: string;
  money: ProjectMoney;
  today: string;
}) {
  const [editing, setEditing] = useState(false);
  const close = useCallback(() => setEditing(false), []);

  const subscription = isSubscription(project);
  const total = contractValue(project, project.deal_value);

  const editButton = (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="text-accent hover:underline"
    >
      ubah
    </button>
  );

  const dialog = (
    <Modal
      open={editing}
      onClose={close}
      title={`Nilai Deal — ${project.name}`}
    >
      <DealForm project={project} clientId={clientId} today={today} onDone={close} />
    </Modal>
  );

  if (total == null) {
    return (
      <>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-2 text-xs text-accent hover:underline"
        >
          + Isi nilai deal
        </button>
        {dialog}
      </>
    );
  }

  const percent = total > 0 ? Math.min(100, (money.received / total) * 100) : 0;

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-baseline gap-x-2 font-mono text-[11px]">
        <span className="text-ink">{formatRupiah(total)}</span>
        {subscription && project.billing_period && (
          // Nilai penuh kontrak yang jadi angka utama, dan harga per periode
          // yang jadi keterangannya — bukan sebaliknya. Yang ditanyakan saat
          // membaca daftar project adalah "deal ini besarnya berapa".
          <span className="text-ink-subtle">
            {formatRupiah(Number(project.deal_value ?? 0))}/
            {BILLING_PERIOD_UNIT[project.billing_period]} × {periodCount(project)}
          </span>
        )}
        <span className="text-ink-subtle">
          masuk {formatRupiah(money.received)}
          {money.received < total &&
            ` · sisa ${formatRupiah(total - money.received)}`}
        </span>
        {editButton}
      </div>

      <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full rounded-full bg-forest"
          style={{ width: `${percent}%` }}
        />
      </div>

      {subscription && (
        <ContractStatus
          project={project}
          clientId={clientId}
          money={money}
          today={today}
        />
      )}

      {dialog}
    </div>
  );
}

/**
 * Jendela kontrak langganan: kapan mulai, kapan habis, berapa lama lagi, dan
 * berapa periode yang tagihannya belum diterbitkan.
 *
 * Dua hal yang cuma ada di langganan dan tidak punya tempat di baris deal
 * biasa. Yang pertama karena langganan berakhir sendiri — tanpa peringatan,
 * kontrak habis diketahui saat kliennya berhenti membayar. Yang kedua karena
 * tagihan yang tidak pernah diterbitkan tidak muncul di mana pun: tidak di
 * "Belum Diterima", tidak di daftar lewat jatuh tempo.
 */
function ContractStatus({
  project,
  clientId,
  money,
  today,
}: {
  project: Project;
  clientId: string;
  money: ProjectMoney;
  today: string;
}) {
  const endDate = contractEndDate(project.start_date, project);
  const daysLeft = contractDaysLeft(endDate, today);

  // Jadwalnya dihitung ulang di sini dengan rumus yang sama yang dipakai
  // server, dan dicocokkan dengan kunci yang sama (tanggal jatuh tempo) —
  // jadi angka di layar dan jumlah yang akan benar-benar terbit tidak bisa
  // berbeda.
  const schedule = project.start_date
    ? billingSchedule(project.start_date, project)
    : [];
  const taken = new Set(money.dueDates);
  const issued = schedule.filter((item) => taken.has(item.dueDate)).length;
  const missing = schedule.length - issued;

  const expiring =
    daysLeft !== null &&
    daysLeft >= 0 &&
    daysLeft <= CONTRACT_RENEWAL_WARNING_DAYS;
  const expired = daysLeft !== null && daysLeft < 0;

  return (
    <div className="mt-1.5 space-y-1 font-mono text-[10px] text-ink-subtle">
      {project.start_date && endDate ? (
        <p className={expired || expiring ? "text-danger" : undefined}>
          Kontrak {formatDate(project.start_date)} – {formatDate(endDate)}
          {daysLeft !== null && (
            <>
              {" · "}
              {expired
                ? `berakhir ${Math.abs(daysLeft)} hari lalu`
                : daysLeft === 0
                  ? "berakhir hari ini"
                  : `sisa ${daysLeft} hari`}
            </>
          )}
        </p>
      ) : (
        <p className="text-danger">
          Tanggal mulai kontrak belum diisi — jadwal tagihannya belum bisa
          dihitung.
        </p>
      )}

      <p>
        {issued} dari {schedule.length || periodCount(project)} tagihan
        langganan sudah tercatat
      </p>

      {missing > 0 && project.start_date && (
        <GenerateInvoicesButton
          projectId={project.id}
          clientId={clientId}
          missing={missing}
        />
      )}
    </div>
  );
}

function GenerateInvoicesButton({
  projectId,
  clientId,
  missing,
}: {
  projectId: string;
  clientId: string;
  missing: number;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await generateSubscriptionIncomes(projectId, clientId);
            setMessage(
              result.error ??
                (result.created === 0
                  ? "Semua periode sudah punya tagihan."
                  : `${result.created} tagihan diterbitkan.`),
            );
          })
        }
        className="rounded border border-line px-2 py-1 text-[10px] text-accent transition-colors hover:border-line-strong disabled:opacity-40"
      >
        {pending ? "Menerbitkan…" : `Terbitkan ${missing} tagihan langganan`}
      </button>
      {message && <p className="mt-1">{message}</p>}
    </div>
  );
}

function DealForm({
  project,
  clientId,
  today,
  onDone,
}: {
  project: Project;
  clientId: string;
  today: string;
  onDone: () => void;
}) {
  const action = updateProjectDeal.bind(null, project.id, clientId);
  const [state, formAction] = useActionState<FormState, FormData>(action, {
    error: null,
  });
  const [subscription, setSubscription] = useState(isSubscription(project));

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <BillingSchemeFields
        amountName="deal_value"
        amountLabel="Nilai Deal"
        amountHint="Kosongkan kalau angkanya belum ada. Sisa tagihannya terhitung otomatis dari pemasukan yang ditautkan ke project ini."
        initial={{
          amount: project.deal_value,
          billing_type: project.billing_type,
          billing_period: project.billing_period,
          contract_months: project.contract_months,
        }}
        onTypeChange={(type) => setSubscription(type === "subscription")}
      />

      {subscription && (
        <div>
          <label className="label" htmlFor="deal-start">
            Mulai Kontrak <span className="text-accent">*</span>
          </label>
          <input
            id="deal-start"
            name="start_date"
            type="date"
            required
            defaultValue={project.start_date ?? today}
            className="field"
          />
          <p className="mt-1 text-xs text-ink-subtle">
            Jadwal tagihan dan tanggal kontrak berakhir dihitung dari sini.
            Mengubahnya tidak menghapus tagihan yang sudah terbit.
          </p>
        </div>
      )}

      {state.error && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Batal
        </button>
        <SubmitButton>Simpan</SubmitButton>
      </div>
    </form>
  );
}

function ProjectForm({
  clientId,
  today,
  onDone,
}: {
  clientId: string;
  today: string;
  onDone: () => void;
}) {
  const action = createProject.bind(null, clientId);
  const [state, formAction] = useActionState<FormState, FormData>(action, {
    error: null,
  });
  const [subscription, setSubscription] = useState(false);
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="project-name">
          Nama Project <span className="text-accent">*</span>
        </label>
        <input
          id="project-name"
          name="name"
          required
          className="field"
          placeholder="POS & Business Management System"
        />
      </div>

      <div>
        <label className="label" htmlFor="project-description">
          Deskripsi
        </label>
        <textarea
          id="project-description"
          name="description"
          rows={2}
          className="field resize-y"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="project-track">
            Jalur
          </label>
          <select
            id="project-track"
            name="track"
            defaultValue="other"
            className="field"
          >
            {Object.entries(PROJECT_TRACK_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="project-status">
            Status
          </label>
          <select
            id="project-status"
            name="status"
            defaultValue="planning"
            className="field"
          >
            {Object.entries(PROJECT_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <BillingSchemeFields
        amountName="deal_value"
        amountLabel="Nilai Deal"
        amountHint="Boleh dikosongkan dulu. Kalau diisi, sisa tagihannya otomatis terhitung dari pemasukan yang ditautkan ke project ini."
        idPrefix="project-"
        onTypeChange={(type) => {
          setSubscription(type === "subscription");
          // Prasetel hari ini saat skemanya jadi langganan, dan hanya kalau
          // tanggalnya masih kosong — tanpa tanggal mulai, kontrak tidak
          // punya jadwal tagihan maupun tanggal berakhir. Project sekali
          // bayar tidak butuh keduanya, jadi tidak ditebak-tebak.
          if (type === "subscription" && startDate === "") setStartDate(today);
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="project-start">
            {subscription ? (
              <>
                Mulai Kontrak <span className="text-accent">*</span>
              </>
            ) : (
              "Mulai"
            )}
          </label>
          <input
            id="project-start"
            name="start_date"
            type="date"
            required={subscription}
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="project-target">
            Target Selesai
          </label>
          <input
            id="project-target"
            name="target_date"
            type="date"
            className="field"
          />
        </div>
      </div>

      {state.error && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Batal
        </button>
        <SubmitButton>Tambah Project</SubmitButton>
      </div>
    </form>
  );
}

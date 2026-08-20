"use client";

import { useActionState, useEffect, useState } from "react";
import { Modal, SubmitButton } from "@/components/modal";
import { BillingSchemeFields } from "@/components/billing-fields";
import { formatRupiah } from "@/lib/format";
import type { ProspectWithRelations } from "@/lib/types";
import {
  markProspectLost,
  markProspectWon,
  type FormState,
} from "./prospect-actions";

/**
 * Dua gerbang penutup pipeline.
 *
 * Keduanya tinggal di berkas yang sama karena keduanya menjawab pertanyaan
 * yang sama dari sisi papan: "kartu ini diseret ke kolom penutup — apa yang
 * harus ditanyakan dulu?". Papan cuma perlu tahu satu hal (tahap tujuannya),
 * dan tidak ada jalan lain masuk ke Menang/Kalah selain lewat sini —
 * seretan, tombol di modal detail, dan dropdown tahap semuanya bermuara ke
 * dua komponen ini. (PRD v3.0 §2.7)
 */

/**
 * Tandai Kalah — satu kolom yang wajib diisi.
 *
 * Sengaja bukan `ConfirmDialog` dengan `prompt` menyusul: alasan batal
 * adalah isi utama dari aksinya, bukan konfirmasi atasnya. Prospek yang
 * kalah tanpa keterangan tidak menyisakan apa pun untuk dibaca ulang.
 */
export function LoseProspectDialog({
  prospect,
  onClose,
  onDone,
}: {
  prospect: ProspectWithRelations | null;
  onClose: () => void;
  /** Dipanggil hanya kalau tahapnya benar-benar berubah, bukan saat dibatalkan
   *  — papan memakainya untuk ikut menutup modal detail di belakangnya. */
  onDone: () => void;
}) {
  return (
    <Modal open={prospect !== null} onClose={onClose} title="Tandai Kalah">
      {prospect && (
        <LoseForm
          key={prospect.id}
          prospect={prospect}
          onClose={onClose}
          onDone={onDone}
        />
      )}
    </Modal>
  );
}

function LoseForm({
  prospect,
  onClose,
  onDone,
}: {
  prospect: ProspectWithRelations;
  onClose: () => void;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    markProspectLost.bind(null, prospect.id),
    { error: null },
  );

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-ink-muted">
        <span className="font-medium text-ink">{prospect.name}</span> pindah ke
        kolom Kalah. Datanya tetap tersimpan — yang berubah cuma tahapnya.
      </p>

      <div>
        <label className="label" htmlFor="lost_reason">
          Kenapa tidak jadi? <span className="text-accent">*</span>
        </label>
        <textarea
          id="lost_reason"
          name="lost_reason"
          rows={3}
          required
          autoFocus
          defaultValue={prospect.lost_reason ?? ""}
          className="field resize-y"
          placeholder="Harga di atas anggaran, pilih vendor lain, proyeknya ditunda…"
        />
        <p className="mt-1 text-xs text-ink-subtle">
          Satu kalimat cukup. Yang berguna dibaca ulang nanti justru
          alasannya, bukan namanya.
        </p>
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Batal
        </button>
        <SubmitButton className="btn btn-danger">Tandai Kalah</SubmitButton>
      </div>
    </form>
  );
}

/**
 * Tandai Menang — konfirmasi yang menampilkan apa yang akan dibuat sebelum
 * dieksekusi (PRD v3.0 §2.7).
 *
 * "Menampilkan" di sini berarti field yang bisa diperbaiki, bukan sekadar
 * ringkasan yang dibaca: nama klien sering berbeda dari nama prospek (yang
 * satu nama orang, yang satu nama usaha), dan detik ini — saat kliennya baru
 * lahir — adalah saat termurah untuk membetulkannya.
 */
export function WinProspectDialog({
  prospect,
  today,
  onClose,
  onDone,
}: {
  prospect: ProspectWithRelations | null;
  /** Tanggal Jakarta dari server — prasetel tanggal mulai kontrak. */
  today: string;
  onClose: () => void;
  /** Dipanggil hanya kalau tahapnya benar-benar berubah, bukan saat dibatalkan
   *  — papan memakainya untuk ikut menutup modal detail di belakangnya. */
  onDone: () => void;
}) {
  return (
    <Modal open={prospect !== null} onClose={onClose} title="Tandai Menang">
      {prospect && (
        <WinForm
          key={prospect.id}
          prospect={prospect}
          today={today}
          onClose={onClose}
          onDone={onDone}
        />
      )}
    </Modal>
  );
}

function WinForm({
  prospect,
  today,
  onClose,
  onDone,
}: {
  prospect: ProspectWithRelations;
  today: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    markProspectWon.bind(null, prospect.id),
    { error: null },
  );

  // Prasetel menyala: deal yang baru disepakati hampir selalu punya satu
  // lingkup kerja pertama, dan project-lah yang memegang nilai dealnya —
  // tanpa itu angka yang sudah diketik di prospek tidak ke mana-mana.
  const [withProject, setWithProject] = useState(true);

  // Dipantau di sini, bukan cuma di dalam `BillingSchemeFields`: tanggal
  // mulai kontrak di bawah wajib untuk langganan dan opsional untuk sekali
  // bayar, dan hanya form ini yang tahu soal tanggal itu.
  const [subscription, setSubscription] = useState(
    prospect.billing_type === "subscription",
  );

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-md bg-forest-soft px-3 py-2.5 text-sm text-ink-muted">
        <p className="font-medium text-ink">Yang akan dibuat:</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>Klien yang menyertai prospek ini diaktifkan (status jadi Aktif).</li>
          <li>
            {withProject
              ? "Satu project pertama untuk klien itu."
              : "Tanpa project — bisa ditambahkan nanti dari halaman klien."}
          </li>
          <li>Prospek ini tetap ada sebagai riwayat, tautannya sudah ada sejak awal.</li>
        </ul>
      </div>

      <div>
        <label className="label" htmlFor="client_name">
          Nama Klien <span className="text-accent">*</span>
        </label>
        <input
          id="client_name"
          name="client_name"
          required
          defaultValue={prospect.company ?? prospect.name}
          className="field"
        />
        <p className="mt-1 text-xs text-ink-subtle">
          Prasetelnya nama usaha kalau ada, karena itu yang dipakai di
          project dan tagihan. Nama prospek ikut tersimpan sebagai kontaknya.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="create_project"
          checked={withProject}
          onChange={(event) => setWithProject(event.target.checked)}
          className="h-4 w-4"
        />
        Sekalian buat project pertamanya
      </label>

      {withProject && (
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="project_name">
              Nama Project <span className="text-accent">*</span>
            </label>
            <input
              id="project_name"
              name="project_name"
              required
              // Sama dengan prasetel nama klien, bukan nama prospek: project
              // bernama "Pak Budi" terbaca seperti orangnya yang dikerjakan.
              // Yang sebenarnya berguna adalah lingkupnya — makanya ada
              // petunjuk di bawah, bukan tebakan yang lebih pintar di sini.
              defaultValue={prospect.company ?? prospect.name}
              className="field"
            />
            <p className="mt-1 text-xs text-ink-subtle">
              Ganti dengan lingkup kerjanya kalau sudah jelas.
            </p>
          </div>

          {/* Skema & angkanya diprasetel dari prospeknya — yang disepakati
              hari ini adalah kesepakatan yang sama yang ditawar sepanjang
              pipeline, jadi mengetiknya ulang cuma mengundang salah salin. */}
          <BillingSchemeFields
            amountName="deal_value"
            amountLabel="Nilai Deal"
            amountHint={
              prospect.estimated_value != null
                ? `Dari estimasi ${formatRupiah(prospect.estimated_value)}.`
                : "Boleh dikosongkan kalau angkanya belum final."
            }
            initial={{
              amount: prospect.estimated_value,
              billing_type: prospect.billing_type,
              billing_period: prospect.billing_period,
              contract_months: prospect.contract_months,
            }}
            onTypeChange={(type) => setSubscription(type === "subscription")}
          />

          <div>
            <label className="label" htmlFor="start_date">
              {subscription ? (
                <>
                  Mulai Kontrak <span className="text-accent">*</span>
                </>
              ) : (
                "Mulai Dikerjakan"
              )}
            </label>
            <input
              id="start_date"
              name="start_date"
              type="date"
              required={subscription}
              defaultValue={today}
              className="field"
            />
            {subscription && (
              <p className="mt-1 text-xs text-ink-subtle">
                Jadwal tagihan dan tanggal kontrak berakhir dihitung dari sini.
              </p>
            )}
          </div>
        </div>
      )}

      {state.error && (
        <p
          role="alert"
          className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Batal
        </button>
        <SubmitButton pendingLabel="Mengaktifkan klien…">
          Menang — Aktifkan Klien
        </SubmitButton>
      </div>
    </form>
  );
}

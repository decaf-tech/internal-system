"use client";

import { useActionState, useEffect, useState } from "react";
import { SubmitButton } from "@/components/modal";
import {
  PROSPECT_OPEN_STAGES,
  PROSPECT_STAGE_LABEL,
  type Member,
  type Prospect,
  type ProspectStage,
} from "@/lib/types";
import type { FormState } from "./prospect-actions";

/**
 * Form yang dipakai bersama untuk tambah & ubah prospek — bedanya cuma di
 * action yang dioper dan nilai awal field, sama seperti `ClientForm`.
 *
 * Yang wajib cuma nama. Sisanya boleh menyusul: prospek pertama kali dicatat
 * saat baru kenal, dan form yang menuntut nilai deal di detik itu justru
 * membuat orang menundanya ke WhatsApp (PRD v3.0 §2.7).
 */
export function ProspectForm({
  action,
  initial,
  members,
  defaultStage = "prospek",
  defaultOwnerId,
  onDone,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial?: Prospect;
  members: Member[];
  /** Kolom tempat tombol "+" ditekan — prasetel tahap untuk prospek baru. */
  defaultStage?: ProspectStage;
  /** User yang login; prasetel pemilik untuk prospek baru (PRD v3.0 §6-A). */
  defaultOwnerId?: string;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {
    error: null,
  });

  // Dipantau supaya kolom alasan cuma muncul saat memang relevan — field
  // yang selalu tampil tapi jarang dipakai membuat form terasa lebih berat
  // daripada isinya.
  const [stage, setStage] = useState<ProspectStage>(
    initial?.stage ?? defaultStage,
  );

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  /**
   * Menang & Kalah sengaja TIDAK ada di daftar ini.
   *
   * Keduanya bukan sekadar perpindahan tahap: yang satu menuntut alasan,
   * yang satu membuat baris klien baru. Kalau dropdown ini menawarkannya,
   * ada dua jalan masuk dengan dua aturan berbeda ke keadaan yang sama —
   * jadi jalannya cuma satu, lewat tombol "Tandai Menang/Kalah".
   *
   * Tahap penutup yang SEDANG dipakai tetap ikut, kalau tidak prospek yang
   * sudah ditutup tidak bisa diubah datanya tanpa diam-diam dibuka kembali.
   */
  const stageOptions =
    initial && !PROSPECT_OPEN_STAGES.includes(initial.stage)
      ? [...PROSPECT_OPEN_STAGES, initial.stage]
      : PROSPECT_OPEN_STAGES;

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">
          Nama Prospek <span className="text-accent">*</span>
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={initial?.name ?? ""}
          className="field"
          placeholder="Nama orang atau nama usahanya"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="company">
            Perusahaan
          </label>
          <input
            id="company"
            name="company"
            defaultValue={initial?.company ?? ""}
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="stage">
            Tahap
          </label>
          <select
            id="stage"
            name="stage"
            value={stage}
            onChange={(event) => setStage(event.target.value as ProspectStage)}
            className="field"
          >
            {stageOptions.map((value) => (
              <option key={value} value={value}>
                {PROSPECT_STAGE_LABEL[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="contact_phone">
            Telepon / WhatsApp
          </label>
          <input
            id="contact_phone"
            name="contact_phone"
            defaultValue={initial?.contact_phone ?? ""}
            className="field"
            placeholder="+62 822-…"
          />
        </div>
        <div>
          <label className="label" htmlFor="contact_email">
            Email
          </label>
          <input
            id="contact_email"
            name="contact_email"
            type="email"
            defaultValue={initial?.contact_email ?? ""}
            className="field"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="estimated_value">
            Nilai Estimasi
          </label>
          <input
            id="estimated_value"
            name="estimated_value"
            // `text`, bukan `number`: angkanya diketik dengan titik ribuan
            // ala Indonesia ("5.000.000"), dan `parseRupiah` di server yang
            // membacanya. Input number malah menolak titik itu.
            inputMode="numeric"
            // Ditulis balik dengan titik ribuan, bukan "12500000" mentah:
            // yang membuka form ini sedang membaca angkanya, dan deretan
            // digit tanpa pemisah harus dihitung dengan jari.
            defaultValue={
              initial?.estimated_value != null
                ? initial.estimated_value.toLocaleString("id-ID")
                : ""
            }
            className="field"
            placeholder="5.000.000"
          />
          <p className="mt-1 text-xs text-ink-subtle">
            Boleh dikosongkan kalau angkanya belum jelas.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="next_follow_up_date">
            Follow-up Berikutnya
          </label>
          <input
            id="next_follow_up_date"
            name="next_follow_up_date"
            type="date"
            defaultValue={initial?.next_follow_up_date ?? ""}
            className="field"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="owner_id">
          Penanggung Jawab
        </label>
        <select
          id="owner_id"
          name="owner_id"
          defaultValue={initial?.owner_id ?? defaultOwnerId ?? ""}
          className="field"
        >
          <option value="">Belum ditentukan</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.full_name}
            </option>
          ))}
        </select>
      </div>

      {stage === "kalah" && (
        <div>
          <label className="label" htmlFor="lost_reason">
            Alasan Batal <span className="text-accent">*</span>
          </label>
          <textarea
            id="lost_reason"
            name="lost_reason"
            rows={2}
            required
            defaultValue={initial?.lost_reason ?? ""}
            className="field resize-y"
            placeholder="Harga di atas anggaran, pilih vendor lain, proyeknya ditunda…"
          />
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
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Batal
        </button>
        <SubmitButton>
          {initial ? "Simpan Perubahan" : "Tambah Prospek"}
        </SubmitButton>
      </div>
    </form>
  );
}

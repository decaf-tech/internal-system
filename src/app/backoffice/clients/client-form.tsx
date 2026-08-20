"use client";

import { useActionState, useEffect } from "react";
import { SubmitButton } from "@/components/modal";
import { CLIENT_STATUS_LABEL, type Client, type ClientStatus } from "@/lib/types";
import type { FormState } from "./actions";

/**
 * Form yang dipakai bersama untuk tambah & edit klien. Bedanya cuma di
 * action yang dioper dan nilai awal field.
 */
export function ClientForm({
  action,
  initial,
  onDone,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial?: Client;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {
    error: null,
  });

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">
          Nama Klien <span className="text-accent">*</span>
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={initial?.name ?? ""}
          className="field"
          placeholder="Mammo's Home Bakery"
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
          <label className="label" htmlFor="contact_person">
            Narahubung
          </label>
          <input
            id="contact_person"
            name="contact_person"
            defaultValue={initial?.contact_person ?? ""}
            className="field"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={initial?.email ?? ""}
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Telepon / WhatsApp
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={initial?.phone ?? ""}
            className="field"
            placeholder="+62 822-…"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="address">
          Alamat
        </label>
        <textarea
          id="address"
          name="address"
          rows={2}
          defaultValue={initial?.address ?? ""}
          className="field resize-y"
          placeholder="Jl. Pajajaran No. 12, Bogor"
        />
        <p className="mt-1 text-xs text-ink-subtle">
          Dipakai di blok “ditagihkan kepada” dokumen dari template.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="status">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={initial?.status ?? "lead"}
          className="field"
        >
          {Object.entries(CLIENT_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value as ClientStatus}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="notes">
          Catatan
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={initial?.notes ?? ""}
          className="field resize-y"
          placeholder="Konteks bisnis, kebutuhan, hasil diskusi terakhir…"
        />
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
        <SubmitButton>
          {initial ? "Simpan Perubahan" : "Tambah Klien"}
        </SubmitButton>
      </div>
    </form>
  );
}

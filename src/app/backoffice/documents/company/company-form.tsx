"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/modal";
import type { CompanySettings } from "@/lib/company";
import { updateCompanySettings, type FormState } from "./actions";

/**
 * Bisa diubah siapa saja yang login — sama seperti data lain di sistem
 * ini (hak akses rata). Yang paling sering perlu mengubah rekening bank
 * biasanya admin keuangan, dan itu memang skenario yang dituju: dulu ini
 * env var yang cuma bisa diubah lewat redeploy (PRD v3.2), sekarang
 * tinggal buka halaman ini.
 */
export function CompanyForm({ settings }: { settings: CompanySettings }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    updateCompanySettings,
    { error: null },
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            Nama Perusahaan
          </label>
          <input
            id="name"
            name="name"
            defaultValue={settings.name}
            className="field"
            placeholder="Decaf"
          />
        </div>
        <div>
          <label className="label" htmlFor="city">
            Kota
          </label>
          <input
            id="city"
            name="city"
            defaultValue={settings.city}
            className="field"
            placeholder="Bogor"
          />
          <p className="mt-1 text-xs text-ink-subtle">
            Untuk baris tanda tangan: “Bogor, 13 Agustus 2026”.
          </p>
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
          defaultValue={settings.address}
          className="field resize-y"
        />
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
            defaultValue={settings.email}
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Telepon
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={settings.phone}
            className="field"
          />
        </div>
      </div>

      <div className="border-t border-line pt-4">
        <p className="label mb-3">Informasi Pembayaran</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="bank_name">
              Nama Bank
            </label>
            <input
              id="bank_name"
              name="bank_name"
              defaultValue={settings.bankName}
              className="field"
              placeholder="BCA"
            />
          </div>
          <div>
            <label className="label" htmlFor="bank_account_number">
              Nomor Rekening
            </label>
            <input
              id="bank_account_number"
              name="bank_account_number"
              defaultValue={settings.bankAccountNumber}
              className="field font-mono"
            />
          </div>
          <div>
            <label className="label" htmlFor="bank_account_name">
              Atas Nama
            </label>
            <input
              id="bank_account_name"
              name="bank_account_name"
              defaultValue={settings.bankAccountName}
              className="field"
            />
          </div>
          <div>
            <label className="label" htmlFor="npwp">
              NPWP
            </label>
            <input
              id="npwp"
              name="npwp"
              defaultValue={settings.npwp}
              className="field font-mono"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-line pt-4">
        <label className="label" htmlFor="doc_code">
          Kode Dokumen
        </label>
        <input
          id="doc_code"
          name="doc_code"
          defaultValue={settings.docCode}
          className="field w-32 font-mono"
          placeholder="DC"
          maxLength={6}
        />
        <p className="mt-1 text-xs text-ink-subtle">
          Ruas pertama nomor dokumen — “DC” di DC/INV/001/VIII/2026.
        </p>
      </div>

      {state.error && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-md bg-forest-soft px-3 py-2 text-sm text-forest">
          Tersimpan.
        </p>
      )}

      <SubmitButton>Simpan</SubmitButton>
    </form>
  );
}

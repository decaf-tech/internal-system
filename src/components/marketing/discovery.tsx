"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/modal";
import { CONTACT } from "./content";
import type { Lang, SiteCopy } from "./copy";
import {
  submitDiscoveryRequest,
  type DiscoveryField,
  type DiscoveryState,
} from "./discovery-actions";

/**
 * Form sesi discovery, terpasang langsung di seksi kontak.
 *
 * Dulu form ini tinggal di modal yang dibuka tombol-tombol di seluruh
 * halaman. Sejak redesign Oktober 2026 setiap ajakan cukup jadi tautan
 * jangkar ke `#kontak`: formnya sudah terlihat di sana, jadi tidak ada
 * dialog yang harus dibuka dulu, dan ini tinggal satu-satunya JavaScript
 * yang dikirim situs publik selain beacon analitik.
 *
 * Teksnya datang sebagai prop, bukan dari impor `COPY`: lihat
 * `discoveryProps()` di `copy.ts` untuk alasannya.
 */
type DiscoveryCopy = SiteCopy["discovery"];

export function DiscoveryForm({
  lang,
  copy,
}: {
  lang: Lang;
  copy: DiscoveryCopy;
}) {
  // "Isi ulang form" memasang ulang form dari nol lewat `key`: state
  // `useActionState` (termasuk tanda sukses) tidak bisa dikosongkan dari
  // luar, tapi komponen yang baru dipasang mulai dengan state awal.
  const [round, setRound] = useState(0);

  return (
    <FormRound
      key={round}
      lang={lang}
      copy={copy}
      onReset={() => setRound((value) => value + 1)}
    />
  );
}

function FormRound({
  lang,
  copy,
  onReset,
}: {
  lang: Lang;
  copy: DiscoveryCopy;
  onReset: () => void;
}) {
  const [state, formAction] = useActionState<DiscoveryState, FormData>(
    submitDiscoveryRequest,
    { error: null },
  );

  // Ketiga field ini terkendali (controlled). React 19 mengosongkan form
  // tak terkendali begitu action-nya selesai, termasuk saat action itu
  // mengembalikan error, dan calon klien yang baru mengetik tiga kolom
  // lalu menatap form kosong tidak akan mengetik ulang.
  const [values, setValues] = useState<Record<DiscoveryField, string>>({
    phone: "",
    business: "",
    interest: "",
  });

  if (state.ok) {
    return (
      <div role="status">
        <h3 className="text-[26px]">{copy.successTitle}</h3>
        <p className="mt-3 text-[16px] leading-relaxed text-ink-muted">
          {copy.successBody}
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-[22px] min-h-12 cursor-pointer rounded-2xl border-[1.5px] border-[#cdbf9f] bg-transparent px-[18px] py-3 text-[15px] font-bold text-ink"
        >
          {copy.reset}
        </button>
      </div>
    );
  }

  // Kesalahan tanpa `field` milik seluruh form: kolom wajib kosong, atau
  // gagal simpan. Yang pertama menandai kolom wajib yang memang masih
  // kosong; yang kedua tidak menandai apa pun karena keduanya terisi.
  // Cerita masalah opsional, jadi tidak pernah ditandai karena kosong.
  const formError = state.error && !state.field ? state.error : null;
  const invalid = (name: DiscoveryField) =>
    state.field === name ||
    (formError !== null && name !== "interest" && !values[name].trim());

  const field = (name: DiscoveryField) => ({
    id: `discovery-${name}`,
    name,
    value: values[name],
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => setValues((prev) => ({ ...prev, [name]: event.target.value })),
    "aria-invalid": invalid(name),
    "aria-describedby":
      state.field === name ? `discovery-${name}-error` : undefined,
    placeholder: copy.fields[name].placeholder,
    className: "site-field",
  });

  const fieldError = (name: DiscoveryField) =>
    state.field === name && (
      <p
        id={`discovery-${name}-error`}
        role="alert"
        className="mt-1.5 text-[14px] font-semibold text-danger"
      >
        {state.error}
      </p>
    );

  return (
    // `noValidate`: pemeriksaannya di server action, dan pesannya tampil
    // di bawah kolomnya dengan bahasa halaman, bukan gelembung bawaan
    // browser yang bahasanya mengikuti setelan perangkat.
    <form action={formAction} noValidate>
      {/* Bahasa yang sedang dibaca pengunjung, supaya pesan kesalahan dari
          server action kembali dalam bahasa yang sama. */}
      <input type="hidden" name="lang" value={lang} />

      <h3 className="text-[26px]">{copy.title}</h3>

      <div className="mt-[22px]">
        <label htmlFor="discovery-phone" className="block text-[15px] font-bold">
          {copy.fields.phone.label}
        </label>
        <input
          {...field("phone")}
          type="tel"
          // `inputMode` memunculkan papan angka di HP tanpa menolak
          // karakter lain: nomor tetap boleh ditulis dengan +, spasi,
          // atau tanda hubung.
          inputMode="tel"
          autoComplete="tel"
          maxLength={32}
        />
        {fieldError("phone")}
      </div>

      <div className="mt-[18px]">
        <label
          htmlFor="discovery-business"
          className="block text-[15px] font-bold"
        >
          {copy.fields.business.label}
        </label>
        <input
          {...field("business")}
          type="text"
          autoComplete="organization"
          maxLength={120}
        />
        {fieldError("business")}
      </div>

      <div className="mt-[18px]">
        <label
          htmlFor="discovery-interest"
          className="block text-[15px] font-bold"
        >
          {copy.fields.interest.label}{" "}
          <span className="font-semibold text-ink-muted">{copy.optional}</span>
        </label>
        <textarea {...field("interest")} rows={3} maxLength={1000} className="site-field resize-y" />
        {fieldError("interest")}
      </div>

      {/* Umpan untuk robot pengisi form. Disembunyikan dari mata DAN dari
          pembaca layar (`aria-hidden` + tidak bisa ditab), jadi tidak ada
          manusia yang bisa mengisinya tanpa sengaja. Yang mengisinya
          dijawab "berhasil" tapi tidak disimpan, lihat server action. */}
      <div aria-hidden className="hidden">
        <label htmlFor="discovery-website">{copy.honeypot}</label>
        <input
          id="discovery-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {formError && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-danger-soft px-3.5 py-3 text-[14px] font-semibold text-danger"
        >
          {formError}
        </p>
      )}

      <SubmitButton
        className="site-btn mt-[22px] min-h-14 w-full text-[17px]"
        pendingLabel={copy.pending}
      >
        {copy.submit}
      </SubmitButton>

      <p className="mt-4 text-center text-[14px] text-ink-muted">
        {copy.fallback}{" "}
        <a
          href={CONTACT.linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-track="linkedin_cta"
        >
          {copy.fallbackLink}
        </a>
      </p>
    </form>
  );
}

"use client";

import { useActionState, useCallback, useState } from "react";
import { Modal, SubmitButton } from "@/components/modal";
import type { Lang, SiteCopy } from "./copy";
import { submitDiscoveryRequest, type DiscoveryState } from "./discovery-actions";

/**
 * Tombol ajakan utama situs publik: membuka form, bukan melompat ke
 * WhatsApp.
 *
 * Ini satu-satunya JavaScript yang dikirim halaman publik ke pengunjung —
 * sisa halamannya tetap teks, tautan, dan satu SVG. Ditukar dengan sadar:
 * sebuah form yang tidak menutup diri saat sukses, tidak kehilangan isian
 * saat ada yang salah, dan bisa ditutup dengan Escape memerlukan state di
 * sisi klien, dan lead yang hilang jauh lebih mahal daripada beberapa kB
 * yang dimuat setelah halamannya tergambar.
 *
 * Dipakai berulang di beberapa tempat (bilah nav, hero, seksi penutup),
 * masing-masing dengan bentuk tombol sendiri lewat `className`. Tiap
 * pemakaian punya state & dialognya sendiri — sama seperti tombol-tombol
 * di backoffice, dan lebih murah daripada satu dialog global yang harus
 * dihubungkan lewat context.
 *
 * Teksnya datang sebagai prop, bukan dari impor `COPY`: lihat
 * `discoveryProps()` di `copy.ts` untuk alasannya.
 */
type DiscoveryCopy = SiteCopy["discovery"];

export function DiscoveryButton({
  lang,
  copy,
  waHref,
  className = "btn btn-accent px-5",
  children,
}: {
  lang: Lang;
  copy: DiscoveryCopy;
  waHref: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children ?? copy.cta}
      </button>

      <Modal
        open={open}
        onClose={close}
        title={copy.title}
        closeLabel={copy.close}
      >
        {/* Dirender hanya saat terbuka: isian yang batal dikirim tidak
            tertinggal saat form dibuka lagi, dan pesan sukses sesi
            sebelumnya tidak menyambut orang yang baru mau mengisi. */}
        {open && (
          <DiscoveryForm
            lang={lang}
            copy={copy}
            waHref={waHref}
            onClose={close}
          />
        )}
      </Modal>
    </>
  );
}

function DiscoveryForm({
  lang,
  copy,
  waHref,
  onClose,
}: {
  lang: Lang;
  copy: DiscoveryCopy;
  waHref: string;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState<DiscoveryState, FormData>(
    submitDiscoveryRequest,
    { error: null },
  );

  // Ketiga field ini terkendali (controlled) — satu-satunya form di
  // seluruh proyek ini yang begitu.
  //
  // React 19 mengosongkan form tak terkendali begitu action-nya selesai,
  // termasuk saat action itu mengembalikan error. Di backoffice akibatnya
  // ringan: yang mengisi ulang adalah orang yang datanya memang ada di
  // tangannya. Di sini akibatnya adalah calon klien yang baru saja
  // mengetik tiga kolom, gagal terkirim karena jaringan, lalu menatap form
  // kosong — dan tidak mengetik ulang. State di sini yang menahan isinya.
  const [phone, setPhone] = useState("");
  const [business, setBusiness] = useState("");
  const [interest, setInterest] = useState("");

  // Form yang sukses TIDAK menutup dirinya sendiri seperti form di
  // backoffice. Di sana yang mengisi tahu persis apa yang terjadi setelah
  // Simpan — barisnya muncul di daftar di belakang modal. Di sini tidak
  // ada apa pun yang berubah di halaman, jadi modal yang menghilang
  // begitu saja hanya menyisakan pertanyaan "tadi kekirim tidak, ya".
  if (state.ok) {
    return (
      <div className="py-2">
        <p className="display text-xl text-accent">{copy.successTitle}</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          {copy.successBody}
        </p>
        <div className="mt-6 flex justify-end">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            {copy.close}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* Bahasa yang sedang dibaca pengunjung, supaya pesan kesalahan dari
          server action kembali dalam bahasa yang sama. Ikut terkirim
          bersama form, jadi ia tetap benar meski halamannya di-cache. */}
      <input type="hidden" name="lang" value={lang} />

      <p className="text-sm leading-relaxed text-ink-muted">{copy.intro}</p>

      <div>
        <label className="label" htmlFor="discovery-phone">
          {copy.fields.phone.label} <span className="text-accent">*</span>
        </label>
        <input
          id="discovery-phone"
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          // `inputMode` memunculkan papan angka di HP tanpa menolak
          // karakter lain — nomor tetap boleh ditulis dengan +, spasi,
          // atau tanda hubung.
          inputMode="tel"
          maxLength={32}
          className="field"
          placeholder={copy.fields.phone.placeholder}
          aria-describedby="discovery-phone-hint"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <p id="discovery-phone-hint" className="mt-1.5 text-xs text-ink-subtle">
          {copy.fields.phone.hint}
        </p>
      </div>

      <div>
        <label className="label" htmlFor="discovery-business">
          {copy.fields.business.label} <span className="text-accent">*</span>
        </label>
        <input
          id="discovery-business"
          name="business"
          required
          maxLength={120}
          className="field"
          placeholder={copy.fields.business.placeholder}
          value={business}
          onChange={(event) => setBusiness(event.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="discovery-interest">
          {copy.fields.interest.label} <span className="text-accent">*</span>
        </label>
        <textarea
          id="discovery-interest"
          name="interest"
          required
          rows={4}
          maxLength={1000}
          className="field resize-y"
          placeholder={copy.fields.interest.placeholder}
          value={interest}
          onChange={(event) => setInterest(event.target.value)}
        />
      </div>

      {/* Umpan untuk robot pengisi form. Disembunyikan dari mata DAN dari
          pembaca layar (`aria-hidden` + tidak bisa ditab), jadi tidak ada
          manusia yang bisa mengisinya tanpa sengaja — yang mengisinya
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

      {state.error && (
        <p
          role="alert"
          className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-xs text-ink-subtle">
          {copy.fallback}{" "}
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent underline underline-offset-2"
          >
            {copy.fallbackLink}
          </a>
        </p>
        <SubmitButton className="btn btn-accent" pendingLabel={copy.pending}>
          {copy.submit}
        </SubmitButton>
      </div>
    </form>
  );
}

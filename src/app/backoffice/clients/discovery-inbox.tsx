"use client";

import { useState, useTransition } from "react";
import { ConfirmButton } from "@/components/modal";
import { formatDateTime } from "@/lib/format";
import type { DiscoveryRequest } from "@/lib/types";
import {
  archiveDiscoveryRequest,
  convertDiscoveryRequest,
} from "./discovery-actions";
import { whatsappLink } from "./prospect-card";

/**
 * Kotak masuk permintaan sesi discovery dari situs publik.
 *
 * Ditaruh DI ATAS papan pipeline, bukan di halaman sendiri: permintaan
 * yang butuh dibalas hari ini tidak boleh menunggu seseorang ingat untuk
 * membuka satu tab lagi. Begitu kosong, seluruh blok ini menghilang —
 * kotak masuk kosong yang tetap memakan ruang mengajari mata untuk
 * melewatinya, dan itu persis yang tidak boleh terjadi di sini.
 */
export function DiscoveryInbox({ requests }: { requests: DiscoveryRequest[] }) {
  if (requests.length === 0) return null;

  return (
    <section className="mb-6 rounded-lg border border-accent/30 bg-accent-soft/50 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">
          {requests.length} permintaan sesi discovery
        </h2>
        <p className="text-xs text-ink-muted">
          Dari form di situs publik — belum masuk pipeline sampai
          ditindaklanjuti.
        </p>
      </div>

      <ul className="mt-4 space-y-3">
        {requests.map((request) => (
          <DiscoveryRow key={request.id} request={request} />
        ))}
      </ul>
    </section>
  );
}

function DiscoveryRow({ request }: { request: DiscoveryRequest }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const wa = whatsappLink(request.phone);

  function run(action: () => Promise<{ error: string | null }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      // Baris yang berhasil ditindaklanjuti hilang sendiri dari daftar
      // saat halamannya di-revalidate oleh server action — tidak ada
      // state sukses yang perlu disimpan di sini.
      if (result.error) setError(result.error);
    });
  }

  return (
    <li className="rounded-md border border-line bg-surface p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-medium">{request.business}</p>
        <p className="font-mono text-xs text-ink-muted">{request.phone}</p>
        <p className="ml-auto text-xs text-ink-subtle">
          {formatDateTime(request.created_at)}
        </p>
      </div>

      <p className="mt-2 border-l-2 border-line-strong pl-3 text-sm leading-relaxed text-ink-muted">
        {request.interest}
      </p>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-accent"
          disabled={pending}
          onClick={() => run(() => convertDiscoveryRequest(request))}
        >
          Jadikan prospek
        </button>

        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
          >
            Buka WhatsApp
          </a>
        )}

        <ConfirmButton
          title="Arsipkan permintaan"
          message="Permintaan ini disembunyikan dari kotak masuk, tapi tetap tersimpan. Lanjutkan?"
          confirmLabel="Arsipkan"
          disabled={pending}
          onConfirm={() => run(() => archiveDiscoveryRequest(request.id))}
        >
          Arsipkan
        </ConfirmButton>
      </div>
    </li>
  );
}

"use client";

import { useEffect } from "react";
import type { Lang } from "./copy";

const SESSION_KEY = "decaf_sid";

/** UUID acak per pengunjung, disimpan di localStorage — bukan pengenal
 * orang, cuma penanda "kunjungan yang sama" antar beberapa pageview. */
function sessionId(): string {
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    // Mode privat / localStorage diblokir: tetap kirim satu event,
    // cuma tidak tersambung ke kunjungan berikutnya dari orang yang sama.
    return crypto.randomUUID();
  }
}

function send(body: Record<string, unknown>) {
  try {
    // `keepalive` supaya event klik pada tautan yang membuka tab baru
    // (WhatsApp) tetap terkirim meski halaman langsung berpindah fokus.
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    // Pemblokir iklan/privasi yang mencegat fetch: diamkan, bukan urusan
    // pengunjung untuk tahu situs ini gagal mencatat kunjungannya.
  }
}

/**
 * Beacon analitik pengunjung situs publik — satu-satunya sumber data
 * untuk halaman Analitik di backoffice (Admin, super admin saja).
 *
 * Mengirim satu event "pageview" saat halaman dibuka, lalu mendengarkan
 * klik pada elemen berlabel `data-track` (tombol WhatsApp, tombol buka
 * form discovery) lewat satu listener di `document` — supaya menandai
 * CTA baru cukup menambah atribut `data-track`, tidak perlu menyambungkan
 * handler baru di tiap tempat.
 */
export function AnalyticsBeacon({ lang }: { lang: Lang }) {
  useEffect(() => {
    const id = sessionId();
    const utm = new URLSearchParams(window.location.search).get("utm_source");

    send({
      session_id: id,
      event_type: "pageview",
      path: window.location.pathname,
      lang,
      utm_source: utm,
    });

    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const el = target?.closest<HTMLElement>("[data-track]");
      if (!el) return;

      send({
        session_id: id,
        event_type: "click",
        path: window.location.pathname,
        lang,
        click_label: el.dataset.track,
      });
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [lang]);

  return null;
}

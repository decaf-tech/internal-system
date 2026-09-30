"use client";

import { useEffect } from "react";
import type { Lang } from "./copy";

const SESSION_KEY = "decaf_sid";

/**
 * `crypto.randomUUID` cuma ada di konteks aman (HTTPS) dan iOS 15.4+/
 * Chrome 92+. Halaman yang dibuka lewat `http://`, atau WebView aplikasi
 * lain (Threads, Instagram, dll.) yang lawas, tidak punya — memanggilnya
 * melempar error yang sebelumnya merobohkan seluruh situs. Jadi tiap
 * lapis punya cadangan; hasil akhirnya tetap string berbentuk UUID v4,
 * — `/api/track` cuma mensyaratkan string 8–64 karakter.
 */
function newId(): string {
  try {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }
  } catch {}
  const bytes = new Uint8Array(16);
  try {
    crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** UUID acak per pengunjung, disimpan di localStorage — bukan pengenal
 * orang, cuma penanda "kunjungan yang sama" antar beberapa pageview. */
function sessionId(): string {
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = newId();
    window.localStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    // Mode privat / localStorage diblokir: tetap kirim satu event,
    // cuma tidak tersambung ke kunjungan berikutnya dari orang yang sama.
    return newId();
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
    // Analitik itu sampingan: apa pun yang salah di sini tidak boleh
    // sampai ke error boundary dan mengganti seluruh situs dengan layar
    // error. Gagal ya gagal diam-diam.
    try {
      return start();
    } catch {
      return undefined;
    }

    function start() {
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
    }
  }, [lang]);

  return null;
}

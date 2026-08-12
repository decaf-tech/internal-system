"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { NotificationSummary } from "@/lib/notifications/compute";

/**
 * Lonceng + panel ringkasan di kepala aplikasi (PRD v3.0 §3.2).
 *
 * Panel ini TIDAK pernah menampilkan satu baris per item. Yang tampil adalah
 * kategori — maksimal tiga — dan tiap kategori satu baris ringkasan yang bisa
 * dibuka untuk melihat isinya. Batas panjangnya jadi struktural: berapa pun
 * banyaknya tugas yang telat, panelnya tidak ikut memanjang, cuma angkanya
 * yang naik.
 *
 * Angkanya adalah jumlah item aktif SAAT INI, bukan "yang baru sejak terakhir
 * dibuka" (§3.3, desain 🅐). Data di baliknya — tugas telat, follow-up jatuh
 * tempo — adalah daftar kerja yang masih berlaku, bukan kejadian sekali yang
 * lewat; "sudah dibaca" tidak punya arti yang jelas untuk sesuatu yang besok
 * masih sama telatnya. Angkanya turun sendiri begitu pekerjaannya beres.
 */
export function NotificationBell({ summary }: { summary: NotificationSummary }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const { total, categories } = summary;

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={
          total > 0
            ? `Pemberitahuan — ${total} hal perlu diperhatikan`
            : "Pemberitahuan"
        }
        className="icon-btn relative"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 2a3.6 3.6 0 00-3.6 3.6c0 3-1.2 3.9-1.2 3.9h9.6s-1.2-.9-1.2-3.9A3.6 3.6 0 008 2z" />
          <path d="M6.9 12a1.2 1.2 0 002.2 0" />
        </svg>

        {total > 0 && (
          <span
            // Angkanya berhenti di "9+": tiga digit di atas ikon 18px lebih
            // mirip noda daripada angka, dan bedanya 12 atau 27 tidak
            // mengubah apa pun yang dilakukan orang setelah melihatnya.
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 font-mono text-[10px] leading-none text-white"
          >
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && (
        <div
          // Di HP loncengnya ada di ujung kanan bilah selebar layar, jadi
          // panelnya menggantung ke kiri. Di layar lebar loncengnya ada di
          // ujung kanan sidebar yang cuma 15rem — menggantung ke kiri di
          // sana berarti separuh panelnya keluar layar, jadi arahnya dibalik
          // ke ruang kosong di sebelah kanannya.
          className="absolute right-0 z-40 mt-1.5 w-72 max-w-[85vw] rounded-lg border border-line-strong bg-surface p-2 shadow-lg lg:right-auto lg:left-0"
        >
          {categories.length === 0 ? (
            <p className="px-2 py-3 text-sm text-ink-subtle">
              Tidak ada yang jatuh tempo hari ini. Aman.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {categories.map((category) => {
                const isExpanded = expanded === category.key;
                return (
                  <li key={category.key}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded(isExpanded ? null : category.key)
                      }
                      aria-expanded={isExpanded}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-surface-muted"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {category.label}
                      </span>
                      <span className="font-mono text-[10px] text-ink-muted">
                        {isExpanded ? "▾" : "▸"}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="mb-1 rounded-md bg-surface-muted px-2 py-1.5">
                        <ul className="space-y-1">
                          {category.items.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-baseline justify-between gap-2 text-xs"
                            >
                              <span className="min-w-0 flex-1 truncate text-ink-muted">
                                {item.title}
                              </span>
                              {item.hint && (
                                <span className="shrink-0 font-mono text-[10px] text-ink-subtle">
                                  {item.hint}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>

                        {category.count > category.items.length && (
                          <p className="mt-1 text-[11px] text-ink-subtle">
                            dan {category.count - category.items.length} lagi
                          </p>
                        )}

                        {/* Tautan ke halamannya, bukan ke tiap item: papan
                            tugas dan papan pipeline tidak punya alamat per
                            kartu — yang ada cuma halamannya, dan di sana
                            kartunya sudah tersorot sendiri. */}
                        <Link
                          href={category.href}
                          onClick={() => setOpen(false)}
                          className="mt-1.5 inline-block text-xs text-accent hover:underline"
                        >
                          Buka halamannya →
                        </Link>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

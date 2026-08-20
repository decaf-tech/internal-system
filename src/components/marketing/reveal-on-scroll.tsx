"use client";

import { useEffect } from "react";

/**
 * Menyalakan efek `.reveal`/`.reveal-pop` (globals.css) — satu
 * IntersectionObserver untuk seluruh halaman, dipasang sekali di sini
 * (site.tsx), bukan satu per seksi.
 *
 * Kelas `html.js` yang membuat elemen-elemennya mulai tembus pandang
 * dipasang skrip `beforeInteractive` di `app/layout.tsx`, jadi tanpa
 * komponen ini pun (JS gagal dimuat setelah hidrasi) elemennya tetap
 * kelihatan — cuma tidak larut.
 *
 * `prefers-reduced-motion` ditangani lewat CSS (`opacity: 1 !important`
 * di globals.css), bukan di sini — observer tetap boleh jalan seperti
 * biasa untuk mereka, hasil akhirnya sama saja.
 */
export function RevealOnScroll() {
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>(
      ".reveal, .reveal-pop",
    );
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.4, rootMargin: "0px 0px -50px 0px" },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return null;
}

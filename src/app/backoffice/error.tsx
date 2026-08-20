"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Jaring pengaman untuk seluruh halaman di dalam aplikasi.
 *
 * Tanpa file ini, satu query Supabase yang gagal — jaringan putus, RLS
 * menolak, migration belum jalan — menghasilkan layar putih "Application
 * error: a client-side exception has occurred" di production. Itu tidak
 * memberi tahu siapa pun apa yang harus dilakukan, dan pesan aslinya
 * sengaja disembunyikan Next.js supaya detail server tidak bocor ke
 * publik.
 *
 * Yang ditampilkan di sini: kalimat yang bisa dikerjakan, tombol coba lagi
 * (`reset()` merender ulang segmennya tanpa memuat ulang seluruh halaman,
 * jadi kegagalan sesaat cukup dibereskan satu ketukan), dan `digest` —
 * kode pendek yang dicetak Next.js ke log server bersama stack trace
 * aslinya. Kalau tim melaporkan error, kode itu yang menghubungkan
 * laporannya ke baris log yang benar di Vercel.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Di server, Next.js sudah mencatat sendiri. Ini untuk kegagalan yang
    // terjadi setelah halaman sampai di browser.
    console.error("Halaman gagal dirender:", error);
  }, [error]);

  return (
    <div className="card mx-auto max-w-lg p-6 text-center">
      <p className="eyebrow">Ada yang tidak beres</p>
      <h1 className="mt-2 text-xl">Halaman ini gagal dimuat</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Biasanya karena koneksi ke database sedang terputus sebentar. Coba
        lagi dulu — kalau masih sama, kabari Abi beserta kode di bawah.
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={reset} className="btn btn-primary">
          Coba Lagi
        </button>
        <Link href="/backoffice" className="btn btn-ghost">
          Kembali ke Dasbor
        </Link>
      </div>

      {error.digest && (
        <p className="mt-5 border-t border-line pt-4 font-mono text-[11px] text-ink-subtle">
          Kode: {error.digest}
        </p>
      )}
    </div>
  );
}

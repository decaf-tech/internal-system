"use client";

/**
 * Lapisan terakhir: dipakai hanya kalau yang gagal adalah root layout itu
 * sendiri, saat `(app)/error.tsx` belum sempat terpasang.
 *
 * Karena menggantikan seluruh dokumen, file ini wajib menuliskan `<html>`
 * dan `<body>` sendiri — dan tidak bisa ikut menumpang `globals.css` yang
 * dimuat root layout, jadi gayanya ditulis sebaris. Sengaja dibiarkan
 * sederhana: ini halaman yang idealnya tidak pernah dilihat siapa pun.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // Disalin dari --color-canvas & --color-ink di globals.css.
          // Kalau palet di sana berubah, dua baris ini ikut disesuaikan
          // manual — halaman ini memang tidak bisa membaca token itu.
          backgroundColor: "#faf7f2",
          color: "#1c1815",
          fontFamily: "system-ui, sans-serif",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "26rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", margin: 0 }}>
            Sistem gagal dimuat
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#6e655c", marginTop: 8 }}>
            Muat ulang halaman ini. Kalau masih sama, kabari Abi beserta kode
            di bawah.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              padding: "0.625rem 1.25rem",
              borderRadius: "0.375rem",
              border: 0,
              backgroundColor: "#1c1815",
              color: "#faf7f2",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Coba Lagi
          </button>
          {error.digest && (
            <p
              style={{
                marginTop: 20,
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.6875rem",
                color: "#9a9089",
              }}
            >
              Kode: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}

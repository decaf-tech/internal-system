import { CURVE } from "./content";
import type { SiteCopy } from "./copy";

/**
 * Grafik "menggeser kurva produktivitas" (§3 brand doc).
 *
 * SVG yang dirakit sendiri, bukan pustaka grafik: dua garis dengan tujuh
 * titik tidak sebanding dengan menambah dependency, dan hasilnya ikut
 * berubah warna bersama token tema tanpa konfigurasi apa pun.
 *
 * Sumbunya sengaja tanpa angka. Ini gambar bentuk hubungan — usaha di
 * sumbu datar, hasil di sumbu tegak — bukan data terukur; memberi angka
 * pada sumbunya akan membuatnya terbaca sebagai klaim yang bisa ditagih.
 *
 * Grafiknya menggambar dirinya sendiri saat digulir ke dalam layar:
 * garis birunya ditarik dari kiri ke kanan, bidang di bawahnya memudar
 * masuk, titik ujungnya menyusul terakhir. Aturannya di globals.css
 * (`.curve*`) — dijalankan `animation-timeline`, bukan JavaScript, jadi
 * komponen ini tetap server component tanpa satu byte skrip pun.
 *
 * `pathLength={1}` di garis birunya yang membuat itu mungkin tanpa
 * mengukur apa pun: dengan panjang lintasan dinormalkan ke 1, CSS bisa
 * menggeser `stroke-dashoffset` dari 1 ke 0 dan angka itu tetap benar
 * walau titik datanya di content.ts diubah nanti.
 */

const W = 420;
const H = 260;
const PAD_X = 32;
const PAD_BOTTOM = 34;
const PAD_TOP = 16;

function points(values: readonly number[]) {
  const stepX = (W - PAD_X * 2) / (values.length - 1);
  const usableY = H - PAD_TOP - PAD_BOTTOM;
  return values.map((value, index) => ({
    x: PAD_X + index * stepX,
    y: PAD_TOP + usableY - (value / 100) * usableY,
  }));
}

/**
 * Garis lengkung lewat semua titik dengan kurva Catmull-Rom yang diubah ke
 * Bézier kubik. Garis lurus antar titik membuat kedua kurva terlihat patah
 * dan menghilangkan justru hal yang sedang dijelaskan: bentuk lengkungnya.
 */
function smoothPath(values: readonly number[]) {
  const p = points(values);
  let d = `M ${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`;

  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
}

export function ProductivityCurve({ copy }: { copy: SiteCopy["curve"] }) {
  const manual = smoothPath(CURVE.manual);
  const empowered = smoothPath(CURVE.empowered);
  const empoweredEnd = points(CURVE.empowered).at(-1)!;
  const manualEnd = points(CURVE.manual).at(-1)!;

  return (
    // `curve` memasang view-timeline bernama --curve; semua bagian
    // grafik di dalamnya berpatokan pada kartu ini masuk layar, bukan
    // pada posisi masing-masing path.
    <figure className="curve card p-5 sm:p-6">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={copy.ariaLabel}
      >
        {/* Garis bantu mendatar — tipis, cuma untuk memberi kedalaman. */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) * t;
          return (
            <line
              key={t}
              x1={PAD_X}
              x2={W - PAD_X}
              y1={y}
              y2={y}
              stroke="var(--color-line)"
              strokeWidth="1"
            />
          );
        })}

        {/* Area di bawah kurva empowered — memberi bobot visual ke sisi
            yang sedang dijelaskan, tanpa menambah garis baru. */}
        {/* Dibungkus <g>: animasinya memudarkan opacity grup dari 0 ke 1,
            sementara 0,7 milik path-nya sendiri tetap berlaku di dalam.
            Kalau kelasnya dipasang langsung di path, nilai animasi akan
            menimpa atribut opacity-nya dan bidangnya berakhir pekat. */}
        <g className="curve-area">
          <path
            d={`${empowered} L ${W - PAD_X} ${H - PAD_BOTTOM} L ${PAD_X} ${H - PAD_BOTTOM} Z`}
            fill="var(--color-accent-soft)"
            opacity="0.7"
          />
        </g>

        {/* Garis pembanding cuma memudar masuk, tidak ikut digambar:
            `strokeDasharray` di sini sudah dipakai untuk membuatnya
            putus-putus, dan menganimasi offset-nya cuma membuat
            putus-putusnya berbaris jalan. */}
        <path
          className="curve-baseline"
          d={manual}
          fill="none"
          stroke="var(--color-ink-subtle)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="5 4"
        />
        <path
          className="curve-line"
          d={empowered}
          pathLength={1}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        <circle
          className="curve-dot"
          cx={empoweredEnd.x}
          cy={empoweredEnd.y}
          r="4"
          fill="var(--color-accent)"
        />
        <circle
          className="curve-dot"
          cx={manualEnd.x}
          cy={manualEnd.y}
          r="3.5"
          fill="var(--color-ink-subtle)"
        />

        {/* Sumbu tanpa angka — lihat komentar kepala berkas. */}
        <text
          x={PAD_X}
          y={H - 10}
          fontSize="10"
          fill="var(--color-ink-subtle)"
          fontFamily="var(--font-mono)"
        >
          {copy.axisX}
        </text>
        <text
          x={PAD_X}
          y={PAD_TOP - 3}
          fontSize="10"
          fill="var(--color-ink-subtle)"
          fontFamily="var(--font-mono)"
        >
          {copy.axisY}
        </text>
      </svg>

      <figcaption className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4 text-xs text-ink-muted">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded bg-accent" />
          {copy.legendEmpowered}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded bg-ink-subtle" />
          {copy.legendManual}
        </span>
      </figcaption>
    </figure>
  );
}

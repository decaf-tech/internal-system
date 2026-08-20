@AGENTS.md

Sebelum mengerjakan apa pun di proyek ini, baca `docs/PRD v2.3.md` dulu —
berisi konteks bisnis, keputusan arsitektur (kenapa Supabase+Drive,
kenapa Vercel, kenapa hak akses rata, kenapa Markdown untuk catatan),
status pengembangan terkini, dan pilihan yang perlu diambil di bagian
"Mulai dari Sini". Lalu `docs/PRD v3.0.md` — pipeline prospek &
notifikasi lokal, dibangun setelah v2.3 ditulis; §7 di sana yang memegang
status keduanya. Lalu `docs/PRD v3.1.md` — skema langganan
(subscription) & monitoring kontrak; sejak itu `estimated_value` dan
`deal_value` TIDAK boleh dibaca mentah, semuanya lewat
`contractValue()` di `src/lib/billing.ts`. Lalu `docs/PRD v3.2.md` —
dokumen dari template Google Docs (invoice, penawaran, kontrak, berita
acara): templatenya baris data di `document_templates`, bukan kode, dan
placeholder otomatisnya dirakit di `src/lib/templates/context.ts`.
Lalu `docs/PRD v3.3.md` — identitas perusahaan (nama, rekening bank,
kode dokumen) pindah dari env var ke tabel `company_settings`, diubah
lewat halaman Dokumen → Perusahaan; `src/lib/env.ts` TIDAK lagi punya
`company()`, baca lewat `getCompanySettings()` di `src/lib/company.ts`.
Lalu `docs/PRD v3.4.md` — rencana migrasi deployment dari Vercel ke
server sendiri (`server-merah-supermicro`), domain lewat Cloudflare.
**Belum dieksekusi** — domain `decaf.id` sudah dibeli (20 Agustus 2026),
jadi penghalang di §10 sudah lepas dan migrasi ini yang berikutnya
dikerjakan; §10 di sana yang memegang urutan mulainya. Berkas
`Dockerfile`/`docker-compose.yml`/`output: "standalone"` di repo berasal
dari rencana itu, belum pernah di-build.
Lalu `docs/PRD v3.5.md` — situs publik di `/`: form sesi discovery
(menggantikan tombol yang melompat ke WhatsApp), tabel
`discovery_requests` + kotak masuknya di `/backoffice/clients`, dan
identitas tipografi pindah dari Fraunces ke Fredoka. Migration `013`
**belum dijalankan** ke database asli — sampai itu terjadi, form di situs
publik selalu gagal kirim (§6 di sana).

**Identitas visual sekarang tidak lagi seperti yang ditulis v3.5.** Sejak
19 Agustus 2026 ada logo sungguhan dan palet warna resmi, jadi bagian
tipografi & warna di PRD mana pun sudah kedaluwarsa; yang memegang
kebenaran adalah blok `@theme` di `src/app/globals.css`. Ringkasnya:
palet krem/terracotta diganti Deep Navy `#081f3b` · Tech Blue `#2563eb` ·
Electric Blue `#22d3ee` · Mint `#10b981` · Light Gray `#e5e7eb`
(kartu acuannya `docs/brand/color-palette.jpeg`), huruf display pindah
dari Fredoka ke **Sora** dan Lora dilepas sama sekali — `font-serif`
sekarang berarti serif bawaan sistem, bukan huruf brand, dan cuma dipakai
dua glif tombol di `components/markdown-editor.tsx`. Logonya di
`public/brand/`, dipasang lewat `src/components/brand.tsx` (jangan
`<img>` langsung), dan ikon tab/PWA-nya di `src/app/icon.png`,
`apple-icon.png`, `favicon.ico`.

**Situs publik sekarang dua bahasa.** Indonesia tetap bawaan dan
menempati `/`; versi Inggrisnya rute tersendiri di `/en`, ditukar lewat
tombol ID/EN di kanan atas bilah nav. Tidak ada cookie, tidak ada deteksi
`Accept-Language`, tidak ada pengalihan — keduanya halaman statis penuh.
Seluruh teksnya di `src/components/marketing/copy-id.ts` dan
`copy-en.ts`, dengan bentuk yang dipaksa sama oleh tipe `SiteCopy` di
`copy.ts`; `content.ts` cuma menyimpan yang tidak berubah menurut bahasa
(kontak, angka grafik). Menambah kalimat berarti menambahnya di kedua
berkas — kompiler yang menolak kalau salah satu tertinggal. Jangkar
seksi (`#filosofi`, `#layanan`, …) sengaja tetap berbahasa Indonesia di
kedua versi. Bagian PRD mana pun yang mengutip teks halaman publik
sekarang bicara soal versi Indonesianya saja.

`docs/Ide - Invoice Draft via Google Docs Template.md` adalah ide awal
yang melahirkan v3.2 — sudah tergantikan, dibiarkan sebagai riwayat.
`docs/PRD v1.md`,
`docs/PRD v2.md`, `docs/PRD v2.1.md`,
dan `docs/PRD v2.2.md` adalah potret status di titik waktu sebelumnya
(10–12 Agustus 2026) — dibiarkan apa adanya sebagai riwayat, sudah tidak
mencerminkan status sekarang.

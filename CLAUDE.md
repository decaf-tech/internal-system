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
Lalu `docs/PRD v3.4.md` — migrasi deployment dari Vercel ke server
sendiri (`server-merah-supermicro`), domain lewat Cloudflare.
**Sudah dieksekusi 20 Agustus 2026: aplikasi live di `https://decaf.id`**
(situs publik di `/`, backoffice di `/backoffice` — satu domain, satu
container, tanpa subdomain). Yang tersisa cuma §5 langkah 9, melepas
Vercel, sengaja ditunda beberapa hari; §10 di sana yang memegang
urutannya. Dua hal yang mengikat kalau menyentuh deployment:
**deploy HANYA lewat Portainer → Stacks → Pull and redeploy**, jangan
`docker compose up` dari folder repo di server (`container_name` dikunci,
dua compose project berebut nama yang sama dan yang kedua selalu ditolak
— §5.1 di sana). Portainer men-deploy dari snapshot/tarball, bukan
`git clone` — **commit yang MENGHAPUS berkas** butuh `sudo rm` manual di
`/var/lib/docker/volumes/portainer_data/_data/compose/2/<path-berkas>`
di server sebelum redeploy berhasil, tiap kali terjadi (§6.7, ditolak
diganti ke cron `git reset --hard` — jangan tawarkan ulang tanpa diminta).
Selain itu, `output: "standalone"` di `next.config.ts` masih
dimatikan saat `process.env.VERCEL` ada, karena Vercel merakit lambda
dari `.next/next-server.js.nft.json` yang tidak pernah ditulis mode
standalone (build gagal ENOENT). Pagar itu dilepas jadi
`output: "standalone"` biasa begitu langkah 9 dijalankan.
Lalu `docs/PRD v3.5.md` — situs publik di `/`: form sesi discovery
(menggantikan tombol yang melompat ke WhatsApp), tabel
`discovery_requests` + kotak masuknya di `/backoffice/clients`, dan
identitas tipografi pindah dari Fraunces ke Fredoka. Migration `013`
**sudah dijalankan** ke database asli (20 Agustus 2026), jadi form sesi
discovery di situs publik berfungsi — catatan "belum dijalankan" di §6
dokumen itu sudah kedaluwarsa.
Lalu `docs/PRD v3.6.md` — Prototipe Drop: unggah zip hasil build lewat
Dokumen → Prototipe di backoffice, dapat tautan publik unlisted
`decaf.id/p/<slug>` lengkap dengan badge branding Decaf. Berkasnya
disimpan di disk container (Docker volume `prototypes_data`), **bukan**
lewat `StorageProvider`/Google Drive — penyimpangan sengaja dari pola
v2.3 §2.1, alasannya di v3.6 §2.2. "Unlisted" ditegakkan tiga lapis
(§2.5 di sana): tabel `prototypes` **tidak punya policy `anon` sama
sekali** — akses publik cuma lewat fungsi `security definer`
`prototype_by_slug(slug)`, bukan lewat baris tabel. Migration `014`
**belum dijalankan** ke database asli — sampai itu terjadi, `/p/...`
membalas 500.

**Identitas visual sekarang tidak lagi seperti yang ditulis v3.5.** Sejak
19 Agustus 2026 ada logo sungguhan dan palet warna resmi, jadi bagian
tipografi & warna di PRD mana pun sudah kedaluwarsa; yang memegang
kebenaran adalah blok `@theme` di `src/app/globals.css`. Ringkasnya:
palet Deep Navy `#081f3b` · Tech Blue `#2563eb` · Electric Blue
`#22d3ee` · Mint `#10b981` · Light Gray `#e5e7eb` (kartu acuannya
`docs/brand/color-palette.jpeg`). Logonya di `public/brand/`, dipasang
lewat `src/components/brand.tsx` (jangan `<img>` langsung), dan ikon
tab/PWA-nya di `src/app/icon.png`, `apple-icon.png`, `favicon.ico`.

**Situs publik dan backoffice sekarang beda huruf dan beda latar.** Sejak
redesign homepage 16 Oktober 2026 (acuannya canvas Artifact Design
`https://claude.ai/artifact/MECpURBPjnUaAtLHn62YrD`), situs publik di `/`
dan `/en` memakai **Nunito** (judul 800, teks 400–700) dan latar krem
yang diambil dari benang mascot: token `cream` `#fbf6ec` (latar),
`cream-surface` `#fffdf8` (kartu), `cream-line` `#eadfca` (garis).
Nunito dimuat di `src/components/marketing/fonts.ts`, bukan di layout
akar, dan semua gaya situs publik dikurung di bawah kelas `.site` di
`globals.css` (`.site-btn` tombol terangkat ala FinOS Personal,
`.site-h2`, `.site-num`, `.chip`, `.site-more`, `.site-field`).
Backoffice tidak berubah: **Sora** untuk display, Plus Jakarta Sans
untuk teks, latar netral dingin. Lora sudah dilepas; `font-serif` cuma
dipakai dua glif tombol di `components/markdown-editor.tsx`. Mascot
rajutan Ciko (burung) & Deko (van) jadi pemandu halaman: versi web-nya
(WebP terpangkas, ≤1000px) di `public/brand/mascot/web/`, tampil lewat
`next/image`. PNG aslinya (±25 MB) sengaja tidak di-commit; cuma ada di
`public/brand/mascot/` di mesin lokal. Setiap pose Deko sudah
memuat Ciko di atap, jadi jangan pasang Ciko terpisah di frame yang
sama. Setiap ajakan di situs publik cuma dua jenis: jangkar ke form sesi
discovery (`#kontak`, form-nya inline, bukan modal) atau LinkedIn;
footer cuma memajang LinkedIn.

**Situs publik sekarang dua bahasa.** Indonesia tetap bawaan dan
menempati `/`; versi Inggrisnya rute tersendiri di `/en`, ditukar lewat
tombol ID/EN di kanan atas bilah nav. Tidak ada cookie, tidak ada deteksi
`Accept-Language`, tidak ada pengalihan — keduanya halaman statis penuh.
Seluruh teksnya di `src/components/marketing/copy-id.ts` dan
`copy-en.ts`, dengan bentuk yang dipaksa sama oleh tipe `SiteCopy` di
`copy.ts`; `content.ts` cuma menyimpan yang tidak berubah menurut bahasa
(alamat kontak). Tanpa em dash di copy. Menambah kalimat berarti menambahnya di kedua
berkas — kompiler yang menolak kalau salah satu tertinggal. Jangkar
seksi (`#filosofi`, `#layanan`, …) sengaja tetap berbahasa Indonesia di
kedua versi. Bagian PRD mana pun yang mengutip teks halaman publik
sekarang bicara soal versi Indonesianya saja.

**Wajib setiap selesai perubahan/pengembangan: perbarui juga
`docs/CV - Decaf Internal System.md`.** Itu rangkuman proyek untuk CV &
portofolio (spec, arsitektur, keamanan, DevOps, tantangan, output, dampak,
bullet siap tempel ID/EN, timeline). Seperti seluruh `docs/`, berkas ini
di-gitignore — jangan di-commit, jangan dikeluarkan dari `.gitignore`.
Bagian "Cara Memperbarui" di awal berkas itu memuat daftar yang harus
disentuh dan perintah untuk menghitung ulang angka; jangan tulis angka
dari perkiraan, dan jangan isi metrik bertanda `[isi: …]` dengan karangan.
Perubahan kecil tanpa dampak ke fitur/arsitektur/angka (typo, refactor
kecil) cukup dilewati.

`docs/Ide - Invoice Draft via Google Docs Template.md` adalah ide awal
yang melahirkan v3.2 — sudah tergantikan, dibiarkan sebagai riwayat.
`docs/PRD v1.md`,
`docs/PRD v2.md`, `docs/PRD v2.1.md`,
dan `docs/PRD v2.2.md` adalah potret status di titik waktu sebelumnya
(10–12 Agustus 2026) — dibiarkan apa adanya sebagai riwayat, sudah tidak
mencerminkan status sekarang.

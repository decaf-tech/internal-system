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
`docs/Ide - Invoice Draft via Google Docs Template.md` adalah ide awal
yang melahirkan v3.2 — sudah tergantikan, dibiarkan sebagai riwayat.
`docs/PRD v1.md`,
`docs/PRD v2.md`, `docs/PRD v2.1.md`,
dan `docs/PRD v2.2.md` adalah potret status di titik waktu sebelumnya
(10–12 Agustus 2026) — dibiarkan apa adanya sebagai riwayat, sudah tidak
mencerminkan status sekarang.

# Decaf — Sistem Internal

Manajemen tugas, klien, dan operasional untuk tim internal Decaf.

**Stack:** Next.js 16 · Supabase (Postgres + Auth) · Google Drive (penyimpanan file) · Vercel

## Pembagian tanggung jawab penyimpanan

Ini keputusan arsitektur paling penting di proyek ini:

| Data                                   | Disimpan di   | Alasan                                                                 |
| -------------------------------------- | ------------- | ---------------------------------------------------------------------- |
| Tugas, klien, project, pengeluaran, user | Supabase Postgres | Butuh relasi & query; ukurannya kecil, muat lama di free tier      |
| File mentah (kontrak, invoice, struk)  | Google Drive  | 15GB gratis vs 1GB di Supabase Storage — ini sumber masalah kuota lama |
| Metadata file (nama, ukuran, pemilik)  | Supabase (`documents`) | Supaya file bisa dicari & ditautkan ke klien/tugas             |

Aplikasi tidak pernah memanggil Google Drive langsung. Semua lewat interface
`StorageProvider` di [`src/lib/storage/types.ts`](src/lib/storage/types.ts).
Kalau nanti 15GB habis, cukup tulis provider baru dan ganti satu baris di
[`src/lib/storage/index.ts`](src/lib/storage/index.ts) — halaman dan action
tidak perlu disentuh.

---

## Setup

### 1. Supabase

1. Buat project baru di [supabase.com](https://supabase.com) (free tier).
2. Buka **SQL Editor → New query**, paste seluruh isi
   [`supabase/schema.sql`](supabase/schema.sql), lalu **Run**.
   Lanjutkan dengan migration `002`–`012` secara berurutan. Semuanya aman
   dijalankan berulang.

   > Berkas migration **tidak ikut di repo ini** — sebagiannya menembak
   > alamat email tim secara harfiah (mis. `005` menetapkan super admin
   > lewat email), jadi disimpan lokal saja. Ada di `supabase/migrations/`
   > pada mesin pengembang.
3. Buka **Project Settings → API**, salin:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / `publishable` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Buat 3 akun tim** lewat **Authentication → Users → Add user**
(centang _Auto Confirm User_ supaya tidak perlu verifikasi email).
Isi **User Metadata** dengan `{"full_name": "Nama Lengkap"}` — trigger di
database akan otomatis membuat baris `profiles`.

Kalau metadata itu terlewat, namanya akan terbaca seperti potongan email.
Tidak masalah: tiap orang bisa memperbaiki nama dan perannya sendiri lewat
halaman **Profil** di dalam sistem (klik namanya di pojok kiri bawah).

> **Hak akses sengaja disamaratakan.** Ketiganya bisa melihat dan mengubah
> semua data, serta saling menugaskan. Peran (`founder`/`coo`/`admin`) hanya
> label untuk memperjelas siapa mengerjakan apa — bukan pembatas akses.

#### Tautan email (reset password & magic link)

Dua setelan di dashboard yang **tidak bisa diatur dari kode** — kalau
terlewat, tautan di email mendarat di `localhost` walaupun aplikasinya
sudah live:

1. **Authentication → URL Configuration**
   - **Site URL**: `https://internal-system-ruddy.vercel.app`
     (bukan `http://localhost:3000` — nilai inilah yang dipakai tombol
     _Send password recovery_ dan _Send magic link_ di dashboard).
   - **Redirect URLs**, tambahkan dua baris:
     - `https://internal-system-ruddy.vercel.app/**`
     - `http://localhost:3000/**` — supaya alur yang sama tetap bisa
       diuji di lokal.

2. **Authentication → Emails → Templates**. Template bawaan memakai
   `{{ .ConfirmationURL }}`, yang mengembalikan token lewat _fragment_
   URL (`#access_token=…`) — bagian itu tidak pernah sampai ke server,
   jadi sistem ini tidak bisa membacanya. Ganti tautan di template jadi:

   - **Reset Password**:
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`
   - **Magic Link**:
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink`
   - **Invite User**:
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/reset-password`

   Sisi aplikasinya ada di [`src/app/auth/confirm/route.ts`](src/app/auth/confirm/route.ts):
   token ditukar jadi sesi, lalu user diantar ke `/reset-password` untuk
   membuat password baru. Tautan berlaku 1 jam dan sekali pakai.

### 2. Google Drive

Semua file dimiliki satu akun Google khusus tim (sebut saja **akun Drive tim**).
Anggota lain tidak perlu login ke akun ini — mereka mengakses file lewat sistem.

1. Pastikan akun itu sudah **2FA aktif**, dan backup code-nya disimpan di tempat
   aman (password manager tim).
2. Di Drive akun tersebut, buat folder **`Decaf Internal System`**. Buka
   foldernya, salin ID dari URL
   (`drive.google.com/drive/folders/`**`<INI_ID_NYA>`**) →
   `GOOGLE_DRIVE_ROOT_FOLDER_ID`.
3. Buka [Google Cloud Console](https://console.cloud.google.com) **sambil login
   sebagai akun Drive tim**:
   - Buat project baru, misal `decaf-internal`.
   - **APIs & Services → Library** → cari **Google Drive API** → **Enable**.
     Wajib — tanpa ini OAuth-nya bisa sukses tapi tiap panggilan Drive dibalas
     `403 accessNotConfigured`.
   - Di Library yang sama, cari **Google Docs API** → **Enable**. Dipakai
     fitur **dokumen dari template** (mengisi placeholder di Google Doc).
     Kasusnya persis sama dengan Drive API di atas: enable API itu setelan
     per-project, terpisah dari scope OAuth — tanpa ini pembuatan dokumen
     dibalas `403 accessNotConfigured` walau login Google-nya sehat.
     Scope-nya **tidak perlu ditambah**: `drive.file` sudah sah untuk Docs
     API selama aplikasi cuma menyentuh file yang dibuatnya sendiri, dan
     dokumen dari template selalu lahir dari `files.copy` milik aplikasi.
   - **Google Auth Platform** (nama baru untuk "OAuth consent screen") →
     **Overview**, isi nama aplikasi & email support, **Audience: External**.
     Di sub-menu **Audience**, tambahkan alamat akun Drive tim sebagai
     **Test user**. Di sub-menu **Data Access**, tambahkan scope
     `https://www.googleapis.com/auth/drive.file` saja — jangan yang lain
     (lihat catatan scope di bawah).
   - **Clients → Create client** → tipe **Web application**. Tambahkan
     `https://developers.google.com/oauthplayground` sebagai **Authorized
     redirect URI**. Salin Client ID & Client Secret.
4. Tukarkan jadi refresh token lewat
   [OAuth Playground](https://developers.google.com/oauthplayground):
   - Klik ⚙ (kanan atas) → centang **Use your own OAuth credentials** → isi
     Client ID & Secret.
   - Di panel kiri, kotak **"Input your own scopes"**, isi:
     `https://www.googleapis.com/auth/drive.file`
   - **Authorize APIs** → login sebagai akun Drive tim → muncul layar
     "Google hasn't verified this app" → **Advanced → Go to … (unsafe)**,
     normal untuk aplikasi yang belum diverifikasi → **Exchange authorization
     code for tokens** → salin **Refresh token**.
5. **Publish app ke Production.** Di **Google Auth Platform → Audience** →
   **Publish app**. **Jangan lewati langkah ini** — selama status masih
   *Testing*, refresh token kedaluwarsa otomatis tiap 7 hari, dan Drive akan
   berhenti bekerja sendiri seminggu setelah deploy dengan error
   `invalid_grant`. Karena scope-nya cuma `drive.file` (non-sensitive), publish
   ini **tidak memicu proses verifikasi Google** — langsung aktif. Kalau
   layarnya malah minta submit for verification, ada scope lain yang
   ketercentang di Data Access dan harus dibuang dulu.

> Scope `drive.file` sengaja dipilih (bukan `drive` penuh): aplikasi hanya bisa
> menyentuh file yang dibuatnya sendiri, tidak bisa membaca isi Drive lainnya.
> Konsekuensinya, `GOOGLE_DRIVE_ROOT_FOLDER_ID` yang dibuat manual lewat
> drive.google.com juga tidak akan terbaca oleh `files.get` — itu normal.
> Aplikasi tetap bisa menulis ke dalamnya (dipakai sebagai `parents` saat
> membuat file/folder), cuma tidak bisa membaca metadatanya sendiri. Kode di
> [`google-drive.ts`](src/lib/storage/google-drive.ts) memang tidak pernah
> memanggil `files.get` pada folder root, jadi ini tidak menghalangi apa pun.

### 3. Jalankan di lokal

```bash
cp .env.example .env.local
```

Isi semua nilainya, lalu:

```bash
npm install && npm run dev
```

Buka http://localhost:3000 dan login pakai salah satu akun yang dibuat di
langkah 1.

### 4. Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Di [vercel.com](https://vercel.com) → **Add New → Project** → import repo.
3. **Environment Variables**: masukkan semua isi `.env.local`. Jangan lupa
   `GOOGLE_*` — variabel ini tidak berprefiks `NEXT_PUBLIC_`, jadi hanya
   terbaca di sisi server.
4. Deploy.

---

## Struktur kode

```
src/
  app/
    (app)/            Halaman yang butuh login (dilindungi proxy.ts)
      page.tsx        Dasbor
      tasks/          Papan kanban + kalender
      clients/        Daftar & detail klien, project
      expenses/       Pengeluaran & reimburse
      documents/      Indeks semua dokumen
    login/            Halaman & action autentikasi
    api/documents/    Route unduh file (streaming dari Drive)
  components/         UI yang dipakai lintas fitur
  lib/
    storage/          StorageProvider + GoogleDriveProvider
    templates/        Placeholder & penomoran dokumen dari template
    supabase/         Client untuk browser & server
    actions/          Server action lintas fitur (dokumen, template)
  proxy.ts            Refresh sesi + penjaga route
supabase/schema.sql   Skema database
```

## Catatan operasional

- **Batas upload 512MB per file.** File dikirim langsung dari browser ke
  Google Drive lewat resumable upload session — server aplikasi tidak pernah
  memegang isi file, jadi plafon 4.5MB body request Vercel tidak berlaku.
  Kalau pengiriman langsung gagal (jaringan memblokir googleapis.com, CORS
  ditolak), file di bawah 4MB otomatis dicoba ulang lewat server sebagai
  fallback — di jalur itu plafon 4.5MB Vercel berlaku penuh.
- **Menghapus dokumen** memindahkan file ke Trash Drive, bukan menghapus
  permanen. Masih bisa dipulihkan 30 hari.
- **Dokumen dari template** (Dokumen → Template) lahir sebagai Google Doc,
  bukan PDF: dibuat, direview & disunting di Google Docs, baru difinalisasi
  jadi PDF lewat tombol "Jadikan PDF" — dan cuma super admin yang bisa
  menekannya. Supaya penyuntingannya benar-benar bisa dilakukan, folder
  root Drive tim perlu di-share sebagai **Editor** ke akun Google pribadi
  masing-masing anggota (sekali saja, manual di drive.google.com). Tanpa
  itu, tautan "Buka di Google Docs" mendarat di layar minta akses.
  Google Doc asli tidak menghitung kuota penyimpanan Drive; yang menghitung
  cuma PDF hasil finalisasi. Identitas perusahaan yang mengisi placeholder
  `{{perusahaan.*}}` (nama, alamat, rekening bank, NPWP) diatur lewat
  **Dokumen → Perusahaan** di dalam aplikasi — bisa diubah siapa saja yang
  login, tanpa perlu env var atau redeploy.
- **Menghapus klien** ikut menghapus project & tugas terkait
  (`ON DELETE CASCADE`), tapi file di Drive tetap ada.
- **Pantau kuota Drive.** Kalau sudah mendekati ~12GB (80% dari 15GB), saatnya
  upgrade ke Google Workspace atau tulis `StorageProvider` baru.
- **RLS saat ini**: semua anggota tim yang sudah login bisa membaca & mengubah
  semua data. Ini disengaja untuk tim bertiga. Kalau tim membesar, ubah policy
  di bagian akhir `supabase/schema.sql`.

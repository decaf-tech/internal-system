# Decaf — Sistem Internal

Manajemen tugas, klien, dan operasional untuk tim Decaf (Abi, Ojan, Lija).

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
3. Buka **Project Settings → API**, salin:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / `publishable` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Buat 3 akun tim** lewat **Authentication → Users → Add user**
(centang _Auto Confirm User_ supaya tidak perlu verifikasi email).
Isi **User Metadata** dengan `{"full_name": "Nama Lengkap"}` — trigger di
database akan otomatis membuat baris `profiles`.

Terakhir, set peran tiap orang lewat SQL Editor:

```sql
update profiles set role = 'founder' where full_name = 'Abi';
update profiles set role = 'coo'     where full_name = 'Ojan';
update profiles set role = 'admin'   where full_name = 'Lija';
```

### 2. Google Drive

Semua file dimiliki akun **akun-drive-tim**. Ojan & Lija tidak perlu
login ke akun ini — mereka mengakses file lewat sistem.

1. Pastikan akun itu sudah **2FA aktif**, dan backup code-nya disimpan di tempat
   aman (password manager tim).
2. Di Drive akun tersebut, buat folder **`Decaf Internal System`**. Buka
   foldernya, salin ID dari URL
   (`drive.google.com/drive/folders/`**`<INI_ID_NYA>`**) →
   `GOOGLE_DRIVE_ROOT_FOLDER_ID`.
3. Buka [Google Cloud Console](https://console.cloud.google.com) **sambil login
   sebagai akun Drive tim**:
   - Buat project baru, misal `decaf-internal`.
   - **APIs & Services → Library** → aktifkan **Google Drive API**.
   - **OAuth consent screen** → pilih **External**, isi nama aplikasi & email.
     Tambahkan `akun-drive-tim` sebagai **Test user**. Tidak perlu
     publikasi/verifikasi — aplikasi ini hanya dipakai satu akun.
   - **Credentials → Create Credentials → OAuth client ID** → tipe
     **Web application**. Tambahkan
     `https://developers.google.com/oauthplayground` sebagai **Authorized
     redirect URI**. Salin Client ID & Client Secret.
4. Tukarkan jadi refresh token lewat
   [OAuth Playground](https://developers.google.com/oauthplayground):
   - Klik ⚙ (kanan atas) → centang **Use your own OAuth credentials** → isi
     Client ID & Secret.
   - Di panel kiri, isi scope: `https://www.googleapis.com/auth/drive.file`
   - **Authorize APIs** → login sebagai akun Drive tim → **Exchange
     authorization code for tokens** → salin **Refresh token**.

> Scope `drive.file` sengaja dipilih (bukan `drive` penuh): aplikasi hanya bisa
> menyentuh file yang dibuatnya sendiri, tidak bisa membaca isi Drive lainnya.

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
    supabase/         Client untuk browser & server
    actions/          Server action lintas fitur (dokumen)
  proxy.ts            Refresh sesi + penjaga route
supabase/schema.sql   Skema database
```

## Catatan operasional

- **Batas upload 4MB per file.** Ini batas body request serverless Vercel, bukan
  batas Drive. Untuk file lebih besar perlu upload langsung dari browser ke
  Drive (resumable upload) — belum diimplementasikan.
- **Menghapus dokumen** memindahkan file ke Trash Drive, bukan menghapus
  permanen. Masih bisa dipulihkan 30 hari.
- **Menghapus klien** ikut menghapus project & tugas terkait
  (`ON DELETE CASCADE`), tapi file di Drive tetap ada.
- **Pantau kuota Drive.** Kalau sudah mendekati ~12GB (80% dari 15GB), saatnya
  upgrade ke Google Workspace atau tulis `StorageProvider` baru.
- **RLS saat ini**: semua anggota tim yang sudah login bisa membaca & mengubah
  semua data. Ini disengaja untuk tim bertiga. Kalau tim membesar, ubah policy
  di bagian akhir `supabase/schema.sql`.

// Pembacaan environment variable terpusat, dengan pesan error yang jelas.
// Tujuannya: kalau ada env var yang belum diisi, errornya menyebut nama
// variabelnya — bukan "undefined is not a function" di tengah request.

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Environment variable ${name} belum diisi. Lihat .env.example dan README untuk langkah setup.`,
    );
  }
  return value;
}

// Supabase menamai kunci publik ini "anon key" (proyek lama) atau
// "publishable key" (proyek baru). Keduanya diterima supaya setup tidak
// mentok cuma karena beda nama di dashboard.
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseUrl = () =>
  required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);

export const supabaseKey = () =>
  required("NEXT_PUBLIC_SUPABASE_ANON_KEY", supabaseAnonKey);

// --- Google Drive (server-side saja, jangan pernah diprefiks NEXT_PUBLIC_) ---

export const googleDrive = () => ({
  clientId: required("GOOGLE_CLIENT_ID", process.env.GOOGLE_CLIENT_ID),
  clientSecret: required(
    "GOOGLE_CLIENT_SECRET",
    process.env.GOOGLE_CLIENT_SECRET,
  ),
  refreshToken: required(
    "GOOGLE_REFRESH_TOKEN",
    process.env.GOOGLE_REFRESH_TOKEN,
  ),
  // ID folder root di Drive tempat semua file sistem ini disimpan.
  // Dibuat manual sekali di Drive, lalu ID-nya disalin ke env.
  rootFolderId: required(
    "GOOGLE_DRIVE_ROOT_FOLDER_ID",
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
  ),
});

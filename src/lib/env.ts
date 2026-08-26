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

// --- Prototipe statis (server-side saja) ------------------------------

/**
 * Folder tempat isi prototipe dibongkar.
 *
 * Ini satu-satunya berkas milik aplikasi yang hidup di disk server, bukan
 * di Supabase atau Drive — alasannya di kepala migration 014. Karena itu
 * ia juga satu-satunya yang butuh volume Docker (lihat `docker-compose.yml`):
 * tanpa volume, isinya lenyap setiap kali stack di-redeploy.
 *
 * Punya nilai bawaan, tidak pakai `required()`: yang belum menyetel apa pun
 * — laptop yang baru meng-clone repo — harus tetap bisa `npm run dev`
 * tanpa mengurus env dulu.
 */
export const prototypesDir = () =>
  process.env.PROTOTYPES_DIR ?? "./.data/prototypes";

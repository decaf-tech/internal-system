import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseKey, supabaseUrl } from "@/lib/env";

// Di Next.js 16 file ini bernama `proxy.ts` (sebelumnya `middleware.ts`).
// Dua tugasnya:
//   1. Menyegarkan token Supabase yang hampir kedaluwarsa, lalu menulis
//      cookie hasil refresh ke response — Server Component tidak bisa
//      menulis cookie, jadi kalau ini tidak ada, user akan logout sendiri.
//   2. Menendang pengunjung yang belum login ke /login.

// Sejak situs publik menempati akar, daftarnya dibalik: yang didaftarkan
// adalah wilayah yang DIJAGA, bukan yang dibebaskan. Dengan bentuk
// sebelumnya (daftar putih `PUBLIC_PATHS`), setiap halaman pemasaran baru
// diam-diam jadi terkunci sampai seseorang ingat mendaftarkannya — dan
// gejalanya (pengunjung dilempar ke /login) baru terlihat dari luar sesi
// pengembangan, karena di laptop kita hampir selalu sudah punya sesi.
const PROTECTED_PREFIX = "/backoffice";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Header anti-cache dari library. Wajib diteruskan: tanpa ini,
        // CDN bisa menyimpan response berisi cookie sesi satu orang dan
        // menyajikannya ke orang lain.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Panggilan ini yang memicu refresh token. Jangan dihapus, dan jangan
  // sisipkan kode lain di antara createServerClient dan baris ini.
  //
  // Dibungkus try/catch karena kegagalan jaringan ke Supabase melempar
  // exception, dan proxy yang melempar akan membuat *seluruh* aplikasi
  // balas 500 — termasuk halaman login. Anggap saja belum login.
  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (error) {
    console.error("Gagal memverifikasi sesi ke Supabase:", error);
  }

  const { pathname } = request.nextUrl;
  const isProtected =
    pathname === PROTECTED_PREFIX ||
    pathname.startsWith(`${PROTECTED_PREFIX}/`);

  if (!user && isProtected) {
    const loginUrl = new URL("/login", request.url);
    // Simpan tujuan awal supaya setelah login user dikembalikan ke sana.
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL(PROTECTED_PREFIX, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Jalankan di semua route kecuali file statis dan gambar.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

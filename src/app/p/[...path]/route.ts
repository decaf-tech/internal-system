import type { Readable } from "node:stream";
import { createClient } from "@/lib/supabase/server";
import { assetStream, findAsset, readAsset } from "@/lib/prototypes/storage";
import { prepareHtml } from "@/lib/prototypes/html";
import { isHtmlPath, mimeForPath } from "@/lib/prototypes/types";

/**
 * Penyaji prototipe untuk publik: decaf.id/p/<slug>/…
 *
 * Route ini terbuka tanpa login — `src/proxy.ts` cuma menjaga awalan
 * `/backoffice`, jadi tidak ada yang perlu diubah di sana. Yang menjaga
 * pintunya adalah kolom `is_public`, dan pemeriksaannya ada di dalam
 * fungsi basis data, bukan di sini (lihat §3 migration 014).
 *
 * Catch-all wajib, bukan `[slug]/[[...path]]`: bentuk ini menangani
 * `/p/<slug>` dan `/p/<slug>/a/b.css` dengan satu berkas dan satu aturan
 * pencocokan, tanpa segmen opsional yang perilakunya berbeda antara
 * keduanya.
 */
export async function GET(
  request: Request,
  { params }: RouteContext<"/p/[...path]">,
) {
  const { path: segments } = await params;
  const [slug, ...rest] = segments;

  if (!slug) return notFound();

  const supabase = await createClient();

  // Lewat fungsi `security definer`, BUKAN select biasa. Tabelnya sengaja
  // tidak punya policy `anon` sama sekali supaya daftar prototipe tidak
  // bisa diunduh siapa pun yang memegang kunci publik Supabase — dan
  // kunci itu memang ada di dalam bundle situs ini. Uraian lengkapnya di
  // §3 migration 014.
  const { data, error } = await supabase
    .rpc("prototype_by_slug", { lookup_slug: slug })
    .maybeSingle<{ id: string; entry_point: string }>();

  if (error) {
    console.error("Gagal mencari prototipe:", error);
    return new Response("Gagal memuat prototipe.", { status: 500 });
  }

  // Yang belum dipublikasikan dan yang memang tidak ada dibalas dengan
  // response yang sama persis. Membedakannya berarti siapa pun bisa
  // menguji tebakan slug sampai menemukan yang benar, lalu tinggal
  // menunggu sampai dipublikasikan.
  if (!data) return notFound();

  const rootPath = `/p/${encodeURIComponent(slug)}`;

  // TIDAK ada redirect untuk menambah garis miring akhir di sini — itu
  // pernah dicoba dan berakhir baku-tembak dengan perilaku bawaan
  // Next.js sendiri: `trailingSlash` defaultnya `false`, jadi Next.js
  // MEMBUANG garis miring akhir pada permintaan apa pun yang punya itu,
  // sementara redirect di sini justru MENAMBAHKANNYA — dua-duanya saling
  // redirect tanpa henti.
  //
  // Untungnya redirect itu tidak pernah perlu ada: `<base href>` yang
  // disisipkan `prepareHtml()` (lihat lib/prototypes/html.ts) menentukan
  // bagaimana path relatif di dalam HTML diselesaikan, TIDAK BERGANTUNG
  // pada apakah URL asli di address bar berakhir garis miring atau tidak.
  // `/p/<slug>` dan `/p/<slug>/` sama-sama menyajikan entry point yang
  // sama, dengan hasil yang identik.
  const requestPath = rest.length === 0 ? data.entry_point : rest.join("/");

  const asset = await findAsset(data.id, requestPath);
  if (!asset) return notFound();

  const mimeType = mimeForPath(asset.relativePath);

  const headers = new Headers({
    "Content-Type": mimeType,
    // Prototipe tidak boleh muncul di hasil pencarian: satu-satunya cara
    // orang sampai ke sini adalah tautan yang dikirim tim sendiri. Header
    // ini yang menjadikannya sungguhan, bukan sekadar "tidak ditautkan".
    //
    // Sengaja BUKAN lewat `Disallow` di robots.txt — disallow menghentikan
    // crawler sebelum ia sempat membaca perintah ini, sehingga URL yang
    // terlanjur bocor justru bisa terindeks tanpa isi.
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Content-Type-Options": "nosniff",
    // Pendek saja: prototipe sering diunggah ulang beberapa kali dalam
    // satu sesi kerja, dan yang paling mahal adalah calon klien yang
    // membuka tautan lalu melihat versi sebelum revisi.
    "Cache-Control": "public, max-age=60, must-revalidate",
  });

  if (isHtmlPath(asset.relativePath)) {
    // `<base>` menunjuk folder DOKUMEN INI, bukan akar prototipe — supaya
    // `href="../people/"` di dalam `hr/attendance/index.html` diselesaikan
    // dari `hr/attendance/`, persis seperti kalau prototipenya dihosting
    // di akar domainnya sendiri.
    const directory = asset.relativePath.slice(
      0,
      asset.relativePath.lastIndexOf("/") + 1,
    );

    const html = prepareHtml(
      (await readAsset(asset.absolutePath)).toString("utf8"),
      rootPath,
      `${rootPath}/${encodeURI(directory)}`,
    );
    return new Response(html, { headers });
  }

  headers.set("Content-Length", String(asset.sizeBytes));

  // Dialirkan, tidak dibaca utuh: satu video atau gambar besar tidak boleh
  // berarti seluruh isinya nangkring di memori server per pengunjung.
  const stream = assetStream(asset.absolutePath) as unknown as Readable;
  return new Response(stream as unknown as ReadableStream, { headers });
}

function notFound() {
  return new Response("Prototipe tidak ditemukan.", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

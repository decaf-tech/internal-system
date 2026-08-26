import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { extractPrototypeZip, PrototypeZipError } from "@/lib/prototypes/zip";
import { removePrototypeFiles } from "@/lib/prototypes/storage";
import { MAX_ZIP_BYTES, slugError, slugify } from "@/lib/prototypes/types";

/**
 * Terima zip prototipe.
 *
 * Route handler, BUKAN Server Action, dan itu yang jadi alasan berkas ini
 * ada: body Server Action dibatasi `serverActions.bodySizeLimit` di
 * `next.config.ts` (4.5MB), sementara hasil build dengan beberapa gambar
 * dengan mudah melewatinya. Route handler tidak ikut batas itu.
 *
 * Konsekuensinya, route ini berada di luar `/backoffice` — jadi penjagaan
 * di `src/proxy.ts` tidak menyentuhnya dan sesinya harus diperiksa
 * sendiri di sini, persis seperti `api/documents/[id]/download/route.ts`.
 *
 * Melayani dua hal sekaligus: prototipe baru (tanpa `id`), dan mengganti
 * isi prototipe yang sudah ada (dengan `id`). Keduanya berbagi seluruh
 * jalur validasi & ekstraksi, jadi memisahkannya cuma akan melahirkan dua
 * salinan aturan yang sama.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Sesi habis. Silakan masuk lagi." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch (error) {
    console.error("Gagal membaca kiriman prototipe:", error);
    return Response.json(
      { error: "Kiriman tidak bisa dibaca. Coba unggah ulang." },
      { status: 400 },
    );
  }

  const zip = form.get("zip");
  if (!(zip instanceof File) || zip.size === 0) {
    return Response.json({ error: "Berkas zip belum dipilih." }, { status: 400 });
  }
  if (zip.size > MAX_ZIP_BYTES) {
    return Response.json(
      {
        error: `Ukuran zip melebihi ${Math.round(MAX_ZIP_BYTES / 1024 / 1024)}MB.`,
      },
      { status: 400 },
    );
  }

  const existingId = text(form, "id");

  // Jalur ganti-isi: cukup zip-nya, keterangan lain tidak ikut disentuh.
  if (existingId) {
    return replaceContent(supabase, user.id, existingId, zip);
  }

  const name = text(form, "name") ?? zip.name.replace(/\.zip$/i, "");
  if (!name) {
    return Response.json({ error: "Nama prototipe wajib diisi." }, { status: 400 });
  }

  const slug = text(form, "slug") ?? slugify(name);
  const badSlug = slugError(slug);
  if (badSlug) return Response.json({ error: badSlug }, { status: 400 });

  const clientId = text(form, "client_id");

  // Baris dulu, isi belakangan: `id`-nya yang jadi nama folder, dan
  // membuatnya sendiri di sini berarti ada dua tempat yang memutuskan
  // bentuk sebuah id. Kalau ekstraksi gagal sesudah ini, barisnya dihapus
  // lagi di blok catch.
  const { data: created, error: insertError } = await supabase
    .from("prototypes")
    .insert({
      name,
      slug,
      client_id: clientId,
      uploaded_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    console.error("Gagal menyimpan prototipe:", insertError);
    return Response.json(
      {
        error:
          insertError?.code === "23505"
            ? `Alamat "${slug}" sudah dipakai prototipe lain. Ganti alamatnya.`
            : "Gagal menyimpan prototipe.",
      },
      { status: 400 },
    );
  }

  const id = created.id as string;

  try {
    const result = await extractPrototypeZip(id, Buffer.from(await zip.arrayBuffer()));

    await supabase
      .from("prototypes")
      .update({
        entry_point: result.entryPoint,
        size_bytes: result.sizeBytes,
        file_count: result.fileCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    await logActivity(supabase, {
      actorId: user.id,
      entityType: "prototype",
      entityId: id,
      action: "created",
      summary: `mengunggah prototipe "${name}"`,
    });

    return Response.json({ id, slug });
  } catch (error) {
    // Barisnya belum pernah terlihat siapa pun (belum publik, halaman
    // daftarnya belum di-refresh), jadi menghapusnya lebih baik daripada
    // meninggalkan prototipe kosong yang membuka jadi 404.
    await supabase.from("prototypes").delete().eq("id", id);
    await removePrototypeFiles(id).catch(() => {});

    return zipErrorResponse(error);
  }
}

/** Unggah ulang isi prototipe yang sudah ada. Tautannya tidak berubah. */
async function replaceContent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  id: string,
  zip: File,
) {
  const { data: existing } = await supabase
    .from("prototypes")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return Response.json({ error: "Prototipe tidak ditemukan." }, { status: 404 });
  }

  try {
    const result = await extractPrototypeZip(id, Buffer.from(await zip.arrayBuffer()));

    await supabase
      .from("prototypes")
      .update({
        entry_point: result.entryPoint,
        size_bytes: result.sizeBytes,
        file_count: result.fileCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    await logActivity(supabase, {
      actorId: userId,
      entityType: "prototype",
      entityId: id,
      action: "updated",
      summary: `mengganti isi prototipe "${existing.name as string}"`,
    });

    return Response.json({ id });
  } catch (error) {
    // Di sini barisnya TIDAK dihapus: tautannya mungkin sudah dikirim ke
    // klien. `extractPrototypeZip` merakit di folder sementara dan baru
    // menukarnya di langkah terakhir, jadi kegagalan berarti isi yang lama
    // masih utuh dan masih dilayani.
    return zipErrorResponse(error);
  }
}

function zipErrorResponse(error: unknown) {
  if (error instanceof PrototypeZipError) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  console.error("Gagal membongkar zip prototipe:", error);
  return Response.json(
    { error: "Gagal membongkar zip prototipe." },
    { status: 500 },
  );
}

function text(form: FormData, key: string): string | null {
  const value = form.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

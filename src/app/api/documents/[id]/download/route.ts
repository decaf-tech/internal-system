import { createClient } from "@/lib/supabase/server";
import { getStorage } from "@/lib/storage";

/**
 * Menyalurkan file dari Google Drive ke browser lewat server kita sendiri.
 *
 * Kenapa tidak pakai link Drive langsung? Karena file di Drive tetap privat
 * (tidak pernah di-share ke publik). Route ini yang memastikan cuma anggota
 * tim yang sudah login bisa mengunduhnya.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/documents/[id]/download">,
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: doc } = await supabase
    .from("documents")
    .select("drive_file_id, name, mime_type")
    .eq("id", id)
    .single();

  if (!doc) {
    return new Response("Dokumen tidak ditemukan", { status: 404 });
  }

  try {
    const file = await getStorage().download(doc.drive_file_id);

    return new Response(file.stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": doc.mime_type ?? file.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.name)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Gagal mengunduh dari Drive:", error);
    return new Response("Gagal mengambil file dari Google Drive", {
      status: 502,
    });
  }
}

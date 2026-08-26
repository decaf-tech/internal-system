"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { removePrototypeFiles } from "@/lib/prototypes/storage";
import { slugError } from "@/lib/prototypes/types";

export type FormState = { error: string | null; ok?: true };

// Unggahnya TIDAK di sini melainkan di `api/prototypes/upload/route.ts` —
// body Server Action dibatasi 4.5MB oleh `next.config.ts`, dan zip hasil
// build dengan beberapa gambar sudah melewatinya. Yang tinggal di berkas
// ini cuma perubahan yang muatannya kecil.

/** Ubah keterangan prototipe: nama, alamat tautan, klien yang ditautkan. */
export async function updatePrototype(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Nama prototipe wajib diisi." };

  const slug = String(formData.get("slug") ?? "").trim();
  const badSlug = slugError(slug);
  if (badSlug !== null) return { error: badSlug };

  const clientId = String(formData.get("client_id") ?? "").trim();

  const { error } = await supabase
    .from("prototypes")
    .update({
      name,
      slug,
      client_id: clientId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Gagal mengubah prototipe:", error);
    return {
      error:
        error.code === "23505"
          ? `Alamat "${slug}" sudah dipakai prototipe lain.`
          : "Gagal menyimpan perubahan.",
    };
  }

  await logActivity(supabase, {
    actorId: user.id,
    entityType: "prototype",
    entityId: id,
    action: "updated",
    summary: `mengubah prototipe "${name}"`,
  });

  revalidatePath("/backoffice/documents/prototypes");
  return { error: null, ok: true };
}

/**
 * Buka atau tutup akses publik.
 *
 * Ini satu-satunya gerbangnya: selama `is_public` false, `prototype_by_slug`
 * tidak mengembalikan apa pun dan route penyaji membalas 404 — bahkan untuk
 * orang yang tahu persis slug-nya.
 */
export async function setPrototypePublic(id: string, isPublic: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: prototype } = await supabase
    .from("prototypes")
    .select("name, published_at")
    .eq("id", id)
    .maybeSingle();

  if (!prototype) return;

  await supabase
    .from("prototypes")
    .update({
      is_public: isPublic,
      // Dicatat sekali, saat pertama terbit. Menutup lalu membuka lagi
      // tidak menggeser tanggalnya — yang ingin diketahui belakangan
      // adalah "sejak kapan ini ada di luar sana", bukan kapan tombolnya
      // terakhir disentuh.
      published_at:
        isPublic && !prototype.published_at
          ? new Date().toISOString()
          : (prototype.published_at as string | null),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  await logActivity(supabase, {
    actorId: user.id,
    entityType: "prototype",
    entityId: id,
    action: "status_changed",
    summary: `${isPublic ? "mempublikasikan" : "menutup"} prototipe "${prototype.name as string}"`,
  });

  revalidatePath("/backoffice/documents/prototypes");
}

/** Hapus prototipe berikut seluruh berkasnya di disk. */
export async function deletePrototype(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: prototype } = await supabase
    .from("prototypes")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  if (!prototype) return;

  // Baris dulu, berkas belakangan. Kalau urutannya dibalik dan penghapusan
  // baris gagal, yang tersisa adalah prototipe yang masih terdaftar publik
  // tapi seluruh isinya sudah hilang — pengunjung yang memegang tautannya
  // mendapat 404 tanpa ada yang tahu kenapa.
  const { error } = await supabase.from("prototypes").delete().eq("id", id);
  if (error) {
    console.error("Gagal menghapus prototipe:", error);
    return;
  }

  await removePrototypeFiles(id).catch((error) =>
    console.error("Gagal menghapus berkas prototipe:", error),
  );

  await logActivity(supabase, {
    actorId: user.id,
    entityType: "prototype",
    entityId: id,
    action: "deleted",
    summary: `menghapus prototipe "${prototype.name as string}"`,
  });

  revalidatePath("/backoffice/documents/prototypes");
}

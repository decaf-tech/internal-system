"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStorage, getTemplateDocs } from "@/lib/storage";
import { logActivity } from "@/lib/activity";
import { ensureAppFolder } from "@/lib/documents/paths";
import { isGoogleDoc } from "@/lib/documents/types";
import {
  FIELD_KEY_PATTERN,
  TEMPLATE_FIELD_TYPES,
  fieldKeyError,
  type TemplateField,
  type TemplateFieldType,
} from "@/lib/templates/types";

export type FormState = { error: string | null; ok?: true };

/** Folder tempat semua template disimpan di Drive & di penjelajah berkas. */
const TEMPLATE_FOLDER = ["Template"];

/**
 * Daftarkan sebuah berkas yang sudah diunggah jadi template.
 *
 * Sumbernya HARUS berkas yang masuk lewat aplikasi ini. Scope OAuth-nya
 * `drive.file` — aplikasi cuma boleh menyentuh file yang dibuatnya
 * sendiri — jadi dokumen yang diunggah manual lewat drive.google.com akan
 * gagal disalin nanti, dengan pesan yang tidak menyebut sebabnya sama
 * sekali. Karena itu pilihannya diambil dari tabel `documents`, bukan dari
 * kotak isian ID Drive.
 *
 * Berkas non-Google (.docx dari Word) disalin sambil dikonversi, jadi
 * alurnya untuk orangnya tetap satu langkah: susun template di Word atau
 * Docs → unggah seperti file biasa → daftarkan di sini.
 */
export async function createTemplate(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const docs = getTemplateDocs();
  if (!docs) {
    return { error: "Penyimpanan yang aktif tidak mendukung dokumen template." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  const parsed = readForm(formData);
  // `!== null`, bukan sekadar truthy: pesan kesalahan bertipe string
  // tetap bisa bernilai "", jadi TypeScript tidak menyempitkan uniannya
  // dari pengecekan truthy saja.
  if (parsed.error !== null) return { error: parsed.error };

  const sourceId = String(formData.get("source_document_id") ?? "");
  if (!sourceId) return { error: "Pilih berkas yang jadi templatenya." };

  const { data: source } = await supabase
    .from("documents")
    .select("name, mime_type, drive_file_id")
    .eq("id", sourceId)
    .maybeSingle();

  if (!source) return { error: "Berkas sumber tidak ditemukan." };

  // Selalu disalin, bahkan kalau sumbernya sudah Google Doc: templatenya
  // jadi berkas tersendiri di folder Template, sehingga menyunting atau
  // menghapus berkas asal (mis. lampiran di sebuah tugas) tidak diam-diam
  // mengubah dokumen yang terbit sesudahnya.
  let copy;
  try {
    copy = await docs.copyDoc({
      fileId: source.drive_file_id as string,
      name: `Template — ${parsed.values.name}`,
      folderPath: TEMPLATE_FOLDER,
      convert: !isGoogleDoc(source.mime_type as string | null),
    });
  } catch (error) {
    console.error("Gagal menyalin berkas jadi template:", error);
    return {
      error:
        "Gagal menyalin berkas jadi template. Pastikan Google Docs API sudah di-Enable, dan berkasnya memang diunggah lewat aplikasi ini.",
    };
  }

  const { data: created, error } = await supabase
    .from("document_templates")
    .insert({
      ...parsed.values,
      drive_file_id: copy.id,
      drive_web_link: copy.webLink,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !created) {
    await getStorage().remove(copy.id).catch(() => {});
    console.error("Gagal menyimpan template:", error);
    return {
      error:
        error?.code === "23505"
          ? "Kode dokumen itu sudah dipakai template lain."
          : "Gagal menyimpan template.",
    };
  }

  // Salinannya ikut tercatat sebagai dokumen supaya muncul di penjelajah
  // berkas — kalau tidak, satu-satunya cara membukanya adalah lewat
  // tautan di halaman ini.
  await supabase.from("documents").insert({
    name: copy.name,
    mime_type: copy.mimeType,
    size_bytes: copy.sizeBytes,
    drive_file_id: copy.id,
    drive_web_link: copy.webLink,
    folder_id: await ensureAppFolder(TEMPLATE_FOLDER),
    uploaded_by: user.id,
  });

  await logActivity(supabase, {
    actorId: user.id,
    entityType: "document",
    entityId: created.id as string,
    action: "created",
    summary: `menambah template dokumen "${parsed.values.name}"`,
  });

  revalidatePath("/documents/templates");
  revalidatePath("/", "layout");
  return { error: null, ok: true };
}

/** Ubah keterangan template. Berkas Google Doc-nya tidak disentuh. */
export async function updateTemplate(
  templateId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  const parsed = readForm(formData);
  // `!== null`, bukan sekadar truthy: pesan kesalahan bertipe string
  // tetap bisa bernilai "", jadi TypeScript tidak menyempitkan uniannya
  // dari pengecekan truthy saja.
  if (parsed.error !== null) return { error: parsed.error };

  const { error } = await supabase
    .from("document_templates")
    .update({
      ...parsed.values,
      is_active: formData.get("is_active") === "on",
    })
    .eq("id", templateId);

  if (error) {
    console.error("Gagal mengubah template:", error);
    return {
      error:
        error.code === "23505"
          ? "Kode dokumen itu sudah dipakai template lain."
          : "Gagal menyimpan perubahan.",
    };
  }

  await logActivity(supabase, {
    actorId: user.id,
    entityType: "document",
    entityId: templateId,
    action: "updated",
    summary: `mengubah template dokumen "${parsed.values.name}"`,
  });

  revalidatePath("/documents/templates");
  return { error: null, ok: true };
}

/**
 * Hapus template. Berkas Google Doc-nya ikut ke Trash Drive.
 *
 * Dokumen yang sudah pernah terbit dari template ini TIDAK ikut terhapus —
 * `documents.template_id` cuma jadi null (ON DELETE SET NULL). Invoice
 * yang sudah dikirim ke klien tidak boleh hilang cuma karena templatenya
 * dirapikan setahun kemudian.
 */
export async function deleteTemplate(templateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: template } = await supabase
    .from("document_templates")
    .select("name, drive_file_id")
    .eq("id", templateId)
    .maybeSingle();

  if (!template) return;

  await supabase.from("document_templates").delete().eq("id", templateId);
  await supabase
    .from("documents")
    .delete()
    .eq("drive_file_id", template.drive_file_id as string);
  await getStorage()
    .remove(template.drive_file_id as string)
    .catch((error) => console.error("Gagal menghapus berkas template:", error));

  await logActivity(supabase, {
    actorId: user.id,
    entityType: "document",
    entityId: templateId,
    action: "deleted",
    summary: `menghapus template dokumen "${template.name as string}"`,
  });

  revalidatePath("/documents/templates");
  revalidatePath("/", "layout");
}

/**
 * Berkas yang bisa dijadikan template: dokumen teks yang diunggah lewat
 * aplikasi ini. Gambar, PDF, dan zip tidak bisa — Drive tidak bisa
 * mengubahnya jadi Google Doc yang placeholdernya bisa diisi.
 */
const SOURCE_MIME_PREFIXES = [
  "application/vnd.google-apps.document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml",
  "application/msword",
  "application/vnd.oasis.opendocument.text",
  "application/rtf",
  "text/",
];

export async function templateSourceChoices(): Promise<
  { id: string; name: string; mimeType: string | null }[]
> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("documents")
    .select("id, name, mime_type")
    .order("created_at", { ascending: false })
    .limit(200);

  return (data ?? [])
    .filter((row) =>
      SOURCE_MIME_PREFIXES.some((prefix) =>
        (row.mime_type as string | null)?.startsWith(prefix),
      ),
    )
    .map((row) => ({
      id: row.id as string,
      name: row.name as string,
      mimeType: (row.mime_type as string | null) ?? null,
    }));
}

/** Bagian form yang sama antara tambah & ubah. */
function readForm(formData: FormData):
  | { error: string; values: null }
  | {
      error: null;
      values: {
        name: string;
        description: string | null;
        output_name: string;
        number_prefix: string | null;
        fields: TemplateField[];
      };
    } {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Nama template wajib diisi.", values: null };

  const prefix = String(formData.get("number_prefix") ?? "")
    .trim()
    .toUpperCase();
  if (prefix && !/^[A-Z0-9]{2,6}$/.test(prefix)) {
    return {
      error: "Kode dokumen 2–6 huruf/angka, mis. INV atau PKS.",
      values: null,
    };
  }

  const fields = readFields(formData);
  if (fields.error !== null) return { error: fields.error, values: null };

  return {
    error: null,
    values: {
      name,
      description: text(formData, "description"),
      output_name:
        text(formData, "output_name") ?? "{{dokumen.judul}} {{dokumen.nomor}}",
      number_prefix: prefix || null,
      fields: fields.values,
    },
  };
}

/**
 * Isian manual datang sebagai tiga array sejajar (`field_key[]`,
 * `field_label[]`, …) — bentuk yang keluar dari daftar baris yang bisa
 * ditambah-kurangi di form, tanpa perlu JSON yang dirakit di browser.
 */
function readFields(
  formData: FormData,
): { error: string; values: null } | { error: null; values: TemplateField[] } {
  const keys = formData.getAll("field_key").map((v) => String(v).trim());
  const labels = formData.getAll("field_label").map((v) => String(v).trim());
  const types = formData.getAll("field_type").map((v) => String(v));
  const requireds = formData.getAll("field_required").map((v) => String(v));
  const defaults = formData.getAll("field_default").map((v) => String(v));

  const fields: TemplateField[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index].toLowerCase();
    // Baris yang ditambah lalu dibiarkan kosong tinggal dilewati, bukan
    // dijadikan pesan kesalahan.
    if (!key && !labels[index]) continue;

    const keyError = fieldKeyError(key);
    if (keyError) return { error: keyError, values: null };
    if (seen.has(key)) {
      return { error: `Placeholder "${key}" ditulis dua kali.`, values: null };
    }
    seen.add(key);

    const type = types[index] as TemplateFieldType;

    fields.push({
      key,
      label: labels[index] || key,
      type: TEMPLATE_FIELD_TYPES.includes(type) ? type : "text",
      required: requireds[index] === "1",
      default: defaults[index] ?? "",
    });
  }

  const invalid = fields.find((field) => !FIELD_KEY_PATTERN.test(field.key));
  if (invalid) {
    return { error: `Placeholder "${invalid.key}" tidak sah.`, values: null };
  }

  return { error: null, values: fields };
}

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

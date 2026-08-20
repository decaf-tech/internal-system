"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStorage, getTemplateDocs } from "@/lib/storage";
import { getCompanySettings } from "@/lib/company";
import { logActivity } from "@/lib/activity";
import { todayJakarta } from "@/lib/format";
import { linkFolderPath, targetColumns } from "@/lib/documents/paths";
import { isGoogleDoc } from "@/lib/documents/types";
import type { DocumentLink } from "@/lib/documents/types";
import {
  buildPlaceholders,
  loadSources,
  nextDocNumber,
} from "@/lib/templates/context";
import {
  parseTemplateFields,
  resolvePlaceholders,
  tidyOutputName,
  type TemplateField,
} from "@/lib/templates/types";

/**
 * Membuat dokumen dari template, dan memfinalisasinya jadi PDF.
 *
 * Lintas fitur — panel dokumen yang memanggilnya terpasang di klien,
 * project, tugas, catatan, rapat, dan tagihan — jadi tinggal di
 * `lib/actions` bersama `documents.ts`, bukan di folder satu halaman.
 * Pengelolaan templatenya sendiri (tambah/ubah/hapus) ada di
 * `app/backoffice/documents/templates/actions.ts`, karena cuma dipakai halaman
 * itu.
 */

/** Bentuk template yang dikirim ke browser — tanpa kolom internal. */
export type TemplateChoice = {
  id: string;
  name: string;
  description: string | null;
  numberPrefix: string | null;
  fields: TemplateField[];
};

/**
 * Konteks kecil yang dibutuhkan panel dokumen untuk memutuskan tombol apa
 * yang ditampilkan. Dipisah dari `listTemplates` supaya panel yang cuma
 * menampilkan lampiran biasa tidak ikut menarik daftar field tiap
 * template.
 */
export async function templatePanelContext(): Promise<{
  available: boolean;
  hasTemplates: boolean;
  canFinalize: boolean;
}> {
  const off = { available: false, hasTemplates: false, canFinalize: false };
  if (!getTemplateDocs()) return off;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return off;

  const [{ count }, { data: profile }] = await Promise.all([
    supabase
      .from("document_templates")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("profiles")
      .select("is_super_admin")
      .eq("id", user.id)
      .single(),
  ]);

  return {
    available: true,
    hasTemplates: (count ?? 0) > 0,
    canFinalize: profile?.is_super_admin === true,
  };
}

/** Template aktif + nilai placeholder yang sudah terisi untuk tautan ini. */
export async function templateOptions(link: DocumentLink): Promise<{
  templates: TemplateChoice[];
  values: Record<string, string>;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { templates: [], values: {} };

  const [{ data: rows }, sources, authorName, company] = await Promise.all([
    supabase
      .from("document_templates")
      .select("id, name, description, number_prefix, fields")
      .eq("is_active", true)
      .order("name"),
    loadSources(link),
    profileName(supabase, user.id),
    getCompanySettings(),
  ]);

  return {
    templates: (rows ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string | null) ?? null,
      numberPrefix: (row.number_prefix as string | null) ?? null,
      fields: parseTemplateFields(row.fields),
    })),
    // Nomor sengaja belum diterbitkan di sini — lihat `nextDocNumber`.
    values: buildPlaceholders({
      sources,
      templateName: "",
      docNumber: null,
      authorName,
      company,
    }),
  };
}

export type GenerateResult =
  | { error: string; document?: undefined; emptyPlaceholders?: undefined }
  | {
      error: null;
      document: { id: string; name: string; webLink: string | null };
      /** Placeholder yang dipakai template tapi nilainya kosong. */
      emptyPlaceholders: string[];
    };

/**
 * Salin template → isi placeholder → catat sebagai dokumen.
 *
 * Hasilnya Google Doc yang bisa langsung disunting, BUKAN PDF. Itu inti
 * fiturnya: selisih antara data yang sudah benar di database dan dokumen
 * yang siap kirim hampir selalu berupa satu-dua sentuhan yang tidak layak
 * dijadikan kolom database (kalimat penutup, tanda tangan, catatan
 * khusus). Menyediakan langkah edit di Google Docs menyelesaikan itu
 * tanpa satu baris kode pun untuk editornya.
 */
export async function generateFromTemplate(
  templateId: string,
  link: DocumentLink,
  values: Record<string, string>,
): Promise<GenerateResult> {
  const docs = getTemplateDocs();
  if (!docs) {
    return { error: "Penyimpanan yang aktif tidak mendukung dokumen template." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  const { data: template } = await supabase
    .from("document_templates")
    .select("id, name, drive_file_id, output_name, number_prefix, fields, is_active")
    .eq("id", templateId)
    .maybeSingle();

  if (!template || template.is_active !== true) {
    return { error: "Template tidak ditemukan atau sudah dinonaktifkan." };
  }

  const fields = parseTemplateFields(template.fields);
  const today = todayJakarta();

  const [sources, authorName, company] = await Promise.all([
    loadSources(link),
    profileName(supabase, user.id),
    getCompanySettings(),
  ]);

  const prefix = (template.number_prefix as string | null) ?? null;
  const numbering = prefix
    ? await nextDocNumber(prefix, today, company.docCode)
    : null;

  const auto = buildPlaceholders({
    sources,
    templateName: template.name as string,
    docNumber: numbering?.number ?? null,
    authorName,
    company,
    today,
  });

  // Isian manual boleh menyebut placeholder otomatis ("Termin 1 —
  // {{proyek.nama}}"), jadi diselesaikan dulu terhadap `auto`. Urutannya
  // searah: nilai manual tidak pernah jadi sumber untuk nilai manual lain,
  // supaya tidak ada rantai substitusi yang bisa melingkar.
  const manual: Record<string, string> = {};
  for (const field of fields) {
    const raw = values[field.key] ?? field.default;
    const resolved = resolvePlaceholders(raw, auto).trim();
    if (field.required && !resolved) {
      return { error: `"${field.label}" wajib diisi.` };
    }
    manual[field.key] = resolved;
  }

  const replacements = { ...auto, ...manual };

  const folderPath = await linkFolderPath(link);
  const name = tidyOutputName(
    resolvePlaceholders(
      (template.output_name as string) || "{{dokumen.judul}}",
      replacements,
    ),
    template.name as string,
  );

  let copy;
  try {
    copy = await docs.copyDoc({
      fileId: template.drive_file_id as string,
      name,
      folderPath,
    });
  } catch (error) {
    console.error("Gagal menyalin template di Drive:", error);
    return {
      error:
        "Gagal menyalin template. Pastikan Google Docs API sudah di-Enable dan file templatenya masih ada.",
    };
  }

  let occurrences: Record<string, number> = {};
  try {
    occurrences = await docs.fillPlaceholders(copy.id, replacements);
  } catch (error) {
    // Dokumennya sudah terlanjur ada di Drive tapi masih penuh
    // placeholder — buang lagi, jangan tinggalkan draf setengah jadi yang
    // gampang terkirim ke klien apa adanya.
    console.error("Gagal mengisi placeholder dokumen:", error);
    await getStorage().remove(copy.id).catch(() => {});
    return {
      error:
        "Dokumen gagal diisi. Cek apakah Google Docs API sudah di-Enable di project Cloud Console.",
    };
  }

  const { data: inserted, error } = await supabase
    .from("documents")
    .insert({
      name: copy.name,
      mime_type: copy.mimeType,
      size_bytes: copy.sizeBytes,
      drive_file_id: copy.id,
      drive_web_link: copy.webLink,
      template_id: template.id,
      doc_number: numbering?.number ?? null,
      number_prefix: prefix,
      number_seq: numbering?.seq ?? null,
      number_year: numbering?.year ?? null,
      ...(await targetColumns({ kind: "link", link })),
      uploaded_by: user.id,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    await getStorage().remove(copy.id).catch(() => {});
    console.error("Gagal mencatat dokumen dari template:", error);
    // 23505 = nomor kembar; dua orang menekan tombolnya nyaris bersamaan.
    return {
      error:
        error?.code === "23505"
          ? "Nomor dokumen barusan terpakai orang lain. Coba sekali lagi."
          : "Dokumen dibuat di Drive tapi gagal dicatat di database.",
    };
  }

  await logActivity(supabase, {
    actorId: user.id,
    entityType: "document",
    entityId: inserted.id as string,
    action: "created",
    summary: `membuat ${template.name}${numbering ? ` ${numbering.number}` : ""} dari template`,
  });

  revalidatePath("/", "layout");

  return {
    error: null,
    document: { id: inserted.id as string, name: copy.name, webLink: copy.webLink },
    emptyPlaceholders: Object.entries(occurrences)
      .filter(([key, count]) => count > 0 && !replacements[key])
      .map(([key]) => key),
  };
}

/**
 * Potret dokumen jadi PDF, disimpan berdampingan dengan draf-nya.
 *
 * Sekali jalan, bukan sinkronisasi: yang diekspor adalah isi dokumen
 * pada detik tombolnya ditekan. Edit sesudahnya tidak mengubah PDF yang
 * sudah terbit — finalisasi ulang yang menerbitkan versi baru.
 *
 * Draf-nya sengaja tidak dihapus atau dikunci. Dokumen yang sudah dikirim
 * ke klien kadang perlu diterbitkan ulang dengan satu koreksi, dan
 * sumbernya yang masih utuh membuat itu satu klik, bukan mengetik ulang.
 */
export async function finalizeToPdf(
  documentId: string,
): Promise<{ error: string | null }> {
  const docs = getTemplateDocs();
  if (!docs) {
    return { error: "Penyimpanan yang aktif tidak mendukung ekspor PDF." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  // Dicek ulang di server, bukan cuma disembunyikan tombolnya di UI:
  // server action adalah endpoint yang bisa dipanggil langsung dari
  // browser siapa pun yang sudah login (pola sama seperti
  // `admin/actions.ts`).
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (profile?.is_super_admin !== true) {
    return { error: "Cuma super admin yang bisa memfinalisasi dokumen jadi PDF." };
  }

  const { data: source } = await supabase
    .from("documents")
    .select(
      "id, name, mime_type, drive_file_id, doc_number, client_id, project_id, task_id, expense_id, income_id, note_id, event_id, folder_id",
    )
    .eq("id", documentId)
    .maybeSingle();

  if (!source) return { error: "Dokumen tidak ditemukan." };
  if (!isGoogleDoc(source.mime_type as string | null)) {
    return { error: "Cuma Google Doc yang bisa difinalisasi jadi PDF." };
  }

  const link: DocumentLink = {
    clientId: source.client_id as string | null,
    projectId: source.project_id as string | null,
    taskId: source.task_id as string | null,
    expenseId: source.expense_id as string | null,
    incomeId: source.income_id as string | null,
    noteId: source.note_id as string | null,
    eventId: source.event_id as string | null,
  };

  const storage = getStorage();
  let stored;
  try {
    const pdf = await docs.exportAs(
      source.drive_file_id as string,
      "application/pdf",
    );

    stored = await storage.upload({
      name: `${source.name as string}.pdf`,
      mimeType: "application/pdf",
      content: pdf,
      // Folder yang sama dengan draf-nya: keduanya berdampingan di Drive,
      // dan keduanya muncul di panel dokumen entitas yang sama.
      folderPath: await linkFolderPath(link),
    });
  } catch (error) {
    console.error("Gagal mengekspor dokumen jadi PDF:", error);
    return { error: "Gagal mengekspor dokumen jadi PDF." };
  }

  const { error } = await supabase.from("documents").insert({
    name: stored.name,
    mime_type: stored.mimeType,
    size_bytes: stored.sizeBytes,
    drive_file_id: stored.id,
    drive_web_link: stored.webLink,
    // Nomor ikut menempel di PDF-nya supaya baris ini bisa dicari lewat
    // nomor dokumen, sama seperti draf-nya. Kolom deret (`number_seq`,
    // `number_year`) sengaja TIDAK ikut: indeks uniknya menjaga satu
    // nomor cuma terbit sekali, dan PDF ini bukan penerbitan baru.
    doc_number: source.doc_number,
    client_id: link.clientId,
    project_id: link.projectId,
    task_id: link.taskId,
    expense_id: link.expenseId,
    income_id: link.incomeId,
    note_id: link.noteId,
    event_id: link.eventId,
    folder_id: source.folder_id,
    uploaded_by: user.id,
  });

  if (error) {
    await storage.remove(stored.id).catch(() => {});
    console.error("Gagal mencatat PDF hasil finalisasi:", error);
    return { error: "PDF dibuat di Drive tapi gagal dicatat di database." };
  }

  await logActivity(supabase, {
    actorId: user.id,
    entityType: "document",
    entityId: documentId,
    action: "created",
    summary: `memfinalisasi "${source.name as string}" jadi PDF`,
  });

  revalidatePath("/", "layout");
  return { error: null };
}

/** Nama yang dipakai `{{dokumen.pembuat}}`. */
async function profileName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();

  return (data?.full_name as string | undefined) ?? "";
}

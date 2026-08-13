import "server-only";

import { createClient } from "@/lib/supabase/server";
import { clientFolderPath, getStorage, receiptFolderPath } from "@/lib/storage";
import type { DocumentLink, UploadTarget } from "./types";

/**
 * Penentuan folder tujuan sebuah file, dipisah dari server action supaya
 * bisa dipakai baik oleh jalur upload langsung (resumable) maupun jalur
 * cadangan lewat server. File "use server" tidak boleh mengekspor helper
 * biasa — semua ekspornya otomatis jadi endpoint yang bisa dipanggil dari
 * browser, dan helper ini tidak boleh jadi salah satunya.
 */

/** Rangkai nama folder dari root sampai folder tujuan di penjelajah berkas. */
export async function folderPathOf(folderId: string | null): Promise<string[]> {
  if (!folderId) return [];

  const supabase = await createClient();
  const path: string[] = [];
  let current: string | null = folderId;

  // Batas 20 tingkat sebagai jaring pengaman: kalau data folder sempat
  // rusak dan membentuk lingkaran, loop ini tetap berhenti.
  for (let depth = 0; current && depth < 20; depth += 1) {
    const { data }: { data: { name: string; parent_id: string | null } | null } =
      await supabase
        .from("folders")
        .select("name, parent_id")
        .eq("id", current)
        .single();
    if (!data) break;
    path.unshift(data.name);
    current = data.parent_id;
  }

  return path;
}

/**
 * Folder tujuan dokumen yang ditempelkan ke sebuah entitas: dokumen klien
 * masuk ke /Clients/<nama klien>/..., struk masuk ke /Expenses/<bulan>.
 */
export async function linkFolderPath(link: DocumentLink): Promise<string[]> {
  const supabase = await createClient();

  if (link.expenseId) {
    const { data } = await supabase
      .from("expenses")
      .select("expense_date")
      .eq("id", link.expenseId)
      .single();
    return receiptFolderPath(
      data?.expense_date ? new Date(data.expense_date) : new Date(),
    );
  }

  // Tagihan ikut kliennya, bukan folder "Keuangan" sendiri: invoice
  // termin ketiga lebih berguna berada di folder klien yang sama dengan
  // kontrak dan berita acaranya.
  if (link.incomeId && !link.projectId && !link.clientId) {
    const { data } = await supabase
      .from("incomes")
      .select("client:clients(name), project:projects(name)")
      .eq("id", link.incomeId)
      .single();

    const client = data?.client as unknown as { name: string } | null;
    const project = data?.project as unknown as { name: string } | null;
    if (client?.name) return clientFolderPath(client.name, project?.name);
  }

  if (link.projectId) {
    const { data } = await supabase
      .from("projects")
      .select("name, client:clients(name)")
      .eq("id", link.projectId)
      .single();

    if (data) {
      const client = data.client as unknown as { name: string } | null;
      return clientFolderPath(client?.name ?? "Tanpa Klien", data.name);
    }
  }

  if (link.clientId) {
    const { data } = await supabase
      .from("clients")
      .select("name")
      .eq("id", link.clientId)
      .single();
    if (data) return clientFolderPath(data.name);
  }

  if (link.taskId) {
    const { data } = await supabase
      .from("tasks")
      .select("client:clients(name)")
      .eq("id", link.taskId)
      .single();
    const client = data?.client as unknown as { name: string } | null;
    if (client?.name) return clientFolderPath(client.name);
  }

  // Lampiran catatan ikut kliennya kalau catatannya memang tentang klien —
  // materi rapat Sadewa lebih berguna berada di folder Sadewa daripada di
  // satu tumpukan "Catatan" yang isinya campur semua.
  if (link.noteId) {
    const { data } = await supabase
      .from("notes")
      .select("client:clients(name), project:projects(name)")
      .eq("id", link.noteId)
      .single();

    const client = data?.client as unknown as { name: string } | null;
    const project = data?.project as unknown as { name: string } | null;
    if (client?.name) return clientFolderPath(client.name, project?.name);
    return ["Catatan"];
  }

  if (link.eventId) return ["Rapat"];

  return ["Umum"];
}

export async function targetFolderPath(target: UploadTarget): Promise<string[]> {
  if (target.kind === "link") return linkFolderPath(target.link);
  const path = await folderPathOf(target.folderId);
  // Folder kosong berarti taruh langsung di root Drive.
  return path.length > 0 ? path : ["Umum"];
}

/**
 * Pastikan sebuah jalur folder punya barisnya sendiri di tabel `folders`,
 * lalu kembalikan id folder terdalamnya.
 *
 * Ini yang menyambungkan lampiran dengan penjelajah berkas. Tanpa ini,
 * dokumen yang dilampirkan dari halaman klien atau dari struk pengeluaran
 * naik ke Drive dengan rapi (`/Clients/Sadewa/`, `/Expenses/2026-08/`)
 * tapi barisnya `folder_id = null` — dan /documents menyaring persis
 * dengan kolom itu. Hasilnya dua struktur yang berbeda untuk file yang
 * sama: tersusun di Drive, menumpuk di akar saat dibuka dari aplikasi.
 *
 * Dipanggil saat mencatat metadata, bukan saat membuka sesi upload: kalau
 * uploadnya batal di tengah jalan, yang tertinggal jangan folder kosong
 * yang tidak pernah diisi apa pun.
 */
export async function ensureAppFolder(
  path: string[],
): Promise<string | null> {
  if (path.length === 0) return null;

  const supabase = await createClient();
  const walked: string[] = [];
  let parentId: string | null = null;

  for (const name of path) {
    walked.push(name);

    const { data: existing } = await supabase
      .from("folders")
      .select("id")
      // `is` untuk null, `eq` untuk id — PostgREST membedakan keduanya.
      [parentId ? "eq" : "is"]("parent_id", parentId)
      .eq("name", name)
      .maybeSingle();

    if (existing) {
      parentId = existing.id as string;
      continue;
    }

    // Baru di sini Drive dipanggil. Setelah unggahan pertama ke sebuah
    // klien, barisnya sudah ada dan cabang ini tidak pernah lewat lagi.
    let driveFolderId: string;
    try {
      driveFolderId = await getStorage().ensureFolder(walked);
    } catch (error) {
      console.error("Gagal memastikan folder di Drive:", error);
      return parentId;
    }

    const { data: created, error } = await supabase
      .from("folders")
      .insert({ name, parent_id: parentId, drive_folder_id: driveFolderId })
      .select("id")
      .single();

    if (created) {
      parentId = created.id as string;
      continue;
    }

    // 23505 = folder Drive itu sudah tercatat, cuma di tempat lain di
    // pohon (mis. dibuat manual lewat penjelajah berkas sebelum ada
    // lampiran). Pakai baris yang sudah ada daripada memaksa yang kedua.
    if (error?.code === "23505") {
      const { data: byDrive } = await supabase
        .from("folders")
        .select("id")
        .eq("drive_folder_id", driveFolderId)
        .maybeSingle();
      if (byDrive) {
        parentId = byDrive.id as string;
        continue;
      }
    }

    console.error("Gagal mencatat folder lampiran:", error);
    // Berhenti di folder terakhir yang berhasil. Dokumennya tetap
    // tercatat — cuma satu tingkat lebih dangkal daripada di Drive.
    return parentId;
  }

  return parentId;
}

/**
 * Kolom penaut yang ikut ditulis ke baris `documents`, termasuk folder
 * tempatnya muncul di penjelajah berkas.
 */
export async function targetColumns(target: UploadTarget) {
  if (target.kind === "folder") return { folder_id: target.folderId };

  return {
    client_id: target.link.clientId ?? null,
    project_id: target.link.projectId ?? null,
    task_id: target.link.taskId ?? null,
    expense_id: target.link.expenseId ?? null,
    income_id: target.link.incomeId ?? null,
    note_id: target.link.noteId ?? null,
    event_id: target.link.eventId ?? null,
    folder_id: await ensureAppFolder(await linkFolderPath(target.link)),
  };
}

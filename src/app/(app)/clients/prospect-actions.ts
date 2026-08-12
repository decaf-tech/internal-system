"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseRupiah } from "@/lib/format";
import { logActivity } from "@/lib/activity";
import {
  PROSPECT_OPEN_STAGES,
  PROSPECT_STAGE_LABEL,
  PROSPECT_STAGE_ORDER,
} from "@/lib/types";
import type { Prospect, ProspectStage } from "@/lib/types";

// Bentuk yang sama dengan `actions.ts` sebelah: `ok` cuma menyala setelah
// submit berhasil, dan form memakainya sebagai sinyal untuk menutup modal.
export type FormState = { error: string | null; ok?: true };

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

/**
 * Prospek muncul di dua rute: papannya di `/clients`, dan tiga dari empat
 * angka strip statistik (prospek aktif, nilai pipeline, follow-up jatuh
 * tempo) ikut tergambar di `/clients/list`. Sama seperti `revalidateClientPages`
 * di actions.ts — path harfiah cuma membatalkan satu halaman.
 */
function revalidateProspectPages() {
  revalidatePath("/clients");
  revalidatePath("/clients/list");
}

/**
 * Nilai rupiah boleh kosong dengan sengaja (PRD v3.0 §6-B): prospek awal
 * yang angkanya belum jelas jangan sampai susah dicatat cepat. Tapi kalau
 * *diisi* dan ternyata bukan angka, itu salah ketik — lebih baik ditolak
 * daripada diam-diam tersimpan sebagai kosong.
 */
function readAmount(formData: FormData, key: string, label: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (raw === "") return { value: null, error: null };

  const parsed = parseRupiah(raw);
  if (parsed === null) {
    return { value: null, error: `${label} harus berupa angka lebih dari nol.` };
  }
  return { value: parsed, error: null };
}

function readEstimatedValue(formData: FormData) {
  return readAmount(formData, "estimated_value", "Nilai estimasi");
}

function readStage(formData: FormData): ProspectStage {
  const raw = String(formData.get("stage") ?? "");
  return PROSPECT_STAGE_ORDER.includes(raw as ProspectStage)
    ? (raw as ProspectStage)
    : "prospek";
}

function isOpenStage(stage: ProspectStage) {
  return PROSPECT_OPEN_STAGES.includes(stage);
}

export async function createProspect(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  const name = text(formData, "name");
  if (!name) return { error: "Nama prospek wajib diisi." };

  const estimated = readEstimatedValue(formData);
  if (estimated.error) return { error: estimated.error };

  // Prospek selalu lahir di tahap yang masih berjalan. Yang sudah selesai
  // sebelum tercatat tetap dimasukkan dulu, baru ditutup lewat tombolnya —
  // satu jalan masuk, satu aturan.
  const stage = readStage(formData);
  if (!isOpenStage(stage)) {
    return { error: "Prospek baru tidak bisa langsung ditandai menang atau kalah." };
  }

  const { data: created, error } = await supabase
    .from("prospects")
    .insert({
      name,
      company: text(formData, "company"),
      contact_phone: text(formData, "contact_phone"),
      contact_email: text(formData, "contact_email"),
      stage,
      estimated_value: estimated.value,
      next_follow_up_date: text(formData, "next_follow_up_date"),
      // Prasetel di form = user yang login, tapi tetap bisa diganti:
      // rujukan personal boleh dicatat atas nama pemiliknya (§6-A).
      owner_id: text(formData, "owner_id") ?? user.id,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("Gagal menambah prospek:", error);
    return { error: "Gagal menyimpan prospek." };
  }

  await logActivity(supabase, {
    actorId: user.id,
    entityType: "prospect",
    entityId: created.id,
    action: "created",
    summary: `menambah prospek "${name}"`,
  });

  revalidateProspectPages();
  return { error: null, ok: true };
}

export async function updateProspect(
  prospectId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = text(formData, "name");
  if (!name) return { error: "Nama prospek wajib diisi." };

  const estimated = readEstimatedValue(formData);
  if (estimated.error) return { error: estimated.error };

  const stage = readStage(formData);

  // Tahap sebelumnya dibaca dulu supaya log aktivitasnya bisa membedakan
  // "mengubah data" dari "memindahkan tahap" — dua hal yang berbeda artinya
  // saat riwayat dibaca ulang nanti.
  const { data: before } = await supabase
    .from("prospects")
    .select("stage")
    .eq("id", prospectId)
    .single();

  // Gerbang yang sama seperti di `moveProspect`: dua tahap penutup tidak
  // pernah dimasuki lewat jalur biasa. Form-nya memang sudah tidak
  // menawarkan keduanya (lihat `prospect-form.tsx`), tapi form yang dikirim
  // dengan tangan tetap sampai ke sini.
  if (!isOpenStage(stage) && before !== null && before.stage !== stage) {
    return {
      error: `Tandai ${PROSPECT_STAGE_LABEL[stage]} lewat tombolnya sendiri — ada yang perlu diisi dulu di sana.`,
    };
  }

  // Prospek yang tetap di tahap Kalah harus tetap punya alasannya. Tanpa ini
  // kolom alasan bisa dikosongkan lewat pengubahan biasa, dan kolom Kalah
  // pelan-pelan kembali jadi daftar nama tanpa keterangan.
  if (stage === "kalah" && text(formData, "lost_reason") === null) {
    return { error: "Alasan batal wajib diisi selama prospek ini di tahap Kalah." };
  }

  const { error } = await supabase
    .from("prospects")
    .update({
      name,
      company: text(formData, "company"),
      contact_phone: text(formData, "contact_phone"),
      contact_email: text(formData, "contact_email"),
      stage,
      estimated_value: estimated.value,
      next_follow_up_date: text(formData, "next_follow_up_date"),
      lost_reason: text(formData, "lost_reason"),
      owner_id: text(formData, "owner_id"),
    })
    .eq("id", prospectId);

  if (error) {
    console.error("Gagal memperbarui prospek:", error);
    return { error: "Gagal menyimpan perubahan." };
  }

  const moved = before !== null && before.stage !== stage;

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    entityType: "prospect",
    entityId: prospectId,
    action: moved ? "moved" : "updated",
    summary: moved
      ? `memindahkan prospek "${name}" ke ${PROSPECT_STAGE_LABEL[stage]}`
      : `mengubah data prospek "${name}"`,
  });

  revalidateProspectPages();
  return { error: null, ok: true };
}

/**
 * Pindah tahap lewat seretan di papan.
 *
 * Tidak ada kolom `position` di tabel `prospects` — urutan kartu dalam satu
 * kolom ditentukan tanggal follow-up (lihat `prospect-board.tsx`), jadi yang
 * berpindah cuma tahapnya. Itu juga alasan aksi ini tidak menerima posisi
 * seperti `moveTask`.
 *
 * Menang & Kalah TIDAK bisa lewat sini. Papan sudah mencegatnya di
 * `handleDragEnd` dan membuka modalnya, tapi penolakan ini yang jadi
 * pegangan sebenarnya: kalau gerbangnya cuma hidup di komponen, seretan
 * jadi jalan pintas yang melewati alasan batal dan pembuatan klien.
 */
export async function moveProspect(prospectId: string, stage: ProspectStage) {
  if (!isOpenStage(stage)) {
    throw new Error(
      `Tahap ${PROSPECT_STAGE_LABEL[stage]} tidak bisa dipindah begitu saja.`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: prospect, error } = await supabase
    .from("prospects")
    .update({ stage })
    .eq("id", prospectId)
    .select("name")
    .single();

  // Dilempar, bukan ditelan: papan memakai kegagalan ini untuk mengembalikan
  // kartu ke kolom asalnya (lihat `moveProspect(...).catch` di papan).
  if (error) {
    console.error("Gagal memindahkan prospek:", error);
    throw new Error("Gagal memindahkan prospek.");
  }

  if (prospect) {
    await logActivity(supabase, {
      actorId: user?.id ?? null,
      entityType: "prospect",
      entityId: prospectId,
      action: "moved",
      summary: `memindahkan prospek "${prospect.name}" ke ${PROSPECT_STAGE_LABEL[stage]}`,
    });
  }

  revalidateProspectPages();
}

/**
 * Tandai Kalah — satu-satunya jalan masuk ke tahap itu.
 *
 * Alasannya wajib, dan divalidasi di sini, bukan lewat constraint database:
 * pesan kesalahannya perlu sampai ke form dalam bahasa manusia (PRD v3.0
 * §2.7). Kolom Kalah tanpa alasan cuma daftar nama — yang berguna dibaca
 * ulang setahun kemudian justru "kenapa"-nya.
 */
export async function markProspectLost(
  prospectId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const reason = text(formData, "lost_reason");
  if (!reason) {
    return { error: "Alasan batal wajib diisi sebelum prospek ditandai kalah." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: prospect, error } = await supabase
    .from("prospects")
    .update({ stage: "kalah", lost_reason: reason })
    .eq("id", prospectId)
    .select("name")
    .single();

  if (error || !prospect) {
    console.error("Gagal menandai prospek kalah:", error);
    return { error: "Gagal menyimpan perubahan." };
  }

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    entityType: "prospect",
    entityId: prospectId,
    action: "moved",
    summary: `menandai prospek "${prospect.name}" kalah`,
  });

  revalidateProspectPages();
  return { error: null, ok: true };
}

/**
 * Tandai Menang — konversi yang membuat baris `clients` baru (PRD v3.0 §2.2).
 *
 * Baris prospeknya sendiri TIDAK dihapus dan tidak dipindahkan isinya: ia
 * tetap jadi riwayat, ditautkan ke klien barunya lewat `client_id`. Itu
 * sekaligus penjaga supaya konversi tidak berjalan dua kali — prospek yang
 * `client_id`-nya sudah terisi ditolak di bawah.
 */
export async function markProspectWon(
  prospectId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  const { data: prospect } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", prospectId)
    .single<Prospect>();

  if (!prospect) return { error: "Prospek ini sudah tidak ada." };
  if (prospect.client_id) {
    return { error: "Prospek ini sudah pernah dikonversi jadi klien." };
  }

  const clientName = text(formData, "client_name") ?? prospect.name;
  // Project pertama opsional: deal yang baru disepakati kadang belum punya
  // lingkup kerja yang bisa dinamai, dan klienya sudah perlu ada.
  const withProject = formData.get("create_project") !== null;
  const projectName = text(formData, "project_name");
  if (withProject && !projectName) {
    return { error: "Nama project wajib diisi kalau project pertama ikut dibuat." };
  }

  const deal = readAmount(formData, "deal_value", "Nilai deal");
  if (deal.error) return { error: deal.error };

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      name: clientName,
      company: prospect.company,
      // Nama prospek adalah orang yang selama ini diajak bicara. Kalau nama
      // kliennya diganti jadi nama perusahaan, orang itu tetap perlu tercatat
      // sebagai kontaknya — kalau tidak, nomor telepon di bawah jadi milik
      // "entah siapa".
      contact_person: clientName === prospect.name ? null : prospect.name,
      email: prospect.contact_email,
      phone: prospect.contact_phone,
      status: "active",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (clientError || !client) {
    console.error("Gagal membuat klien dari prospek:", clientError);
    return { error: "Gagal membuat klien baru." };
  }

  await logActivity(supabase, {
    actorId: user.id,
    entityType: "client",
    entityId: client.id,
    action: "created",
    summary: `menambah klien "${clientName}" dari prospek "${prospect.name}"`,
  });

  let projectError: string | null = null;

  if (withProject && projectName) {
    const { error } = await supabase.from("projects").insert({
      client_id: client.id,
      name: projectName,
      status: "planning",
      track: "other",
      deal_value: deal.value,
    });

    if (error) {
      console.error("Gagal membuat project pertama:", error);
      projectError =
        "Klien baru sudah dibuat, tapi project pertamanya gagal disimpan. Tambahkan dari halaman klien.";
    }
  }

  // Tautannya dipasang walaupun project-nya gagal: kliennya sudah terlanjur
  // ada, dan prospek yang belum tertaut akan membuat percobaan berikutnya
  // membuat klien kedua yang sama persis.
  const { error: linkError } = await supabase
    .from("prospects")
    .update({ stage: "menang", client_id: client.id })
    .eq("id", prospectId);

  if (linkError) {
    console.error("Gagal menautkan prospek ke klien:", linkError);
    revalidateProspectPages();
    return {
      error: `Klien "${clientName}" sudah dibuat, tapi prospeknya gagal ditandai menang.`,
    };
  }

  await logActivity(supabase, {
    actorId: user.id,
    entityType: "prospect",
    entityId: prospectId,
    action: "moved",
    summary: `menandai prospek "${prospect.name}" menang`,
  });

  revalidateProspectPages();
  revalidatePath(`/clients/${client.id}`);

  if (projectError) return { error: projectError };
  return { error: null, ok: true };
}

export async function deleteProspect(prospectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: prospect } = await supabase
    .from("prospects")
    .select("name")
    .eq("id", prospectId)
    .single();

  await supabase.from("prospects").delete().eq("id", prospectId);

  if (prospect) {
    await logActivity(supabase, {
      actorId: user?.id ?? null,
      entityType: "prospect",
      entityId: null,
      action: "deleted",
      summary: `menghapus prospek "${prospect.name}"`,
    });
  }

  revalidateProspectPages();
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseRupiah } from "@/lib/format";
import { readBillingScheme } from "@/lib/billing";
import { logActivity } from "@/lib/activity";
import {
  PROSPECT_OPEN_STAGES,
  PROSPECT_STAGE_LABEL,
  PROSPECT_STAGE_ORDER,
} from "@/lib/types";
import type { ClientStatus, Prospect, ProspectStage } from "@/lib/types";

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

/**
 * Setiap prospek punya baris `clients` sejak lahir (bukan cuma saat Menang),
 * supaya tugas & kalender bisa ditautkan sejak tahap paling awal. `status`
 * klien mengikuti tahap prospeknya lewat pemetaan ini — `client_status`
 * cuma punya dua kolom untuk tahap terbuka (`lead`, `negotiation`), jadi
 * "penawaran" digabung ke `negotiation` bersama "negosiasi": begitu
 * penawaran keluar, secara praktis itu sudah proses tawar-menawar.
 */
function stageToClientStatus(stage: ProspectStage): ClientStatus {
  switch (stage) {
    case "prospek":
      return "lead";
    case "penawaran":
    case "negosiasi":
      return "negotiation";
    case "menang":
      return "active";
    case "kalah":
      return "lost";
  }
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

  // Skema nilainya ikut dicatat sejak prospek pertama kali dimasukkan: untuk
  // langganan, angka di atas berarti nilai SATU periode, dan tanpa tiga kolom
  // ini nilai pipeline-nya salah sebesar panjang kontraknya (migration 010).
  const billing = readBillingScheme(formData);
  if (billing.error !== null) return { error: billing.error };

  // Prospek selalu lahir di tahap yang masih berjalan. Yang sudah selesai
  // sebelum tercatat tetap dimasukkan dulu, baru ditutup lewat tombolnya —
  // satu jalan masuk, satu aturan.
  const stage = readStage(formData);
  if (!isOpenStage(stage)) {
    return { error: "Prospek baru tidak bisa langsung ditandai menang atau kalah." };
  }

  const company = text(formData, "company");
  const contactPhone = text(formData, "contact_phone");
  const contactEmail = text(formData, "contact_email");

  // Baris `clients`-nya dibuat lebih dulu supaya tugas & kalender sudah bisa
  // ditautkan sejak prospek ini masih di tahap paling awal — tidak perlu
  // menunggu sampai Menang (lihat `stageToClientStatus` di atas).
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      name,
      company,
      email: contactEmail,
      phone: contactPhone,
      status: stageToClientStatus(stage),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (clientError || !client) {
    console.error("Gagal membuat klien dari prospek baru:", clientError);
    return { error: "Gagal menyimpan prospek." };
  }

  const { data: created, error } = await supabase
    .from("prospects")
    .insert({
      name,
      company,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      stage,
      estimated_value: estimated.value,
      ...billing.scheme,
      next_follow_up_date: text(formData, "next_follow_up_date"),
      // Prasetel di form = user yang login, tapi tetap bisa diganti:
      // rujukan personal boleh dicatat atas nama pemiliknya (§6-A).
      owner_id: text(formData, "owner_id") ?? user.id,
      created_by: user.id,
      client_id: client.id,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("Gagal menambah prospek:", error);
    // Klien tanpa prospek yang menautnya cuma jadi baris yatim di daftar
    // klien — lebih baik dibersihkan daripada dibiarkan nyangkut.
    await supabase.from("clients").delete().eq("id", client.id);
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

  const billing = readBillingScheme(formData);
  if (billing.error !== null) return { error: billing.error };

  const stage = readStage(formData);

  // Tahap sebelumnya dibaca dulu supaya log aktivitasnya bisa membedakan
  // "mengubah data" dari "memindahkan tahap" — dua hal yang berbeda artinya
  // saat riwayat dibaca ulang nanti.
  const { data: before } = await supabase
    .from("prospects")
    .select("stage, client_id")
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

  const company = text(formData, "company");
  const contactPhone = text(formData, "contact_phone");
  const contactEmail = text(formData, "contact_email");

  const { error } = await supabase
    .from("prospects")
    .update({
      name,
      company,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      stage,
      estimated_value: estimated.value,
      ...billing.scheme,
      next_follow_up_date: text(formData, "next_follow_up_date"),
      lost_reason: text(formData, "lost_reason"),
      owner_id: text(formData, "owner_id"),
    })
    .eq("id", prospectId);

  if (error) {
    console.error("Gagal memperbarui prospek:", error);
    return { error: "Gagal menyimpan perubahan." };
  }

  // Klien yang menyertai prospek ini ikut disegarkan — tapi cuma selama
  // prospeknya masih di tahap terbuka. Begitu Menang/Kalah, klien itu sudah
  // punya hidup sendiri (§ markProspectWon / markProspectLost), dan mengubah
  // data prospek yang sudah ditutup tidak boleh diam-diam menimpanya.
  if (isOpenStage(stage) && before?.client_id) {
    const { error: clientSyncError } = await supabase
      .from("clients")
      .update({
        name,
        company,
        email: contactEmail,
        phone: contactPhone,
        status: stageToClientStatus(stage),
      })
      .eq("id", before.client_id);

    if (clientSyncError) {
      console.error("Gagal menyinkronkan klien dari prospek:", clientSyncError);
    }
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
    .select("name, client_id")
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

    // Status klien yang menyertai prospek ini mengikuti tahap barunya —
    // sama seperti sinkronisasi di `updateProspect` (lihat komentar di sana).
    if (prospect.client_id) {
      const { error: clientSyncError } = await supabase
        .from("clients")
        .update({ status: stageToClientStatus(stage) })
        .eq("id", prospect.client_id);

      if (clientSyncError) {
        console.error("Gagal menyinkronkan klien dari prospek:", clientSyncError);
      }
    }
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
    .select("name, client_id")
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

  // Klien yang menyertai prospek ini ikut ditutup — tetap ada (kalau sudah
  // tertaut ke tugas/kalender, tautan itu jangan sampai putus), tapi
  // statusnya jujur menunjukkan kalau deal ini tidak jadi.
  if (prospect.client_id) {
    const { error: clientSyncError } = await supabase
      .from("clients")
      .update({ status: "lost" })
      .eq("id", prospect.client_id);

    if (clientSyncError) {
      console.error("Gagal menandai klien kalah:", clientSyncError);
    }
  }

  revalidateProspectPages();
  return { error: null, ok: true };
}

/**
 * Tandai Menang — mengaktifkan klien yang sudah menyertai prospek ini sejak
 * dibuat (bukan membuat baris `clients` baru; itu perilaku lama sebelum
 * prospek & klien ditautkan sejak awal — lihat `stageToClientStatus`).
 *
 * Baris prospeknya sendiri TIDAK dihapus dan tidak dipindahkan isinya: ia
 * tetap jadi riwayat, ditautkan ke kliennya lewat `client_id` seperti biasa.
 * Penjaga supaya konversi tidak berjalan dua kali sekarang mengecek
 * `stage`, bukan `client_id` — kolom itu sudah terisi sejak prospek lahir.
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
  if (prospect.stage === "menang") {
    return { error: "Prospek ini sudah pernah dikonversi jadi klien." };
  }
  if (!prospect.client_id) {
    return { error: "Prospek ini belum punya klien yang tertaut." };
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

  // Skema nilainya ikut pindah ke project, bukan diketik ulang: yang
  // disepakati saat menang adalah kesepakatan yang sama yang sudah ditawar
  // sepanjang pipeline. Formnya memprasetel dari prospek, jadi yang sampai ke
  // sini biasanya persis skema prospeknya — tapi tetap dibaca dari FormData,
  // karena detik ini adalah saat termurah untuk membetulkannya.
  const billing = readBillingScheme(formData);
  if (billing.error !== null) return { error: billing.error };

  // Tanggal mulai kontrak. Untuk langganan ia yang menentukan jadwal tagihan
  // dan kapan kontraknya habis — tanpa itu, project langganan tersimpan tapi
  // tidak bisa dipantau sama sekali.
  const startDate = text(formData, "start_date");
  if (billing.scheme.billing_type === "subscription" && withProject && !startDate) {
    return { error: "Tanggal mulai kontrak wajib diisi untuk project langganan." };
  }

  const { error: clientError } = await supabase
    .from("clients")
    .update({
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
    })
    .eq("id", prospect.client_id);

  if (clientError) {
    console.error("Gagal mengaktifkan klien dari prospek:", clientError);
    return { error: "Gagal mengaktifkan klien." };
  }

  await logActivity(supabase, {
    actorId: user.id,
    entityType: "client",
    entityId: prospect.client_id,
    action: "updated",
    summary: `mengaktifkan klien "${clientName}" dari prospek "${prospect.name}" yang menang`,
  });

  let projectError: string | null = null;

  if (withProject && projectName) {
    const { error } = await supabase.from("projects").insert({
      client_id: prospect.client_id,
      name: projectName,
      status: "planning",
      track: "other",
      deal_value: deal.value,
      ...billing.scheme,
      start_date: startDate,
    });

    if (error) {
      console.error("Gagal membuat project pertama:", error);
      projectError =
        "Klien sudah diaktifkan, tapi project pertamanya gagal disimpan. Tambahkan dari halaman klien.";
    }
  }

  const { error: stageError } = await supabase
    .from("prospects")
    .update({ stage: "menang" })
    .eq("id", prospectId);

  if (stageError) {
    console.error("Gagal menandai prospek menang:", stageError);
    revalidateProspectPages();
    return {
      error: `Klien "${clientName}" sudah diaktifkan, tapi prospeknya gagal ditandai menang.`,
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
  revalidatePath(`/clients/${prospect.client_id}`);

  if (projectError) return { error: projectError };
  return { error: null, ok: true };
}

/**
 * Klien yang menyertai sebuah prospek (lihat `stageToClientStatus`) belum
 * dianggap "hidup sendiri" selama belum ada apa pun yang benar-benar
 * menempel padanya — begitu ada, menghapusnya lewat sini akan memutus
 * tautan itu (project malah ikut terhapus lewat `on delete cascade`).
 */
async function clientHasNoActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
) {
  const counts = await Promise.all(
    (["projects", "tasks", "notes", "expenses", "incomes"] as const).map(
      (table) =>
        supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("client_id", clientId),
    ),
  );

  return counts.every((result) => (result.count ?? 0) === 0);
}

export async function deleteProspect(prospectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: prospect } = await supabase
    .from("prospects")
    .select("name, client_id")
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

    // Klien yang belum tersentuh apa pun cuma jadi baris yatim kalau
    // dibiarkan — dibersihkan sekalian. Yang sudah punya project/tugas/dst
    // dibiarkan, supaya tautan yang sudah dibuat orang tidak ikut hilang.
    if (prospect.client_id && (await clientHasNoActivity(supabase, prospect.client_id))) {
      await supabase.from("clients").delete().eq("id", prospect.client_id);
    }
  }

  revalidateProspectPages();
}

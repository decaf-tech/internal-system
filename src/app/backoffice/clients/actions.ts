"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate, parseRupiah } from "@/lib/format";
import {
  billingSchedule,
  periodLabel,
  readBillingScheme,
} from "@/lib/billing";
import { logActivity } from "@/lib/activity";
import { PROJECT_STATUS_LABEL } from "@/lib/types";
import type {
  ClientStatus,
  Project,
  ProjectStatus,
  ProjectTrack,
} from "@/lib/types";

// `ok` menandai submit yang berhasil. Client component memakainya sebagai
// sinyal untuk menutup modal — state awal (`ok` undefined) tidak ikut memicu.
export type FormState = { error: string | null; ok?: true };

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

/**
 * Data klien muncul di dua rute sejak halaman ini jadi dua tab: daftarnya di
 * `/backoffice/clients/list`, dan jumlah "Klien Aktif" di strip statistik yang juga
 * tergambar di tab Pipeline. `revalidatePath` dengan path harfiah cuma
 * membatalkan satu halaman, jadi keduanya memang harus disebut — kalau tidak,
 * strip statistiknya diam-diam menampilkan angka lama.
 *
 * Tidak diekspor: di berkas `"use server"` setiap ekspor jadi endpoint yang
 * bisa dipanggil dari browser, dan ini cuma penolong lokal.
 */
function revalidateClientPages() {
  revalidatePath("/backoffice/clients");
  revalidatePath("/backoffice/clients/list");
}

export async function createClientRecord(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  const name = text(formData, "name");
  if (!name) return { error: "Nama klien wajib diisi." };

  const { data: created, error } = await supabase
    .from("clients")
    .insert({
      name,
      company: text(formData, "company"),
      contact_person: text(formData, "contact_person"),
      email: text(formData, "email"),
      phone: text(formData, "phone"),
      address: text(formData, "address"),
      status: (text(formData, "status") ?? "lead") as ClientStatus,
      notes: text(formData, "notes"),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("Gagal menambah klien:", error);
    return { error: "Gagal menyimpan klien." };
  }

  await logActivity(supabase, {
    actorId: user.id,
    entityType: "client",
    entityId: created.id,
    action: "created",
    summary: `menambah klien "${name}"`,
  });

  revalidateClientPages();
  return { error: null, ok: true };
}

export async function updateClientRecord(
  clientId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = text(formData, "name");
  if (!name) return { error: "Nama klien wajib diisi." };

  const { error } = await supabase
    .from("clients")
    .update({
      name,
      company: text(formData, "company"),
      contact_person: text(formData, "contact_person"),
      email: text(formData, "email"),
      phone: text(formData, "phone"),
      address: text(formData, "address"),
      status: (text(formData, "status") ?? "lead") as ClientStatus,
      notes: text(formData, "notes"),
    })
    .eq("id", clientId);

  if (error) {
    console.error("Gagal memperbarui klien:", error);
    return { error: "Gagal menyimpan perubahan." };
  }

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    entityType: "client",
    entityId: clientId,
    action: "updated",
    summary: `mengubah data klien "${name}"`,
  });

  revalidateClientPages();
  revalidatePath(`/backoffice/clients/${clientId}`);
  return { error: null, ok: true };
}

export async function deleteClientRecord(clientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: client } = await supabase
    .from("clients")
    .select("name")
    .eq("id", clientId)
    .single();

  await supabase.from("clients").delete().eq("id", clientId);

  if (client) {
    await logActivity(supabase, {
      actorId: user?.id ?? null,
      entityType: "client",
      entityId: null,
      action: "deleted",
      summary: `menghapus klien "${client.name}"`,
    });
  }

  revalidateClientPages();
  redirect("/backoffice/clients/list");
}

export async function createProject(
  clientId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = text(formData, "name");
  if (!name) return { error: "Nama project wajib diisi." };

  const billing = readBillingScheme(formData);
  if (billing.error !== null) return { error: billing.error };

  const startDate = text(formData, "start_date");
  // Untuk langganan, `start_date` bukan sekadar keterangan: jadwal tagihan
  // dan tanggal kontrak berakhir dua-duanya dihitung dari sini. Project
  // langganan tanpa tanggal mulai tersimpan tapi tidak bisa dipantau.
  if (billing.scheme.billing_type === "subscription" && !startDate) {
    return { error: "Tanggal mulai kontrak wajib diisi untuk project langganan." };
  }

  const { data: created, error } = await supabase
    .from("projects")
    .insert({
      client_id: clientId,
      name,
      description: text(formData, "description"),
      status: (text(formData, "status") ?? "planning") as ProjectStatus,
      track: (text(formData, "track") ?? "other") as ProjectTrack,
      start_date: startDate,
      target_date: text(formData, "target_date"),
      // Boleh kosong: deal sering baru punya angka setelah beberapa kali
      // bolak-balik penawaran, dan project-nya sudah perlu ada sebelum itu.
      // Untuk langganan, angkanya berarti nilai SATU periode tagih.
      deal_value: parseRupiah(formData.get("deal_value")),
      ...billing.scheme,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("Gagal menambah project:", error);
    return { error: "Gagal menyimpan project." };
  }

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    entityType: "project",
    entityId: created.id,
    action: "created",
    summary: `menambah project "${name}"`,
  });

  revalidatePath(`/backoffice/clients/${clientId}`);
  return { error: null, ok: true };
}

export async function updateProjectStatus(
  projectId: string,
  clientId: string,
  status: ProjectStatus,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: project } = await supabase
    .from("projects")
    .update({ status })
    .eq("id", projectId)
    .select("name")
    .single();

  if (project) {
    await logActivity(supabase, {
      actorId: user?.id ?? null,
      entityType: "project",
      entityId: projectId,
      action: "status_changed",
      summary: `mengubah status project "${project.name}" jadi ${PROJECT_STATUS_LABEL[status]}`,
    });
  }

  revalidatePath(`/backoffice/clients/${clientId}`);
}

/**
 * Ubah nilai & skema deal dari halaman klien, tanpa membuka form project
 * penuh — angka deal paling sering berubah saat sedang menatap halaman
 * kliennya, dan form panjang untuk itu adalah alasan bagus untuk menunda
 * lalu lupa.
 *
 * Dulu ini menerima satu string angka dan diedit di tempat. Sejak ada skema
 * langganan (migration 010) satu angka tidak lagi cukup: nilai per periode
 * tanpa periode dan durasinya tidak berarti apa-apa, dan ketiganya harus
 * berubah bersamaan supaya tidak sempat melanggar constraint di database.
 * Jadi bentuknya sekarang form kecil di modal — masih jauh lebih pendek
 * daripada form project.
 *
 * Nilai kosong berarti dealnya dihapus (kembali "belum ada angka"), bukan
 * nol — nol berarti project gratisan, dan itu informasi yang berbeda.
 */
export async function updateProjectDeal(
  projectId: string,
  clientId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = String(formData.get("deal_value") ?? "").trim();
  const value = raw === "" ? null : parseRupiah(raw);

  if (raw !== "" && value === null) {
    return { error: "Nilai deal harus berupa angka lebih dari nol." };
  }

  const billing = readBillingScheme(formData);
  if (billing.error !== null) return { error: billing.error };

  const startDate = text(formData, "start_date");
  if (billing.scheme.billing_type === "subscription" && !startDate) {
    return { error: "Tanggal mulai kontrak wajib diisi untuk langganan." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // `start_date` cuma ditimpa saat skemanya langganan: untuk project sekali
  // bayar, tanggal mulai adalah urusan form project — dialog ini tidak
  // menanyakannya, jadi ia juga tidak berhak mengosongkannya.
  const patch = {
    deal_value: value,
    ...billing.scheme,
    ...(billing.scheme.billing_type === "subscription"
      ? { start_date: startDate }
      : {}),
  };

  const { data: project, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", projectId)
    .select("name")
    .single();

  if (error) {
    console.error("Gagal menyimpan nilai deal:", error);
    return { error: "Gagal menyimpan nilai deal." };
  }

  if (project) {
    await logActivity(supabase, {
      actorId: user?.id ?? null,
      entityType: "project",
      entityId: projectId,
      action: "updated",
      summary: `mengubah nilai deal project "${project.name}"`,
    });
  }

  revalidatePath(`/backoffice/clients/${clientId}`);
  revalidatePath("/backoffice/finance");
  return { error: null, ok: true };
}

/**
 * Terbitkan tagihan langganan sebagai baris `incomes` — satu per periode
 * sepanjang kontrak.
 *
 * Ini yang membuat langganan ikut terpantau tanpa layar baru: begitu
 * tagihannya jadi baris pemasukan biasa, halaman Pemasukan, kartu "Belum
 * Diterima", grafik cashflow, dan "lewat jatuh tempo" semuanya bekerja
 * seperti biasa. Alternatifnya — menghitung tagihan langganan secara virtual
 * di setiap tempat yang menampilkan uang — berarti setiap halaman keuangan
 * harus tahu soal langganan.
 *
 * Aman ditekan berkali-kali: periode yang jatuh temponya sudah punya baris
 * pemasukan untuk project ini dilewati, bukan diterbitkan ulang. Itu juga
 * yang membuatnya berguna setelah kontrak diperpanjang — yang baru saja
 * bertambah ikut terbit, yang lama tidak jadi kembar.
 */
export async function generateSubscriptionIncomes(
  projectId: string,
  clientId: string,
): Promise<{ error: string | null; created?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, name, client_id, deal_value, billing_type, billing_period, contract_months, start_date",
    )
    .eq("id", projectId)
    .single<
      Pick<
        Project,
        | "id"
        | "name"
        | "client_id"
        | "deal_value"
        | "billing_type"
        | "billing_period"
        | "contract_months"
        | "start_date"
      >
    >();

  if (!project) return { error: "Project ini sudah tidak ada." };
  if (project.billing_type !== "subscription") {
    return { error: "Project ini bukan langganan." };
  }
  if (project.deal_value == null) {
    return { error: "Isi dulu nilai per periodenya." };
  }
  if (!project.start_date) {
    return { error: "Isi dulu tanggal mulai kontraknya." };
  }

  const schedule = billingSchedule(project.start_date, project);
  if (schedule.length === 0) return { error: "Jadwal tagihannya kosong." };

  // Yang sudah ada dibaca lebih dulu, dibandingkan lewat jatuh temponya.
  // Tanggal jatuh tempo adalah identitas alami sebuah periode di sini —
  // dua tagihan langganan project yang sama tidak pernah jatuh di hari yang
  // sama kecuali salah satunya memang duplikat.
  const { data: existing } = await supabase
    .from("incomes")
    .select("due_date")
    .eq("project_id", projectId);

  const taken = new Set((existing ?? []).map((row) => String(row.due_date)));
  const missing = schedule.filter((item) => !taken.has(item.dueDate));

  if (missing.length === 0) {
    return { error: null, created: 0 };
  }

  const { error } = await supabase.from("incomes").insert(
    missing.map((item) => ({
      // Nama projectnya sengaja TIDAK ikut di judul: baris pemasukan sudah
      // menyebut klien & project-nya sendiri di baris keterangan, jadi
      // memasukkannya ke judul membuat nama yang sama terbaca tiga kali
      // dalam satu baris.
      title: `Langganan ${periodLabel(item.dueDate)}`,
      amount: project.deal_value,
      // Kategori `retainer` dipakai ulang, bukan nilai enum baru — lihat
      // INCOME_CATEGORY_LABEL di lib/types.ts.
      category: "retainer" as const,
      status: "planned" as const,
      due_date: item.dueDate,
      description: `Periode ${item.period} dari ${schedule.length} · ${formatDate(item.coverStart)} – ${formatDate(item.coverEnd)}`,
      client_id: project.client_id,
      project_id: project.id,
      recorded_by: user?.id ?? null,
    })),
  );

  if (error) {
    console.error("Gagal menerbitkan tagihan langganan:", error);
    return { error: "Gagal menerbitkan tagihan langganan." };
  }

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    entityType: "income",
    entityId: null,
    action: "created",
    summary: `menerbitkan ${missing.length} tagihan langganan untuk project "${project.name}"`,
  });

  revalidatePath(`/backoffice/clients/${clientId}`);
  revalidatePath("/backoffice/finance");
  revalidatePath("/backoffice/finance/income");
  return { error: null, created: missing.length };
}

export async function deleteProject(projectId: string, clientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .single();

  await supabase.from("projects").delete().eq("id", projectId);

  if (project) {
    await logActivity(supabase, {
      actorId: user?.id ?? null,
      entityType: "project",
      entityId: null,
      action: "deleted",
      summary: `menghapus project "${project.name}"`,
    });
  }

  revalidatePath(`/backoffice/clients/${clientId}`);
}

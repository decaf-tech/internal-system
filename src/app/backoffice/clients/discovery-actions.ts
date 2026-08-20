"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import type { DiscoveryRequest } from "@/lib/types";

/**
 * Dua tombol di kotak masuk permintaan discovery: jadikan prospek, atau
 * arsipkan.
 *
 * Isian dari situs publik sengaja mendarat di tabelnya sendiri, bukan
 * langsung di papan pipeline (alasannya panjang, ada di migration 013).
 * Berkas ini adalah jembatan manualnya — satu tekan tombol oleh seorang
 * manusia yang sudah membaca isinya.
 */

export type DiscoveryActionState = { error: string | null; ok?: true };

function revalidateInbox() {
  revalidatePath("/backoffice/clients");
  revalidatePath("/backoffice/clients/list");
}

/**
 * Permintaan → prospek di tahap paling awal.
 *
 * Mengikuti aturan yang sama dengan `createProspect`: baris `clients`
 * dibuat lebih dulu supaya prospek yang masih di tahap awal pun bisa
 * ditaut ke tugas & kalender (migration 009). Yang berbeda cuma asal
 * datanya — dari isian pengunjung, bukan dari form tim.
 *
 * Namanya diambil dari kolom bidang usaha: itu satu-satunya penyebutan
 * diri yang kita punya sampai obrolan pertama terjadi. Boleh (dan
 * biasanya perlu) diganti lewat Edit Prospek setelah teleponnya diangkat.
 */
export async function convertDiscoveryRequest(
  request: DiscoveryRequest,
): Promise<DiscoveryActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  if (request.status !== "baru") {
    return { error: "Permintaan ini sudah pernah ditindaklanjuti." };
  }

  const name = request.business;

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      name,
      phone: request.phone,
      status: "lead",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (clientError || !client) {
    console.error("Gagal membuat klien dari permintaan discovery:", clientError);
    return { error: "Gagal membuat prospek dari permintaan ini." };
  }

  const { data: prospect, error: prospectError } = await supabase
    .from("prospects")
    .insert({
      name,
      contact_phone: request.phone,
      stage: "prospek",
      // Yang menekan tombolnya yang memegang follow-up-nya sampai ada
      // yang mengambil alih — permintaan tanpa pemilik adalah permintaan
      // yang tidak ditelepon siapa-siapa.
      owner_id: user.id,
      created_by: user.id,
      client_id: client.id,
    })
    .select("id")
    .single();

  if (prospectError || !prospect) {
    console.error("Gagal membuat prospek dari permintaan discovery:", prospectError);
    await supabase.from("clients").delete().eq("id", client.id);
    return { error: "Gagal membuat prospek dari permintaan ini." };
  }

  const { error: markError } = await supabase
    .from("discovery_requests")
    .update({
      status: "diproses",
      prospect_id: prospect.id,
      handled_by: user.id,
      handled_at: new Date().toISOString(),
    })
    .eq("id", request.id);

  // Prospeknya sudah jadi dan itu yang penting. Kalau penandaan gagal,
  // yang terjadi cuma permintaannya tetap tampil di kotak masuk — jauh
  // lebih ringan daripada membatalkan prospek yang sudah benar.
  if (markError) {
    console.error("Prospek dibuat, tapi permintaannya gagal ditandai:", markError);
  }

  await logActivity(supabase, {
    actorId: user.id,
    entityType: "prospect",
    entityId: prospect.id,
    action: "created",
    summary: `menjadikan permintaan discovery "${name}" sebagai prospek`,
  });

  revalidateInbox();
  return { error: null, ok: true };
}

/**
 * Arsip, bukan hapus.
 *
 * Sebagian yang diarsipkan adalah spam, tapi sebagian lagi adalah orang
 * yang belum siap sekarang dan menghubungi lagi enam bulan kemudian —
 * dan pada saat itu, mengetahui bahwa ia pernah datang duluan mengubah
 * cara meneleponnya.
 */
export async function archiveDiscoveryRequest(
  requestId: string,
): Promise<DiscoveryActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  const { error } = await supabase
    .from("discovery_requests")
    .update({
      status: "arsip",
      handled_by: user.id,
      handled_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    console.error("Gagal mengarsipkan permintaan discovery:", error);
    return { error: "Gagal mengarsipkan permintaan ini." };
  }

  revalidateInbox();
  return { error: null, ok: true };
}

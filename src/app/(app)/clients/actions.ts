"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseRupiah } from "@/lib/format";
import { logActivity } from "@/lib/activity";
import { PROJECT_STATUS_LABEL } from "@/lib/types";
import type { ClientStatus, ProjectStatus, ProjectTrack } from "@/lib/types";

// `ok` menandai submit yang berhasil. Client component memakainya sebagai
// sinyal untuk menutup modal — state awal (`ok` undefined) tidak ikut memicu.
export type FormState = { error: string | null; ok?: true };

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
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

  revalidatePath("/clients");
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

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
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

  revalidatePath("/clients");
  redirect("/clients");
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

  const { data: created, error } = await supabase
    .from("projects")
    .insert({
      client_id: clientId,
      name,
      description: text(formData, "description"),
      status: (text(formData, "status") ?? "planning") as ProjectStatus,
      track: (text(formData, "track") ?? "other") as ProjectTrack,
      start_date: text(formData, "start_date"),
      target_date: text(formData, "target_date"),
      // Boleh kosong: deal sering baru punya angka setelah beberapa kali
      // bolak-balik penawaran, dan project-nya sudah perlu ada sebelum itu.
      deal_value: parseRupiah(formData.get("deal_value")),
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

  revalidatePath(`/clients/${clientId}`);
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

  revalidatePath(`/clients/${clientId}`);
}

/**
 * Ubah nilai deal dari halaman klien, tanpa membuka form project.
 *
 * `raw` kosong berarti dealnya dihapus (kembali "belum ada angka"), bukan
 * nol — nol berarti project gratisan, dan itu informasi yang berbeda.
 */
export async function updateProjectDeal(
  projectId: string,
  clientId: string,
  raw: string,
): Promise<{ error: string | null }> {
  const trimmed = raw.trim();
  const value = trimmed === "" ? null : parseRupiah(trimmed);

  if (trimmed !== "" && value === null) {
    return { error: "Nilai deal harus berupa angka lebih dari nol." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: project, error } = await supabase
    .from("projects")
    .update({ deal_value: value })
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

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/finance");
  return { error: null };
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

  revalidatePath(`/clients/${clientId}`);
}

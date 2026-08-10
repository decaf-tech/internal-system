"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const { error } = await supabase.from("clients").insert({
    name,
    company: text(formData, "company"),
    contact_person: text(formData, "contact_person"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    status: (text(formData, "status") ?? "lead") as ClientStatus,
    notes: text(formData, "notes"),
    created_by: user.id,
  });

  if (error) {
    console.error("Gagal menambah klien:", error);
    return { error: "Gagal menyimpan klien." };
  }

  revalidatePath("/clients");
  return { error: null, ok: true };
}

export async function updateClientRecord(
  clientId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();

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

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  return { error: null, ok: true };
}

export async function deleteClientRecord(clientId: string) {
  const supabase = await createClient();
  await supabase.from("clients").delete().eq("id", clientId);
  revalidatePath("/clients");
  redirect("/clients");
}

export async function createProject(
  clientId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();

  const name = text(formData, "name");
  if (!name) return { error: "Nama project wajib diisi." };

  const { error } = await supabase.from("projects").insert({
    client_id: clientId,
    name,
    description: text(formData, "description"),
    status: (text(formData, "status") ?? "planning") as ProjectStatus,
    track: (text(formData, "track") ?? "other") as ProjectTrack,
    start_date: text(formData, "start_date"),
    target_date: text(formData, "target_date"),
  });

  if (error) {
    console.error("Gagal menambah project:", error);
    return { error: "Gagal menyimpan project." };
  }

  revalidatePath(`/clients/${clientId}`);
  return { error: null, ok: true };
}

export async function updateProjectStatus(
  projectId: string,
  clientId: string,
  status: ProjectStatus,
) {
  const supabase = await createClient();
  await supabase.from("projects").update({ status }).eq("id", projectId);
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteProject(projectId: string, clientId: string) {
  const supabase = await createClient();
  await supabase.from("projects").delete().eq("id", projectId);
  revalidatePath(`/clients/${clientId}`);
}

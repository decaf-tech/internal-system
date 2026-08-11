"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { parseIdList, syncJoinTable } from "@/lib/join-table";
import type { CardColor, EventRecurrence } from "@/lib/types";

export type EventFormState = { error: string | null; ok?: true };

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

function syncEventAttendees(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  wanted: string[],
) {
  return syncJoinTable(supabase, {
    table: "event_attendees",
    anchorColumn: "event_id",
    anchorId: eventId,
    otherColumn: "profile_id",
    wanted,
  });
}

function readSeriesFields(formData: FormData) {
  const title = text(formData, "title");
  const eventDate = text(formData, "event_date");
  if (!title) return { error: "Judul rapat wajib diisi." } as const;
  if (!eventDate) return { error: "Tanggal rapat wajib diisi." } as const;

  const isAllDay = formData.get("is_all_day") === "on";
  const recurrence = (text(formData, "recurrence") ?? "none") as EventRecurrence;
  const weekdays = parseIdList(formData, "recurrence_weekdays")
    .map(Number)
    .filter((day) => day >= 1 && day <= 7);

  return {
    error: null,
    values: {
      title,
      description: text(formData, "description"),
      location: text(formData, "location"),
      event_date: eventDate,
      is_all_day: isAllDay,
      start_time: isAllDay ? null : text(formData, "start_time"),
      end_time: isAllDay ? null : text(formData, "end_time"),
      recurrence,
      recurrence_weekdays:
        recurrence === "weekly" && weekdays.length > 0 ? weekdays : null,
      recurrence_until:
        recurrence === "none" ? null : text(formData, "recurrence_until"),
      color: (text(formData, "color") ?? "blue") as CardColor,
    },
  } as const;
}

export async function createEvent(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  const parsed = readSeriesFields(formData);
  if (parsed.error !== null) return { error: parsed.error };

  const { data: created, error } = await supabase
    .from("events")
    .insert({ ...parsed.values, created_by: user.id })
    .select("id")
    .single();

  if (error || !created) {
    console.error("Gagal membuat rapat:", error);
    return { error: "Gagal menyimpan rapat." };
  }

  const attendees = parseIdList(formData, "attendee_ids");
  if (attendees.length > 0) await syncEventAttendees(supabase, created.id, attendees);

  await logActivity(supabase, {
    actorId: user.id,
    entityType: "event",
    entityId: created.id,
    action: "created",
    summary: `membuat rapat "${parsed.values.title}"`,
  });

  revalidatePath("/tasks");
  return { error: null, ok: true };
}

/**
 * Ubah SELURUH SERI — jadwal berulangnya, jamnya, judulnya, pesertanya.
 * Kemunculan yang sudah punya pengecualian sendiri (lihat `updateEventOccurrence`)
 * tetap memakai pengecualiannya, tidak ikut tertimpa oleh perubahan ini.
 */
export async function updateEventSeries(
  eventId: string,
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const parsed = readSeriesFields(formData);
  if (parsed.error !== null) return { error: parsed.error };

  const { error } = await supabase
    .from("events")
    .update(parsed.values)
    .eq("id", eventId);

  if (error) {
    console.error("Gagal memperbarui rapat:", error);
    return { error: "Gagal menyimpan perubahan." };
  }

  await syncEventAttendees(supabase, eventId, parseIdList(formData, "attendee_ids"));

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    entityType: "event",
    entityId: eventId,
    action: "updated",
    summary: `mengubah seluruh seri rapat "${parsed.values.title}"`,
  });

  revalidatePath("/tasks");
  return { error: null, ok: true };
}

/**
 * Ubah HANYA SATU KEMUNCULAN dari sebuah seri berulang, lewat baris di
 * `event_exceptions`. Peserta tidak ikut di sini — peserta selalu properti
 * seluruh seri (lihat catatan skema di migration 005).
 */
export async function updateEventOccurrence(
  eventId: string,
  occurrenceDate: string,
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const title = text(formData, "title");
  if (!title) return { error: "Judul rapat wajib diisi." };

  const isAllDay = formData.get("is_all_day") === "on";

  const { error } = await supabase.from("event_exceptions").upsert(
    {
      event_id: eventId,
      occurrence_date: occurrenceDate,
      cancelled: false,
      title,
      start_time: isAllDay ? null : text(formData, "start_time"),
      end_time: isAllDay ? null : text(formData, "end_time"),
    },
    { onConflict: "event_id,occurrence_date" },
  );

  if (error) {
    console.error("Gagal mengubah kemunculan rapat:", error);
    return { error: "Gagal menyimpan perubahan." };
  }

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    entityType: "event",
    entityId: eventId,
    action: "updated",
    summary: `mengubah rapat "${title}" tanggal ${occurrenceDate}`,
  });

  revalidatePath("/tasks");
  return { error: null, ok: true };
}

export async function deleteEventSeries(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: series } = await supabase
    .from("events")
    .select("title")
    .eq("id", eventId)
    .single();

  await supabase.from("events").delete().eq("id", eventId);

  if (series) {
    await logActivity(supabase, {
      actorId: user?.id ?? null,
      entityType: "event",
      entityId: null,
      action: "deleted",
      summary: `menghapus seluruh seri rapat "${series.title}"`,
    });
  }

  revalidatePath("/tasks");
}

/** Batalkan satu kemunculan saja — seri & kemunculan lain tidak berubah. */
export async function cancelEventOccurrence(
  eventId: string,
  occurrenceDate: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: series } = await supabase
    .from("events")
    .select("title")
    .eq("id", eventId)
    .single();

  await supabase.from("event_exceptions").upsert(
    {
      event_id: eventId,
      occurrence_date: occurrenceDate,
      cancelled: true,
      title: null,
      start_time: null,
      end_time: null,
    },
    { onConflict: "event_id,occurrence_date" },
  );

  if (series) {
    await logActivity(supabase, {
      actorId: user?.id ?? null,
      entityType: "event",
      entityId: eventId,
      action: "deleted",
      summary: `membatalkan rapat "${series.title}" tanggal ${occurrenceDate}`,
    });
  }

  revalidatePath("/tasks");
}

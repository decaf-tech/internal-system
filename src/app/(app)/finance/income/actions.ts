"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatRupiah, parseRupiah } from "@/lib/format";
import { logActivity } from "@/lib/activity";
import { INCOME_STATUS_LABEL } from "@/lib/types";
import type {
  IncomeCategory,
  IncomeStatus,
  PaymentMethod,
} from "@/lib/types";

export type FormState = { error: string | null; ok?: true };

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

/** Semua halaman yang angkanya berubah begitu satu pemasukan disentuh. */
function revalidateMoney() {
  revalidatePath("/finance");
  revalidatePath("/finance/income");
  revalidatePath("/");
}

function readForm(formData: FormData) {
  const title = text(formData, "title");
  if (!title) return { error: "Keterangan pemasukan wajib diisi." } as const;

  const amount = parseRupiah(formData.get("amount"));
  if (amount === null) {
    return { error: "Jumlah harus berupa angka lebih dari nol." } as const;
  }

  return {
    error: null,
    values: {
      title,
      amount,
      category: (text(formData, "category") ?? "termin") as IncomeCategory,
      status: (text(formData, "status") ?? "planned") as IncomeStatus,
      due_date:
        text(formData, "due_date") ?? new Date().toISOString().slice(0, 10),
      method: text(formData, "method") as PaymentMethod | null,
      description: text(formData, "description"),
      client_id: text(formData, "client_id"),
      project_id: text(formData, "project_id"),
    },
  } as const;
}

export async function createIncome(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  const parsed = readForm(formData);
  if (parsed.error !== null) return { error: parsed.error };

  const { data: income, error } = await supabase
    .from("incomes")
    .insert({ ...parsed.values, recorded_by: user.id })
    .select("id")
    .single();

  if (error || !income) {
    console.error("Gagal menyimpan pemasukan:", error);
    return { error: "Gagal menyimpan pemasukan." };
  }

  await logActivity(supabase, {
    actorId: user.id,
    entityType: "income",
    entityId: income.id,
    action: "created",
    summary: `mencatat pemasukan "${parsed.values.title}" (${formatRupiah(parsed.values.amount)})`,
  });

  revalidateMoney();
  return { error: null, ok: true };
}

export async function updateIncome(
  incomeId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const parsed = readForm(formData);
  if (parsed.error !== null) return { error: parsed.error };

  const { error } = await supabase
    .from("incomes")
    .update(parsed.values)
    .eq("id", incomeId);

  if (error) {
    console.error("Gagal memperbarui pemasukan:", error);
    return { error: "Gagal menyimpan perubahan." };
  }

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    entityType: "income",
    entityId: incomeId,
    action: "updated",
    summary: `mengubah pemasukan "${parsed.values.title}"`,
  });

  revalidateMoney();
  return { error: null, ok: true };
}

/**
 * Ubah status dari daftar, tanpa membuka form.
 *
 * `received_date` tidak ikut dikirim dari sini — trigger di database yang
 * mengisinya begitu statusnya jadi 'received', dan mengosongkannya lagi
 * kalau statusnya ditarik mundur. Satu tempat, satu aturan.
 */
export async function updateIncomeStatus(
  incomeId: string,
  status: IncomeStatus,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: income } = await supabase
    .from("incomes")
    .update({ status })
    .eq("id", incomeId)
    .select("title")
    .single();

  if (income) {
    await logActivity(supabase, {
      actorId: user?.id ?? null,
      entityType: "income",
      entityId: incomeId,
      action: "status_changed",
      summary: `mengubah status pemasukan "${income.title}" jadi ${INCOME_STATUS_LABEL[status]}`,
    });
  }

  revalidateMoney();
}

export async function deleteIncome(incomeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: income } = await supabase
    .from("incomes")
    .select("title")
    .eq("id", incomeId)
    .single();

  await supabase.from("incomes").delete().eq("id", incomeId);

  if (income) {
    await logActivity(supabase, {
      actorId: user?.id ?? null,
      entityType: "income",
      entityId: null,
      action: "deleted",
      summary: `menghapus pemasukan "${income.title}"`,
    });
  }

  revalidateMoney();
}

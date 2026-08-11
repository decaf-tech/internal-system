"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseRupiah, formatRupiah } from "@/lib/format";
import { logActivity } from "@/lib/activity";
import { EXPENSE_STATUS_LABEL } from "@/lib/types";
import type { ExpenseCategory, ExpenseStatus } from "@/lib/types";

/**
 * `expenseId` diisi kalau penyimpanan berhasil. Dipakai form di browser
 * untuk mengunggah struk setelah pengeluarannya tercatat — struknya tidak
 * ikut dikirim dalam form ini supaya ukurannya tidak dibatasi body request.
 */
export type FormState = { error: string | null; ok?: true; expenseId?: string };

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

export async function createExpense(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan masuk lagi." };

  const title = text(formData, "title");
  if (!title) return { error: "Keterangan pengeluaran wajib diisi." };

  // Angka rupiah yang diketik manusia ("150.000", "Rp 1.500.000") dibaca
  // oleh parser bersama di lib/format, sama seperti di form pemasukan.
  const amount = parseRupiah(formData.get("amount"));
  if (amount === null) {
    return { error: "Jumlah harus berupa angka lebih dari nol." };
  }

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      title,
      amount,
      category: (text(formData, "category") ?? "other") as ExpenseCategory,
      description: text(formData, "description"),
      expense_date:
        text(formData, "expense_date") ??
        new Date().toISOString().slice(0, 10),
      is_reimbursement: formData.get("is_reimbursement") === "on",
      client_id: text(formData, "client_id"),
      project_id: text(formData, "project_id"),
      submitted_by: user.id,
    })
    .select("id")
    .single();

  if (error || !expense) {
    console.error("Gagal menyimpan pengeluaran:", error);
    return { error: "Gagal menyimpan pengeluaran." };
  }

  await logActivity(supabase, {
    actorId: user.id,
    entityType: "expense",
    entityId: expense.id,
    action: "created",
    summary: `mencatat pengeluaran "${title}" (${formatRupiah(amount)})`,
  });

  revalidatePath("/finance/expenses");
  revalidatePath("/finance");
  revalidatePath("/");
  return { error: null, ok: true, expenseId: expense.id };
}

export async function updateExpenseStatus(
  expenseId: string,
  status: ExpenseStatus,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: expense } = await supabase
    .from("expenses")
    .update({
      status,
      // Catat siapa yang menyetujui/menolak dan kapan — jejak ini yang
      // dibutuhkan Lija saat merapikan pembukuan di akhir bulan.
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", expenseId)
    .select("title")
    .single();

  if (expense) {
    await logActivity(supabase, {
      actorId: user.id,
      entityType: "expense",
      entityId: expenseId,
      action: "status_changed",
      summary: `mengubah status pengeluaran "${expense.title}" jadi ${EXPENSE_STATUS_LABEL[status]}`,
    });
  }

  revalidatePath("/finance/expenses");
  revalidatePath("/finance");
  revalidatePath("/");
}

export async function deleteExpense(expenseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: expense } = await supabase
    .from("expenses")
    .select("title")
    .eq("id", expenseId)
    .single();

  await supabase.from("expenses").delete().eq("id", expenseId);

  if (expense) {
    await logActivity(supabase, {
      actorId: user?.id ?? null,
      entityType: "expense",
      entityId: null,
      action: "deleted",
      summary: `menghapus pengeluaran "${expense.title}"`,
    });
  }

  revalidatePath("/finance/expenses");
  revalidatePath("/finance");
  revalidatePath("/");
}

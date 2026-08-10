"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadDocument } from "@/lib/actions/documents";
import type { ExpenseCategory, ExpenseStatus } from "@/lib/types";

export type FormState = { error: string | null; ok?: true };

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

  // Input angka rupiah sering ditulis "150.000" — buang pemisah ribuan
  // sebelum diubah jadi angka.
  const rawAmount = String(formData.get("amount") ?? "").replace(/[.\s]/g, "");
  const amount = Number(rawAmount.replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) {
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
      submitted_by: user.id,
    })
    .select("id")
    .single();

  if (error || !expense) {
    console.error("Gagal menyimpan pengeluaran:", error);
    return { error: "Gagal menyimpan pengeluaran." };
  }

  // Struk opsional. Kalau uploadnya gagal, pengeluarannya tetap tersimpan —
  // struk bisa dilampirkan menyusul dari halaman detail.
  const receipt = formData.get("receipt");
  if (receipt instanceof File && receipt.size > 0) {
    const receiptData = new FormData();
    receiptData.append("file", receipt);
    const result = await uploadDocument({ expenseId: expense.id }, receiptData);
    if (result.error) {
      revalidatePath("/expenses");
      return { error: `Pengeluaran tersimpan, tapi struk gagal diunggah: ${result.error}` };
    }
  }

  revalidatePath("/expenses");
  revalidatePath("/");
  return { error: null, ok: true };
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

  await supabase
    .from("expenses")
    .update({
      status,
      // Catat siapa yang menyetujui/menolak dan kapan — jejak ini yang
      // dibutuhkan Lija saat merapikan pembukuan di akhir bulan.
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", expenseId);

  revalidatePath("/expenses");
  revalidatePath("/");
}

export async function deleteExpense(expenseId: string) {
  const supabase = await createClient();
  await supabase.from("expenses").delete().eq("id", expenseId);
  revalidatePath("/expenses");
  revalidatePath("/");
}

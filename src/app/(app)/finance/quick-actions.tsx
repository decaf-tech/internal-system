"use client";

import { NewIncomeButton, type IncomeFormOptions } from "./income/income-ui";
import {
  NewExpenseButton,
  type ExpenseFormOptions,
} from "./expenses/expense-ui";

/**
 * Kedua tombol catat, di halaman Ringkasan.
 *
 * Ringkasan adalah halaman keuangan yang paling sering dibuka — dan
 * sampai sekarang satu-satunya halaman keuangan yang tidak bisa dipakai
 * mencatat apa pun. Menuliskan satu pengeluaran berarti: buka Ringkasan,
 * lihat angkanya, ketuk tab Pengeluaran, tunggu halaman baru, baru
 * ketuk tombolnya. Padahal formnya sendiri sudah berupa modal yang bisa
 * dibuka dari mana saja.
 *
 * Pilihan warnanya bukan selera: pemasukan memakai aksen (satu tindakan
 * utama per layar), pengeluaran memakai garis tepi. Dua tombol pekat
 * bersebelahan membuat keduanya sama-sama berteriak dan tidak ada yang
 * terbaca lebih dulu.
 */
export function FinanceQuickActions({
  incomeOptions,
  expenseOptions,
}: {
  incomeOptions: IncomeFormOptions;
  expenseOptions: ExpenseFormOptions;
}) {
  return (
    // Di HP keduanya berbagi lebar layar rata dua, jadi tidak ada tombol
    // yang lebih sulit dikenai daripada yang lain. Labelnya dipendekkan
    // dari "+ Catat Pengeluaran": di lebar setengah layar kata "Catat"
    // memaksa tombolnya jadi dua baris, dan halaman ini sudah bernama
    // Keuangan — tidak ada yang perlu diperjelas lagi.
    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
      <NewExpenseButton
        options={expenseOptions}
        className="btn btn-ghost"
        label="+ Pengeluaran"
      />
      <NewIncomeButton
        options={incomeOptions}
        className="btn btn-accent"
        label="+ Pemasukan"
      />
    </div>
  );
}

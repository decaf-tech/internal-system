import { permanentRedirect } from "next/navigation";

/**
 * Pengeluaran pindah ke bawah Keuangan, bersama Pemasukan dan Ringkasan
 * cashflow. Alamat lamanya dipertahankan sebagai pengalihan supaya tautan
 * yang sudah terlanjur di-bookmark tim tidak mati.
 */
export default function LegacyExpensesPage() {
  permanentRedirect("/backoffice/finance/expenses");
}

import { addDays, addMonths, format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { dateKey, parseKey } from "./date-range";

/**
 * Skema nilai sebuah deal — sekali bayar atau langganan.
 *
 * Modul ini memegang SATU rumus untuk pertanyaan yang muncul di banyak
 * tempat: "deal ini nilainya berapa?". Untuk pekerjaan sekali jadi
 * jawabannya sama dengan angka yang diketik. Untuk langganan tidak:
 * Rp300.000 per bulan dengan kontrak setahun bernilai Rp3.600.000, dan
 * angka itulah yang berhak masuk ke nilai pipeline, ke "Deal per Project",
 * dan ke sisa tagihan.
 *
 * Rumusnya sengaja tinggal di TypeScript, bukan di kolom turunan
 * (generated column) di database — lihat alasannya di kepala
 * `supabase/migrations/010_skema_langganan.sql`. Konsekuensinya: setiap
 * tempat yang menampilkan atau menjumlahkan nilai deal WAJIB lewat sini,
 * bukan membaca `estimated_value` / `deal_value` mentah-mentah. Kolom itu
 * cuma nilai satu periode begitu skemanya langganan.
 */

export type BillingType = "one_time" | "subscription";

export type BillingPeriod = "monthly" | "quarterly" | "yearly";

/**
 * Tiga kolom yang sama persis ada di `prospects` dan `projects`. Fungsi di
 * bawah menerima bentuk ini, jadi keduanya dilayani kode yang sama —
 * pertanyaannya memang identik di dua tahap hubungan yang sama.
 */
export type BillingScheme = {
  billing_type: BillingType;
  billing_period: BillingPeriod | null;
  contract_months: number | null;
};

export const BILLING_TYPE_LABEL: Record<BillingType, string> = {
  one_time: "Sekali Bayar",
  subscription: "Langganan",
};

export const BILLING_TYPE_ORDER: BillingType[] = ["one_time", "subscription"];

export const BILLING_PERIOD_LABEL: Record<BillingPeriod, string> = {
  monthly: "Bulanan",
  quarterly: "Per 3 Bulan",
  yearly: "Tahunan",
};

/** Satuan yang ditempel di belakang angka: "Rp300.000 / bulan". */
export const BILLING_PERIOD_UNIT: Record<BillingPeriod, string> = {
  monthly: "bulan",
  quarterly: "3 bulan",
  yearly: "tahun",
};

export const BILLING_PERIOD_MONTHS: Record<BillingPeriod, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

export const BILLING_PERIOD_ORDER: BillingPeriod[] = [
  "monthly",
  "quarterly",
  "yearly",
];

/**
 * Pilihan durasi kontrak yang ditawarkan form. Bukan batasan — kolomnya
 * menerima angka bulan berapa pun, dan formnya menyediakan isian bebas di
 * sebelahnya. Ini cuma jalan pintas untuk panjang yang paling sering
 * dipakai, supaya kontrak setahun tidak perlu diketik "12".
 */
export const CONTRACT_MONTH_CHOICES = [1, 3, 6, 12, 24, 36];

export function isSubscription(scheme: BillingScheme) {
  return scheme.billing_type === "subscription";
}

/**
 * Berapa kali deal ini ditagih selama kontrak. Sekali bayar selalu 1 —
 * itu yang membuat semua rumus di bawah tidak perlu bercabang.
 *
 * Skema langganan yang datanya belum lengkap (mis. baris lama, atau data
 * yang lolos lewat jalur lain) juga jatuh ke 1: lebih baik nilainya
 * dilaporkan sebagai satu periode daripada dilaporkan sebagai nol.
 */
export function periodCount(scheme: BillingScheme): number {
  if (!isSubscription(scheme)) return 1;
  if (!scheme.billing_period || !scheme.contract_months) return 1;

  const months = BILLING_PERIOD_MONTHS[scheme.billing_period];
  return Math.max(1, Math.ceil(scheme.contract_months / months));
}

/**
 * Nilai penuh kontrak — angka yang berarti "deal ini besarnya berapa".
 *
 * `unitAmount` adalah isi kolom `estimated_value`/`deal_value` apa adanya:
 * nilai seluruh deal untuk sekali bayar, nilai satu periode untuk
 * langganan. Null tetap null — "belum ada angkanya" bukan nol.
 */
export function contractValue(
  scheme: BillingScheme,
  unitAmount: number | null | undefined,
): number | null {
  if (unitAmount == null) return null;
  return Number(unitAmount) * periodCount(scheme);
}

/** Sama seperti `contractValue`, tapi null dianggap nol — untuk dijumlahkan. */
export function contractValueOrZero(
  scheme: BillingScheme,
  unitAmount: number | null | undefined,
) {
  return contractValue(scheme, unitAmount) ?? 0;
}

/**
 * Nilai per bulan yang disetarakan — dasar "pendapatan berulang" (MRR).
 *
 * Deal sekali bayar bernilai nol di sini dengan sengaja: uangnya masuk
 * sekali lalu selesai, jadi memasukkannya ke angka bulanan akan membuat
 * pendapatan berulang terlihat lebih besar dari yang benar-benar berulang.
 */
export function monthlyValue(
  scheme: BillingScheme,
  unitAmount: number | null | undefined,
): number {
  if (unitAmount == null) return 0;
  if (!isSubscription(scheme) || !scheme.billing_period) return 0;

  return Number(unitAmount) / BILLING_PERIOD_MONTHS[scheme.billing_period];
}

/**
 * Tanggal terakhir kontrak masih berjalan.
 *
 * Kontrak 12 bulan yang mulai 1 September berakhir 31 Agustus, bukan
 * 1 September tahun depan — hari terakhir yang masih terlayani, bukan hari
 * pertama yang sudah tidak.
 */
export function contractEndDate(
  startDate: string | null | undefined,
  scheme: BillingScheme,
): string | null {
  if (!startDate) return null;
  if (!isSubscription(scheme) || !scheme.contract_months) return null;

  return dateKey(
    addDays(addMonths(parseKey(startDate), scheme.contract_months), -1),
  );
}

/**
 * Sisa hari kontrak dihitung dari `today` (yang selalu datang dari server,
 * lihat `todayJakarta`). Negatif berarti kontraknya sudah lewat.
 *
 * Perbandingannya lewat selisih hari kalender, bukan milidetik: keduanya
 * tanggal tanpa jam, dan pembulatan milidetik akan meleset satu hari tiap
 * kali ada pergantian waktu musim panas di zona mesin yang menghitungnya.
 */
export function contractDaysLeft(
  endDate: string | null,
  today: string,
): number | null {
  if (!endDate) return null;

  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (parseKey(endDate).getTime() - parseKey(today).getTime()) / oneDay,
  );
}

/** Ambang "sebentar lagi habis" — dipakai halaman Keuangan & kartu project. */
export const CONTRACT_RENEWAL_WARNING_DAYS = 45;

export type BillingInstallment = {
  /** Nomor periode, mulai dari 1 — dipakai di keterangan tagihan. */
  period: number;
  /** Jatuh tempo tagihan periode ini, "yyyy-MM-dd". */
  dueDate: string;
  /** Hari pertama & terakhir yang dilayani periode ini. */
  coverStart: string;
  coverEnd: string;
};

/**
 * Jadwal tagihan sepanjang kontrak — satu baris per periode.
 *
 * Tagihan jatuh tempo di AWAL periode yang dilayaninya (bayar dulu, pakai
 * kemudian), pola yang berlaku untuk hampir semua langganan. Periode
 * pertama karena itu jatuh tempo tepat di tanggal mulai kontrak.
 *
 * Ini yang dipakai `generateSubscriptionIncomes` untuk menerbitkan baris
 * `incomes` — jadi langganan ikut terpantau lewat halaman Pemasukan yang
 * sudah ada, bukan lewat layar terpisah yang harus dilihat sendiri.
 */
export function billingSchedule(
  startDate: string,
  scheme: BillingScheme,
): BillingInstallment[] {
  if (!isSubscription(scheme) || !scheme.billing_period) return [];

  const step = BILLING_PERIOD_MONTHS[scheme.billing_period];
  const start = parseKey(startDate);

  return Array.from({ length: periodCount(scheme) }, (_, index) => {
    const from = addMonths(start, index * step);
    const next = addMonths(start, (index + 1) * step);

    return {
      period: index + 1,
      dueDate: dateKey(from),
      coverStart: dateKey(from),
      coverEnd: dateKey(addDays(next, -1)),
    };
  });
}

/**
 * Kenapa durasi kontrak dan periode tagih harus cocok: kontrak 5 bulan yang
 * ditagih per 3 bulan menyisakan periode ketiga yang cuma dipakai dua bulan
 * tapi ditagih penuh — dan nilai kontraknya jadi lebih besar dari yang
 * disepakati. Ditolak di form, bukan dibulatkan diam-diam.
 *
 * Mengembalikan pesan kesalahan siap tampil, atau null kalau tidak apa-apa.
 */
export function contractMonthsError(
  period: BillingPeriod,
  months: number,
): string | null {
  const step = BILLING_PERIOD_MONTHS[period];
  if (months % step === 0) return null;

  return `Durasi kontrak harus kelipatan ${step} bulan untuk penagihan ${BILLING_PERIOD_LABEL[period].toLowerCase()}.`;
}

/**
 * "Rp300.000 / bulan · 12 bulan" — ringkasan satu baris untuk kartu &
 * daftar. Angkanya diformat pemanggil supaya modul ini tidak ikut memutuskan
 * antara rupiah penuh dan singkatan "Rp300 rb" yang dipakai di kolom sempit.
 */
export function schemeSummary(
  scheme: BillingScheme,
  formattedUnitAmount: string,
): string {
  if (!isSubscription(scheme) || !scheme.billing_period) {
    return formattedUnitAmount;
  }

  const unit = BILLING_PERIOD_UNIT[scheme.billing_period];
  const duration = scheme.contract_months
    ? ` · ${scheme.contract_months} bulan`
    : "";

  return `${formattedUnitAmount}/${unit}${duration}`;
}

/** "Sep 2026" — penanda periode di keterangan tagihan langganan. */
export function periodLabel(dateKeyValue: string) {
  return format(parseKey(dateKeyValue), "MMM yyyy", { locale: localeId });
}

/**
 * Baca tiga kolom skema dari FormData, sekali untuk semua server action yang
 * menyimpan deal (prospek & project).
 *
 * Divalidasi ulang di sini walaupun `BillingSchemeFields` sudah menjaga
 * kombinasinya di layar: komponen itu tidak ada di jalur form yang dikirim
 * dengan tangan, dan constraint database menolak dengan kode, bukan dengan
 * kalimat yang bisa ditampilkan ke orangnya.
 *
 * Untuk sekali bayar, dua kolom pendamping dikembalikan sebagai null —
 * bukan dibiarkan apa adanya. Itu yang membuat deal yang tadinya langganan
 * lalu diubah jadi sekali bayar tidak meninggalkan durasi kontrak lama yang
 * menempel diam-diam (dan ditolak constraint di migration 010).
 */
export function readBillingScheme(
  formData: FormData,
):
  | { error: string; scheme: null }
  | { error: null; scheme: BillingScheme } {
  const rawType = String(formData.get("billing_type") ?? "one_time");
  if (rawType !== "one_time" && rawType !== "subscription") {
    return { error: "Skema nilai tidak dikenal.", scheme: null };
  }

  if (rawType === "one_time") {
    return {
      error: null,
      scheme: {
        billing_type: "one_time",
        billing_period: null,
        contract_months: null,
      },
    };
  }

  const rawPeriod = String(formData.get("billing_period") ?? "");
  if (!(rawPeriod in BILLING_PERIOD_MONTHS)) {
    return { error: "Periode tagihan langganan wajib dipilih.", scheme: null };
  }
  const period = rawPeriod as BillingPeriod;

  const months = Number(String(formData.get("contract_months") ?? ""));
  if (!Number.isInteger(months) || months <= 0) {
    return {
      error: "Durasi kontrak harus berupa jumlah bulan lebih dari nol.",
      scheme: null,
    };
  }

  const mismatch = contractMonthsError(period, months);
  if (mismatch) return { error: mismatch, scheme: null };

  return {
    error: null,
    scheme: {
      billing_type: "subscription",
      billing_period: period,
      contract_months: months,
    },
  };
}

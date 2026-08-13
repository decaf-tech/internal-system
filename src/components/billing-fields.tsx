"use client";

import { useState } from "react";
import { formatRupiah, parseRupiah } from "@/lib/format";
import {
  BILLING_PERIOD_LABEL,
  BILLING_PERIOD_MONTHS,
  BILLING_PERIOD_ORDER,
  BILLING_PERIOD_UNIT,
  BILLING_TYPE_LABEL,
  BILLING_TYPE_ORDER,
  CONTRACT_MONTH_CHOICES,
  contractValue,
  monthlyValue,
  periodCount,
  type BillingPeriod,
  type BillingType,
} from "@/lib/billing";

/**
 * Isian skema nilai — dipakai empat form yang semuanya menanyakan hal yang
 * sama: form prospek, dialog "Tandai Menang", form project baru, dan dialog
 * ubah nilai project.
 *
 * Satu komponen untuk keempatnya, bukan empat salinan, karena aturannya
 * yang tidak boleh berbeda-beda: durasi kontrak yang ditawarkan harus
 * kelipatan periode tagihnya, dan angka yang diketik berarti "per periode"
 * begitu skemanya langganan. Empat salinan berarti empat kesempatan untuk
 * salah satunya ketinggalan saat aturannya berubah.
 *
 * Nama field-nya (`billing_type`, `billing_period`, `contract_months`) sama
 * dengan nama kolomnya, jadi server action tinggal membacanya dari FormData
 * tanpa pemetaan apa pun. Yang berbeda antar pemanggil cuma nama kolom
 * nilainya — `estimated_value` di prospek, `deal_value` di project.
 */
export function BillingSchemeFields({
  amountName,
  amountLabel,
  amountHint,
  initial,
  idPrefix = "",
  onTypeChange,
}: {
  amountName: "estimated_value" | "deal_value";
  amountLabel: string;
  /** Keterangan di bawah kolom nilai saat skemanya sekali bayar. */
  amountHint?: string;
  initial?: {
    amount?: number | null;
    billing_type?: BillingType | null;
    billing_period?: BillingPeriod | null;
    contract_months?: number | null;
  };
  /** Pembeda id kalau dua form hidup di satu halaman (mis. modal + inline). */
  idPrefix?: string;
  /**
   * Dipanggil saat skemanya berganti. Ada karena form yang membungkus
   * komponen ini kadang punya field sendiri yang aturannya ikut berubah —
   * tanggal mulai kontrak wajib untuk langganan, opsional untuk sekali
   * bayar — dan field itu bukan urusan komponen ini.
   */
  onTypeChange?: (type: BillingType) => void;
}) {
  const [billingType, setBillingType] = useState<BillingType>(
    initial?.billing_type ?? "one_time",
  );
  const [period, setPeriod] = useState<BillingPeriod>(
    initial?.billing_period ?? "monthly",
  );
  const [months, setMonths] = useState<number>(initial?.contract_months ?? 12);
  // Angkanya dipantau supaya pratinjau total kontrak ikut bergerak saat
  // diketik. Ditulis balik dengan titik ribuan seperti kolom nilai lain di
  // aplikasi ini — deretan digit tanpa pemisah harus dihitung dengan jari.
  const [amount, setAmount] = useState(
    initial?.amount != null ? initial.amount.toLocaleString("id-ID") : "",
  );

  const subscription = billingType === "subscription";
  const id = (name: string) => `${idPrefix}${name}`;

  /**
   * Durasi yang ditawarkan selalu kelipatan periode tagihnya. Kontrak 5
   * bulan yang ditagih per 3 bulan akan menagih periode ketiga secara penuh
   * padahal cuma dipakai dua bulan — jadi kombinasinya tidak pernah sampai
   * ditawarkan, bukan ditolak setelah disubmit. (Server tetap memvalidasi
   * ulang lewat `contractMonthsError`: form yang dikirim dengan tangan
   * melewati komponen ini.)
   */
  const step = BILLING_PERIOD_MONTHS[period];
  const monthChoices = CONTRACT_MONTH_CHOICES.filter(
    (choice) => choice % step === 0,
  );

  function changePeriod(next: BillingPeriod) {
    setPeriod(next);

    // Durasi yang tidak lagi cocok dinaikkan ke pilihan sah terdekat, bukan
    // dibiarkan jadi nilai yang tidak ada di daftar — select yang value-nya
    // di luar daftar tampil kosong, dan itu terbaca sebagai "belum diisi".
    const nextStep = BILLING_PERIOD_MONTHS[next];
    if (months % nextStep !== 0) {
      setMonths(Math.max(nextStep, Math.ceil(months / nextStep) * nextStep));
    }
  }

  const parsedAmount = parseRupiah(amount);
  const scheme = {
    billing_type: billingType,
    billing_period: subscription ? period : null,
    contract_months: subscription ? months : null,
  };
  const total = contractValue(scheme, parsedAmount);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={id("billing_type")}>
            Skema Nilai
          </label>
          <select
            id={id("billing_type")}
            name="billing_type"
            value={billingType}
            onChange={(event) => {
              const next = event.target.value as BillingType;
              setBillingType(next);
              onTypeChange?.(next);
            }}
            className="field"
          >
            {BILLING_TYPE_ORDER.map((value) => (
              <option key={value} value={value}>
                {BILLING_TYPE_LABEL[value]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor={id(amountName)}>
            {subscription
              ? `${amountLabel} per ${BILLING_PERIOD_UNIT[period]}`
              : amountLabel}
          </label>
          <input
            id={id(amountName)}
            name={amountName}
            // `text`, bukan `number`: angkanya diketik dengan titik ribuan
            // ala Indonesia ("5.000.000"), dan `parseRupiah` yang membacanya.
            // Input number malah menolak titik itu.
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="field"
            placeholder={subscription ? "300.000" : "5.000.000"}
          />
        </div>
      </div>

      {subscription && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor={id("billing_period")}>
              Ditagih
            </label>
            <select
              id={id("billing_period")}
              name="billing_period"
              value={period}
              onChange={(event) =>
                changePeriod(event.target.value as BillingPeriod)
              }
              className="field"
            >
              {BILLING_PERIOD_ORDER.map((value) => (
                <option key={value} value={value}>
                  {BILLING_PERIOD_LABEL[value]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor={id("contract_months")}>
              Durasi Kontrak
            </label>
            <select
              id={id("contract_months")}
              name="contract_months"
              value={months}
              onChange={(event) => setMonths(Number(event.target.value))}
              className="field"
            >
              {/* Durasi yang sudah tersimpan tapi tidak ada di daftar (mis.
                  dicatat lewat SQL langsung) tetap ikut, supaya membuka form
                  lalu menyimpannya lagi tidak diam-diam memendekkan kontrak. */}
              {[...new Set([...monthChoices, months])]
                .filter((choice) => choice % step === 0)
                .sort((a, b) => a - b)
                .map((choice) => (
                  <option key={choice} value={choice}>
                    {choice === 12
                      ? "12 bulan (1 tahun)"
                      : choice === 24
                        ? "24 bulan (2 tahun)"
                        : choice === 36
                          ? "36 bulan (3 tahun)"
                          : `${choice} bulan`}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      {/* Pratinjau, bukan sekadar keterangan: angka yang diketik ("300.000")
          bukan angka yang akan tercatat sebagai nilai deal ("3.600.000"), dan
          satu-satunya waktu murah untuk menyadari itu adalah sebelum
          disimpan. */}
      {subscription ? (
        <p className="rounded-md bg-surface-sunken px-3 py-2 text-xs text-ink-muted">
          {total != null ? (
            <>
              Nilai kontrak{" "}
              <span className="font-medium text-ink">
                {formatRupiah(total)}
              </span>{" "}
              — {periodCount(scheme)}× tagihan {formatRupiah(parsedAmount ?? 0)}
              {period !== "monthly" && (
                <> · setara {formatRupiah(monthlyValue(scheme, parsedAmount))}/bulan</>
              )}
            </>
          ) : (
            <>
              Isi nilai per {BILLING_PERIOD_UNIT[period]}-nya — nilai penuh
              kontrak dihitung otomatis dari durasi di atas.
            </>
          )}
        </p>
      ) : (
        amountHint && <p className="text-xs text-ink-subtle">{amountHint}</p>
      )}
    </div>
  );
}

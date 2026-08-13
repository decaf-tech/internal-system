// Tipe & konstanta seputar template dokumen.
//
// Modul polos — tidak menyentuh database maupun Google, jadi aman diimpor
// dari browser (form generate & pengelola template) maupun dari server.
// Yang membaca data aslinya ada di `context.ts` (server-only).

/** Jenis isian manual yang bisa diminta sebuah template. */
export type TemplateFieldType =
  | "text"
  | "multiline"
  | "number"
  | "money"
  | "date";

export const TEMPLATE_FIELD_TYPE_LABEL: Record<TemplateFieldType, string> = {
  text: "Teks singkat",
  multiline: "Teks panjang",
  number: "Angka",
  money: "Rupiah",
  date: "Tanggal",
};

export const TEMPLATE_FIELD_TYPES: TemplateFieldType[] = [
  "text",
  "multiline",
  "number",
  "money",
  "date",
];

/**
 * Satu isian manual sebuah template.
 *
 * `key` dipakai apa adanya sebagai placeholder di dokumen: field ber-key
 * `rincian` diisi ke `{{rincian}}`. Sengaja tanpa awalan, supaya jelas
 * bedanya dengan placeholder otomatis yang selalu ber-awalan (`klien.`,
 * `proyek.`, …) — dan supaya tidak mungkin sebuah field manual menimpa
 * nilai yang diambil dari database.
 */
export type TemplateField = {
  key: string;
  label: string;
  type: TemplateFieldType;
  required: boolean;
  /**
   * Nilai awal di form. Boleh mengandung placeholder otomatis, mis.
   * "Pengembangan {{proyek.nama}}" — form menggantinya dengan nilai asli
   * sebelum ditampilkan, jadi orangnya melihat kalimat jadi, bukan kode.
   */
  default: string;
};

/**
 * Nama field yang sah: huruf kecil, angka, garis bawah. Dibatasi karena
 * key ini berakhir sebagai teks yang dicari-ganti di dokumen — spasi dan
 * kurung kurawal di dalamnya akan membuat pencariannya tidak pernah
 * cocok, tanpa pesan kesalahan apa pun dari Google.
 */
export const FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

export function fieldKeyError(key: string): string | null {
  if (!key) return "Nama placeholder tidak boleh kosong.";
  if (!FIELD_KEY_PATTERN.test(key)) {
    return `"${key}" tidak sah — pakai huruf kecil, angka, dan garis bawah saja (mis. rincian_pekerjaan).`;
  }
  if (key.includes(".")) {
    return "Titik dipakai placeholder otomatis. Pilih nama tanpa titik.";
  }
  return null;
}

/**
 * Bentuk `document_templates.fields` yang datang dari database adalah
 * jsonb bebas — dibersihkan di sini supaya sisa aplikasi selalu menerima
 * `TemplateField[]` yang utuh, termasuk untuk baris lama atau baris yang
 * pernah disunting langsung lewat SQL Editor.
 */
export function parseTemplateFields(raw: unknown): TemplateField[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item): TemplateField[] => {
    if (typeof item !== "object" || item === null) return [];
    const field = item as Record<string, unknown>;

    const key = String(field.key ?? "").trim();
    if (!FIELD_KEY_PATTERN.test(key)) return [];

    const type = String(field.type ?? "text") as TemplateFieldType;

    return [
      {
        key,
        label: String(field.label ?? key),
        type: TEMPLATE_FIELD_TYPES.includes(type) ? type : "text",
        required: field.required === true,
        default: String(field.default ?? ""),
      },
    ];
  });
}

// ---------------------------------------------------------------------
// Placeholder otomatis
// ---------------------------------------------------------------------

/**
 * Katalog placeholder yang diisi sistem, dikelompokkan per sumber data.
 *
 * Ini sekaligus dokumentasi yang dibaca orang saat menyusun template di
 * Google Docs — makanya tinggal di kode, bukan di README: halaman
 * pengelola template menampilkannya langsung di sebelah formnya, jadi
 * daftar ini tidak bisa basi tanpa ketahuan.
 *
 * WAJIB sinkron dengan `buildPlaceholders()` di `context.ts`: setiap key
 * di sini harus benar-benar dihasilkan di sana (boleh string kosong),
 * dan sebaliknya.
 */
export type PlaceholderGroup = {
  label: string;
  /** Kapan kelompok ini terisi. Null berarti selalu. */
  requires: string | null;
  items: { key: string; label: string }[];
};

export const PLACEHOLDER_CATALOG: PlaceholderGroup[] = [
  {
    label: "Dokumen",
    requires: null,
    items: [
      { key: "dokumen.judul", label: "Nama template, mis. Invoice" },
      { key: "dokumen.nomor", label: "Nomor otomatis, mis. DC/INV/001/VIII/2026" },
      { key: "dokumen.tanggal", label: "Tanggal dibuat, mis. 13 Agu 2026" },
      { key: "dokumen.tanggal_panjang", label: "13 Agustus 2026" },
      { key: "dokumen.bulan_romawi", label: "VIII" },
      { key: "dokumen.tahun", label: "2026" },
      { key: "dokumen.pembuat", label: "Nama orang yang membuat dokumen" },
    ],
  },
  {
    label: "Perusahaan",
    requires: null,
    items: [
      { key: "perusahaan.nama", label: "Nama perusahaan" },
      { key: "perusahaan.alamat", label: "Alamat perusahaan" },
      { key: "perusahaan.kota", label: "Kota, untuk baris tanda tangan" },
      { key: "perusahaan.email", label: "Email perusahaan" },
      { key: "perusahaan.telepon", label: "Telepon perusahaan" },
      { key: "perusahaan.bank", label: "Nama bank" },
      { key: "perusahaan.rekening", label: "Nomor rekening" },
      { key: "perusahaan.atas_nama", label: "Nama pemilik rekening" },
      { key: "perusahaan.npwp", label: "NPWP" },
    ],
  },
  {
    label: "Klien",
    requires: "dokumen ditempel ke klien, project, tugas, atau pemasukan",
    items: [
      { key: "klien.nama", label: "Nama klien" },
      { key: "klien.perusahaan", label: "Nama perusahaan klien" },
      { key: "klien.tertagih", label: "Perusahaan kalau ada, kalau tidak namanya" },
      { key: "klien.narahubung", label: "Nama narahubung" },
      { key: "klien.alamat", label: "Alamat klien" },
      { key: "klien.email", label: "Email klien" },
      { key: "klien.telepon", label: "Telepon klien" },
    ],
  },
  {
    label: "Project",
    requires: "dokumen ditempel ke project (atau ke tugas/pemasukan yang punya project)",
    items: [
      { key: "proyek.nama", label: "Nama project" },
      { key: "proyek.deskripsi", label: "Deskripsi project" },
      { key: "proyek.nilai_kontrak", label: "Nilai penuh kontrak dalam rupiah" },
      { key: "proyek.nilai_periode", label: "Nilai satu periode tagih (langganan)" },
      { key: "proyek.skema", label: "Sekali Bayar / Langganan · periode · durasi" },
      { key: "proyek.mulai", label: "Tanggal mulai" },
      { key: "proyek.selesai_kontrak", label: "Tanggal kontrak berakhir (langganan)" },
      { key: "proyek.jadwal_tagihan", label: "Daftar jatuh tempo tiap periode (langganan)" },
    ],
  },
  {
    label: "Tugas",
    requires: "dokumen ditempel ke tugas",
    items: [
      { key: "tugas.judul", label: "Judul tugas" },
      { key: "tugas.tenggat", label: "Tenggat tugas" },
    ],
  },
  {
    label: "Pemasukan / tagihan",
    requires: "dokumen ditempel ke baris pemasukan",
    items: [
      { key: "tagihan.keterangan", label: "Keterangan pemasukan" },
      { key: "tagihan.jumlah", label: "Jumlah tagihan dalam rupiah" },
      { key: "tagihan.jumlah_angka", label: "Jumlah tanpa 'Rp', mis. 5.000.000" },
      { key: "tagihan.terbilang", label: "Lima juta rupiah" },
      { key: "tagihan.jenis", label: "DP / Termin / Pelunasan / Langganan" },
      { key: "tagihan.jatuh_tempo", label: "Tanggal jatuh tempo" },
    ],
  },
  {
    label: "Pengeluaran",
    requires: "dokumen ditempel ke pengeluaran",
    items: [
      { key: "pengeluaran.judul", label: "Judul pengeluaran" },
      { key: "pengeluaran.jumlah", label: "Jumlah dalam rupiah" },
      { key: "pengeluaran.tanggal", label: "Tanggal pengeluaran" },
    ],
  },
];

/** Semua key otomatis, rata — dipakai untuk validasi & pratinjau. */
export const AUTO_PLACEHOLDER_KEYS = PLACEHOLDER_CATALOG.flatMap((group) =>
  group.items.map((item) => item.key),
);

/**
 * Ganti `{{key}}` dengan nilainya. Key yang tidak dikenal DIBIARKAN utuh,
 * bukan dikosongkan: dipakai juga di sisi form untuk mengisi nilai awal
 * sementara nomor dokumen belum ada, dan `{{dokumen.nomor}}` yang lenyap
 * di layar akan terlihat seperti nomornya memang tidak akan terisi.
 */
export function resolvePlaceholders(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (whole, key: string) =>
    key in values ? values[key] : whole,
  );
}

/** Placeholder yang masih tersisa di sebuah teks, tanpa duplikat. */
export function remainingPlaceholders(text: string): string[] {
  const found = text.match(/\{\{\s*[\w.]+\s*\}\}/g) ?? [];
  return [...new Set(found)];
}

/**
 * Nama file yang layak dari pola `output_name` yang sudah diganti.
 *
 * Placeholder yang kosong meninggalkan lubang — "Invoice  — " kalau
 * dokumennya tidak bernomor dan tidak punya klien. Yang dirapikan di sini
 * cuma tampilannya: spasi ganda dikempiskan dan tanda pemisah yang
 * menggantung di ujung dibuang.
 */
export function tidyOutputName(name: string, fallback: string): string {
  const cleaned = name
    .replace(/\s+/g, " ")
    .replace(/\s*([—–\-·/])\s*(?=[—–\-·/]|$)/g, "")
    .replace(/^[\s—–\-·/]+/, "")
    .trim();

  return cleaned.length > 0 ? cleaned : fallback;
}

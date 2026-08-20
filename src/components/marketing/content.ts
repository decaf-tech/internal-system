/**
 * Yang tersisa di berkas ini adalah data situs publik yang TIDAK berubah
 * mengikuti bahasa: alamat kontak dan angka grafik.
 *
 * Seluruh kalimatnya pindah ke `copy-id.ts` / `copy-en.ts` sejak situs
 * ini punya dua bahasa — lihat `copy.ts` untuk bentuk dan alasannya.
 */

export const CONTACT = {
  whatsapp: "6282213291697",
  whatsappDisplay: "+62 822-1329-1697",
  email: "nafidzabiyyu@gmail.com",
  linkedin: "linkedin.com/in/nafidz-abiyyu-h-09660a15a",
  linkedinUrl: "https://www.linkedin.com/in/nafidz-abiyyu-h-09660a15a",
} as const;

/**
 * Tautan WhatsApp dengan pesan pembuka yang sudah terisi, supaya prospek
 * tidak menatap kolom kosong. Pesannya berbeda per bahasa, jadi ia datang
 * dari `copy.waMessage` — bukan dituliskan di sini.
 *
 * Sejak form discovery ada, tautan ini bukan lagi jalan masuk utama: ia
 * cuma cadangan untuk yang memang lebih suka mengetik langsung. Ajakan
 * pertama di setiap seksi memakai formnya — melempar pengunjung ke
 * aplikasi lain sebelum ia sempat menyebut kebutuhannya membuang separuh
 * dari mereka di ambang pintu.
 */
export function waLink(message: string) {
  return `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`;
}

/**
 * Dua kurva di grafik "menggeser kurva produktivitas".
 *
 * Nilainya sengaja tanpa satuan — sumbu X waktu/usaha, sumbu Y hasil. Ini
 * ilustrasi bentuk hubungan, bukan data terukur, dan grafiknya diberi label
 * yang mengatakan begitu supaya tidak terbaca sebagai klaim.
 */
export const CURVE = {
  manual: [0, 5, 10, 14, 18, 21, 24],
  empowered: [0, 18, 45, 68, 82, 91, 96],
} as const;

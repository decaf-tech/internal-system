import "server-only";

export type Holiday = { date: string; name: string };

type NagerHoliday = { date: string; localName: string };

/**
 * Hari libur nasional Indonesia dari date.nager.at — API publik, gratis,
 * tanpa key. Di-cache lewat data cache bawaan Next.js selama sehari:
 * daftarnya cuma berubah kalau pemerintah menambah/menggeser cuti bersama,
 * jadi tidak perlu tabel Supabase atau fetch di tiap render.
 *
 * Gagal fetch (API luar sedang down, dsb.) mengembalikan daftar kosong
 * alih-alih melempar error — kalender tetap tampil normal, cuma tanpa
 * penanda libur untuk tahun itu.
 */
export async function getIndonesianHolidays(year: number): Promise<Holiday[]> {
  try {
    const response = await fetch(
      `https://date.nager.at/api/v3/publicholidays/${year}/ID`,
      { next: { revalidate: 60 * 60 * 24 } },
    );

    if (!response.ok) return [];

    const data = (await response.json()) as NagerHoliday[];
    return data.map((item) => ({ date: item.date, name: item.localName }));
  } catch (error) {
    console.error("Gagal mengambil hari libur:", error);
    return [];
  }
}

/** Hari libur untuk beberapa tahun sekaligus, digabung jadi satu daftar. */
export async function getIndonesianHolidaysForYears(
  years: number[],
): Promise<Holiday[]> {
  const unique = Array.from(new Set(years));
  const lists = await Promise.all(unique.map(getIndonesianHolidays));
  return lists.flat();
}

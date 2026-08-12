import { formatRupiah, todayJakarta } from "@/lib/format";
import { PROSPECT_OPEN_STAGES } from "@/lib/types";
import type { createClient } from "@/lib/supabase/server";

export type ClientStats = {
  openProspects: number;
  pipelineValue: number;
  followUpsDue: number;
  activeClients: number;
  totalClients: number;
};

/**
 * Empat angka di kepala halaman klien — agregat murah dari dua tabel,
 * langsung menjawab "apa yang perlu diperhatikan sekarang" begitu halaman
 * dibuka (PRD v3.0 §2.4).
 *
 * Dipanggil dari dalam `Promise.all` milik masing-masing halaman, bukan
 * dibungkus komponen async sendiri: komponen anak yang mengambil datanya
 * sendiri baru mulai bekerja setelah induknya selesai menunggu, dan itu
 * persis bentuk waterfall yang baru saja dibereskan di halaman lain.
 */
export async function loadClientStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<ClientStats> {
  const today = todayJakarta();

  const [openResult, dueResult, clientsResult] = await Promise.all([
    // Nilainya ikut ditarik, bukan dihitung lewat agregat PostgREST:
    // dua angka pertama lahir dari satu query yang sama, dan jumlah baris
    // di tabel ini dihitung dalam ratusan, bukan ratusan ribu.
    supabase
      .from("prospects")
      .select("estimated_value")
      .in("stage", PROSPECT_OPEN_STAGES),
    supabase
      .from("prospects")
      .select("id", { count: "exact", head: true })
      .in("stage", PROSPECT_OPEN_STAGES)
      .lte("next_follow_up_date", today),
    supabase.from("clients").select("status"),
  ]);

  const open = openResult.data ?? [];
  const clients = clientsResult.data ?? [];

  return {
    openProspects: open.length,
    pipelineValue: open.reduce(
      (sum, row) => sum + Number(row.estimated_value ?? 0),
      0,
    ),
    followUpsDue: dueResult.count ?? 0,
    activeClients: clients.filter((row) => row.status === "active").length,
    totalClients: clients.length,
  };
}

/** Judul keempat kartu — dipakai juga oleh rangka loading-nya. */
export const CLIENT_STAT_LABELS = [
  "Prospek Aktif",
  "Nilai Pipeline",
  "Follow-up Jatuh Tempo",
  "Klien Aktif",
];

export function ClientStatStrip({ stats }: { stats: ClientStats }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Stat
        label={CLIENT_STAT_LABELS[0]}
        value={String(stats.openProspects)}
        tone="ink"
        hint="belum menang atau kalah"
      />
      <Stat
        label={CLIENT_STAT_LABELS[1]}
        value={formatRupiah(stats.pipelineValue)}
        tone="ink"
        hint="nilai yang masih berjalan"
      />
      <Stat
        label={CLIENT_STAT_LABELS[2]}
        value={String(stats.followUpsDue)}
        // Nol adalah kabar baik di kartu ini — mewarnainya merah berarti
        // satu-satunya keadaan yang tenang justru terlihat paling gawat.
        tone={stats.followUpsDue > 0 ? "danger" : "ink"}
        hint={
          stats.followUpsDue > 0
            ? "hari ini atau sudah lewat"
            : "tidak ada yang tertinggal"
        }
      />
      <Stat
        label={CLIENT_STAT_LABELS[3]}
        value={String(stats.activeClients)}
        tone="forest"
        hint={`dari ${stats.totalClients} klien`}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "forest" | "danger" | "ink";
}) {
  const color =
    tone === "forest"
      ? "text-forest"
      : tone === "danger"
        ? "text-danger"
        : "text-ink";

  return (
    <div className="card p-3 sm:p-4">
      <p className="eyebrow">{label}</p>
      <p className={`mt-1.5 font-serif text-lg tabular-nums sm:text-xl ${color}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-ink-subtle">{hint}</p>}
    </div>
  );
}

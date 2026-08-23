import { getInfraStatus, type Monitor, type ServiceState, type SystemMetric } from "@/lib/infra/status";

/**
 * Kesehatan server + peluncur alat infrastruktur.
 *
 * Angkanya ditarik di sisi server (lihat `lib/infra/status.ts`) dan
 * dirender pakai gaya Decaf sendiri — SENGAJA bukan iframe. Percobaan
 * pertama memakai iframe dan keempat layanan menolak dibingkai, masing-
 * masing dengan alasannya sendiri:
 *
 *   Portainer   → CSP `frame-ancestors 'none'` (tolak semua origin)
 *   Cockpit     → `X-Frame-Options: sameorigin` + HTTPS sertifikat sendiri
 *   Beszel      → `X-Frame-Options: sameorigin`
 *   Uptime Kuma → `X-Frame-Options: sameorigin`
 *
 * Di atas itu ada tembok kedua yang berdiri sendiri: backoffice disajikan
 * lewat HTTPS (decaf.id) sedangkan alat-alat ini HTTP polos, jadi browser
 * memblokirnya sebagai mixed content sebelum urusan header dibaca.
 *
 * Yang tersisa sebagai tautan cuma Portainer & Cockpit — dan itu memang
 * pas: keduanya alat untuk BERTINDAK (deploy, restart, buka terminal),
 * bukan untuk dilirik sekilas. Yang perlu dilirik sekilas justru sudah
 * pindah ke sini.
 */

// Alamat tailnet (100.84.62.81 = server-merah-supermicro), bukan IP LAN
// 192.168.0.114 — supaya tetap terjangkau dari luar kantor selama perangkat
// terhubung Tailscale. Komponen ini cuma dirender kalau is_super_admin
// (lihat page.tsx), jadi alamat internal aman ditulis di sini.
const HOST = "100.84.62.81";

const TOOLS = [
  {
    label: "Portainer",
    purpose: "Kelola container & stack — tempat deploy aplikasi ini.",
    url: `http://${HOST}:9000`,
    port: 9000,
    note: "Deploy lewat Stacks → Pull and redeploy.",
  },
  {
    label: "Cockpit",
    purpose: "Administrasi server: layanan, disk, jaringan, terminal.",
    // Cockpit mengalihkan :9090 ke HTTPS, jadi langsung tunjuk ke https —
    // kalau ditulis http, browser bolak-balik dulu lewat redirect.
    url: `https://${HOST}:9090`,
    port: 9090,
    note: "Sertifikatnya terbitan sendiri — browser memperingatkan sekali.",
  },
  {
    label: "Beszel",
    purpose: "Grafik lengkap CPU, RAM, disk, jaringan.",
    url: `http://${HOST}:8090`,
    port: 8090,
  },
  {
    label: "Uptime Kuma",
    purpose: "Riwayat uptime & pengaturan peringatan.",
    url: `http://${HOST}:3001`,
    port: 3001,
  },
];

export async function InfraPanel() {
  const status = await getInfraStatus();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card p-4">
        <h2 className="mb-1 text-base">Kesehatan Server</h2>
        <p className="mb-3 text-xs text-ink-subtle">Metrik langsung dari Beszel.</p>
        {status.beszel.state !== "ok" || status.beszel.systems.length === 0 ? (
          <ServiceNotice
            state={status.beszel.state}
            detail={status.beszel.detail}
            empty={status.beszel.systems.length === 0}
            envHint="BESZEL_EMAIL & BESZEL_PASSWORD"
          />
        ) : (
          <ul className="divide-y divide-line">
            {status.beszel.systems.map((system) => (
              <SystemRow key={system.name} system={system} />
            ))}
          </ul>
        )}
      </section>

      <section className="card p-4">
        <h2 className="mb-1 text-base">Pemantauan Layanan</h2>
        <p className="mb-3 text-xs text-ink-subtle">Status terkini dari Uptime Kuma.</p>
        {status.kuma.state !== "ok" || status.kuma.monitors.length === 0 ? (
          <ServiceNotice
            state={status.kuma.state}
            detail={status.kuma.detail}
            empty={status.kuma.monitors.length === 0}
            envHint="UPTIME_KUMA_API_KEY"
          />
        ) : (
          <ul className="divide-y divide-line">
            {status.kuma.monitors.map((monitor) => (
              <MonitorRow key={monitor.name} monitor={monitor} />
            ))}
          </ul>
        )}
      </section>

      <section className="card p-4 lg:col-span-2">
        <h2 className="mb-1 text-base">Buka Alatnya</h2>
        <p className="mb-3 text-xs text-ink-subtle">
          Semuanya lewat Tailscale — cuma terbuka kalau perangkat ini
          terhubung ke tailnet, tidak pernah dari internet publik. Terbuka di
          tab baru karena keempatnya menolak ditampilkan di dalam bingkai.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <li key={tool.label}>
              <a
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block h-full rounded-md border border-line p-3 transition-colors hover:border-accent hover:bg-surface-muted"
              >
                <p className="flex items-baseline gap-2 text-sm font-medium">
                  {tool.label}
                  <span className="font-mono text-[10px] text-ink-subtle">
                    :{tool.port}
                  </span>
                  <span className="ml-auto text-xs text-accent">↗</span>
                </p>
                <p className="mt-1 text-xs text-ink-muted">{tool.purpose}</p>
                {tool.note && (
                  <p className="mt-1 text-[11px] text-ink-subtle">{tool.note}</p>
                )}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/**
 * Beszel mengirim statusnya dalam bahasa Inggris ("up"/"down"/…). Diterjemahkan
 * di sini supaya sebaris dengan label monitor Uptime Kuma di kartu sebelah —
 * dua kartu bersebelahan yang satu bilang "up" dan satunya "Normal" terbaca
 * seperti dua sistem yang tak berhubungan. Status di luar daftar ini
 * ditampilkan apa adanya, bukan dipaksa jadi "tak dikenal": kalau Beszel
 * menambah status baru, nama aslinya lebih berguna daripada tebakan kami.
 */
const SYSTEM_STATUS_LABEL: Record<string, string> = {
  up: "Normal",
  down: "Tumbang",
  paused: "Dijeda",
  pending: "Menunggu",
};

function SystemRow({ system }: { system: SystemMetric }) {
  const up = system.status === "up";

  return (
    <li className="py-2.5">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={`h-2 w-2 shrink-0 rounded-full ${up ? "bg-forest" : "bg-danger"}`}
        />
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{system.name}</p>
        <span
          className={`badge ${up ? "bg-forest-soft text-forest" : "bg-danger-soft text-danger"}`}
        >
          {SYSTEM_STATUS_LABEL[system.status] ?? system.status}
        </span>
      </div>
      <dl className="mt-1.5 grid grid-cols-3 gap-2 pl-4">
        <Metric label="CPU" value={system.cpu} />
        <Metric label="RAM" value={system.memory} />
        <Metric label="Disk" value={system.disk} />
      </dl>
    </li>
  );
}

/**
 * Nilai yang tidak terbaca ditampilkan "—", bukan 0. Beszel menyingkat nama
 * fieldnya dan singkatannya berbeda antar versi; kalau yang hilang
 * dijadikan 0, hasilnya bukan "tidak tahu" melainkan kebohongan yang
 * meyakinkan — server yang RAM-nya penuh akan tampak santai.
 */
function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <dt className="font-mono text-[10px] tracking-wide text-ink-subtle uppercase">
        {label}
      </dt>
      <dd className="text-xs tabular-nums">
        {value === null ? (
          <span className="text-ink-subtle">—</span>
        ) : (
          <span className={value >= 90 ? "font-medium text-danger" : undefined}>
            {Math.round(value)}%
          </span>
        )}
      </dd>
    </div>
  );
}

const MONITOR_LABEL: Record<number, { text: string; className: string }> = {
  0: { text: "Tumbang", className: "bg-danger-soft text-danger" },
  1: { text: "Normal", className: "bg-forest-soft text-forest" },
  2: { text: "Menunggu", className: "bg-warn-soft text-warn" },
  3: { text: "Perawatan", className: "bg-accent-soft text-accent" },
};

function MonitorRow({ monitor }: { monitor: Monitor }) {
  const label = MONITOR_LABEL[monitor.status] ?? {
    text: "Tak dikenal",
    className: "bg-surface-muted text-ink-muted",
  };

  return (
    <li className="flex items-center gap-2 py-2.5">
      <p className="min-w-0 flex-1 truncate text-sm">{monitor.name}</p>
      {monitor.responseMs !== null && (
        <span className="font-mono text-[10px] text-ink-subtle tabular-nums">
          {Math.round(monitor.responseMs)} ms
        </span>
      )}
      <span className={`badge ${label.className}`}>{label.text}</span>
    </li>
  );
}

/**
 * Satu tempat untuk semua keadaan "tidak ada angka yang bisa ditampilkan".
 * Dibedakan dengan sengaja: "belum dikonfigurasi" adalah pekerjaan setup
 * yang tertinggal, sedangkan "tidak terjangkau" adalah sesuatu yang rusak —
 * dua hal yang butuh reaksi berbeda, jadi tidak pantas disamarkan jadi satu
 * pesan kosong yang sopan.
 */
function ServiceNotice({
  state,
  detail,
  empty,
  envHint,
}: {
  state: ServiceState;
  detail?: string;
  empty: boolean;
  envHint: string;
}) {
  if (state === "unconfigured") {
    return (
      <p className="text-xs text-ink-muted">
        Belum dikonfigurasi — isi{" "}
        <code className="font-mono text-[11px]">{envHint}</code> di
        Environment variables stack Portainer, lalu redeploy.
      </p>
    );
  }

  if (state === "ok" && empty) {
    return (
      <p className="text-xs text-ink-muted">
        Terhubung, tapi belum ada data yang dikembalikan. Cek apakah akunnya
        punya hak baca.
      </p>
    );
  }

  return (
    <div className="rounded-md bg-danger-soft p-2.5">
      <p className="text-xs font-medium text-danger">Tidak bisa dibaca</p>
      {detail && <p className="mt-0.5 text-[11px] text-danger">{detail}</p>}
    </div>
  );
}

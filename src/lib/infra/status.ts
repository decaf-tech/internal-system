import "server-only";

/**
 * Pembacaan kesehatan server dari Beszel & Uptime Kuma.
 *
 * Kenapa ditarik di sisi server dan bukan di-iframe: keempat alat
 * infrastruktur menolak dibingkai (Portainer `frame-ancestors 'none'`,
 * sisanya `X-Frame-Options: sameorigin`), dan backoffice disajikan lewat
 * HTTPS sedangkan alat-alatnya HTTP polos — jadi browser memblokirnya
 * sebagai mixed content sebelum urusan header terbaca. Dua tembok itu
 * hilang begitu yang menjemput datanya adalah proses server: ia berjalan di
 * mesin yang sama, bebas bicara HTTP ke tetangganya, dan yang sampai ke
 * browser cuma JSON hasil olahan.
 *
 * Seluruh isi berkas ini bersifat "boleh gagal". Panel status adalah
 * pelengkap di dashboard admin, bukan alasan halamannya ada — kalau Beszel
 * mati atau tokennya kedaluwarsa, yang muncul pesan tenang di kartunya,
 * bukan error yang menjatuhkan seluruh halaman.
 */

// Timeout pendek dan wajib. Salah satu endpoint Uptime Kuma terbukti bisa
// menggantung tanpa balasan (bukan menolak — benar-benar diam), dan tanpa
// batas waktu, satu layanan yang hang akan menahan render dashboard admin
// sampai gateway menyerah.
const TIMEOUT_MS = 4000;

// Alamat default menunjuk ke IP tailnet server. Sengaja bisa ditimpa lewat
// env: dari DALAM container, rute ke IP tailnet host tidak selalu terbuka
// (tergantung firewall & jaringan Docker). Kalau ternyata tertutup,
// gantinya cukup satu env var — `172.17.0.1` (gateway bridge) atau nama
// container tetangga — tanpa menyentuh kode ini.
//
// Dibaca lewat fungsi, dan pakai `||` bukan `??`: docker-compose mendaftarkan
// variabel opsional sebagai `${BESZEL_URL:-}`, yang sampai ke Node sebagai
// STRING KOSONG, bukan undefined. `??` akan meloloskan string kosong itu dan
// menghasilkan URL `/api/...` tanpa host.
const beszelUrl = () => process.env.BESZEL_URL || "http://100.84.62.81:8090";
const kumaUrl = () => process.env.UPTIME_KUMA_URL || "http://100.84.62.81:3001";

export type ServiceState = "ok" | "unconfigured" | "unreachable" | "unparsed";

export type SystemMetric = {
  name: string;
  /** "up" | "down" | "paused" | "pending" — apa adanya dari Beszel. */
  status: string;
  cpu: number | null;
  memory: number | null;
  disk: number | null;
};

export type Monitor = {
  name: string;
  /** 0 = down, 1 = up, 2 = pending, 3 = maintenance (konvensi Uptime Kuma). */
  status: number;
  responseMs: number | null;
};

export type InfraStatus = {
  beszel: { state: ServiceState; systems: SystemMetric[]; detail?: string };
  kuma: { state: ServiceState; monitors: Monitor[]; detail?: string };
};

function timeout() {
  return AbortSignal.timeout(TIMEOUT_MS);
}

/**
 * Beszel dibangun di atas PocketBase, yang tidak punya konsep API token —
 * `auth-methods` di instance ini menjawab `emailPassword: true` dan tidak
 * ada yang lain. Jadi satu-satunya jalan baca adalah menukar email+sandi
 * jadi JWT berumur pendek, sekali per pemanggilan.
 *
 * Pakai akun Beszel tersendiri yang cuma untuk ini — bukan akun admin yang
 * kamu pakai sehari-hari. Kalau env-nya bocor, yang ikut cuma hak baca
 * metrik, bukan kendali atas Beszel-nya.
 */
async function fetchBeszel(): Promise<InfraStatus["beszel"]> {
  const email = process.env.BESZEL_EMAIL;
  const password = process.env.BESZEL_PASSWORD;
  if (!email || !password) {
    return { state: "unconfigured", systems: [] };
  }

  try {
    const authResponse = await fetch(
      `${beszelUrl()}/api/collections/users/auth-with-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: email, password }),
        signal: timeout(),
        cache: "no-store",
      },
    );
    if (!authResponse.ok) {
      return {
        state: "unreachable",
        systems: [],
        detail: `Login Beszel ditolak (HTTP ${authResponse.status}).`,
      };
    }
    const { token } = (await authResponse.json()) as { token?: string };
    if (!token) {
      return { state: "unparsed", systems: [], detail: "Login tidak mengembalikan token." };
    }

    const listResponse = await fetch(
      `${beszelUrl()}/api/collections/systems/records?perPage=50&sort=name`,
      {
        headers: { Authorization: token },
        signal: timeout(),
        // Metrik server basi tidak ada gunanya; selalu ambil yang terbaru.
        cache: "no-store",
      },
    );
    if (!listResponse.ok) {
      return {
        state: "unreachable",
        systems: [],
        detail: `Daftar sistem gagal dibaca (HTTP ${listResponse.status}).`,
      };
    }

    const payload = (await listResponse.json()) as { items?: unknown[] };
    const items = Array.isArray(payload.items) ? payload.items : [];
    return { state: "ok", systems: items.map(toSystemMetric) };
  } catch (error) {
    return { state: "unreachable", systems: [], detail: describe(error) };
  }
}

/**
 * Bentuk objek `info` di Beszel berubah antar versi, dan nama fieldnya
 * disingkat (`cpu`, `mp` = memory percent, `dp` = disk percent). Karena itu
 * pembacaannya defensif: nama yang pendek maupun yang panjang sama-sama
 * diterima, dan yang tidak ketemu jadi `null` — ditampilkan sebagai "—"
 * alih-alih angka palsu 0 yang terbaca seperti "server ini idle".
 */
function toSystemMetric(raw: unknown): SystemMetric {
  const record = (raw ?? {}) as Record<string, unknown>;
  const info = (record.info ?? {}) as Record<string, unknown>;

  return {
    name: typeof record.name === "string" ? record.name : "(tanpa nama)",
    status: typeof record.status === "string" ? record.status : "unknown",
    cpu: numberFrom(info, ["cpu", "c"]),
    memory: numberFrom(info, ["mp", "memPct", "m"]),
    disk: numberFrom(info, ["dp", "diskPct", "d"]),
  };
}

function numberFrom(
  source: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

/**
 * Uptime Kuma tidak punya REST API untuk dashboard-nya — isinya dilayani
 * lewat socket.io, yang tidak masuk akal dipakai dari React Server
 * Component. Yang tersedia dan stabil adalah endpoint Prometheus
 * `/metrics`, diautentikasi lewat HTTP Basic dengan username kosong dan
 * API key sebagai sandi (API key dibuat di Profile → API Keys).
 */
async function fetchKuma(): Promise<InfraStatus["kuma"]> {
  const apiKey = process.env.UPTIME_KUMA_API_KEY;
  if (!apiKey) return { state: "unconfigured", monitors: [] };

  try {
    const response = await fetch(`${kumaUrl()}/metrics`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`:${apiKey}`).toString("base64")}`,
      },
      signal: timeout(),
      cache: "no-store",
    });
    if (!response.ok) {
      return {
        state: "unreachable",
        monitors: [],
        detail:
          response.status === 401
            ? "API key Uptime Kuma ditolak."
            : `Uptime Kuma balas HTTP ${response.status}.`,
      };
    }
    return { state: "ok", monitors: parsePrometheus(await response.text()) };
  } catch (error) {
    return { state: "unreachable", monitors: [], detail: describe(error) };
  }
}

/**
 * Format teks Prometheus, satu metrik per baris:
 *
 *   monitor_status{monitor_name="decaf.id",monitor_type="http",...} 1
 *   monitor_response_time{monitor_name="decaf.id",...} 214
 *
 * Cuma dua metrik itu yang dipakai, dan digabung berdasarkan
 * `monitor_name`. Sengaja tidak memakai pustaka parser Prometheus — yang
 * dibutuhkan hanya dua baris regex, dan satu dependensi lagi untuk itu
 * tidak sepadan.
 */
function parsePrometheus(body: string): Monitor[] {
  const byName = new Map<string, Monitor>();

  for (const line of body.split("\n")) {
    if (line.startsWith("#")) continue;

    const match = /^(monitor_status|monitor_response_time)\{(.*)\}\s+(.+)$/.exec(
      line.trim(),
    );
    if (!match) continue;

    const [, metric, labels, rawValue] = match;
    const name = /monitor_name="((?:[^"\\]|\\.)*)"/.exec(labels)?.[1];
    if (!name) continue;

    const value = Number(rawValue);
    if (!Number.isFinite(value)) continue;

    const entry = byName.get(name) ?? { name, status: 2, responseMs: null };
    if (metric === "monitor_status") entry.status = value;
    else entry.responseMs = value;
    byName.set(name, entry);
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    // AbortSignal.timeout melempar TimeoutError — bedakan dari "koneksi
    // ditolak", karena penanganannya beda: yang satu layanannya lambat/hang,
    // yang satu lagi alamatnya tidak terjangkau dari dalam container.
    if (error.name === "TimeoutError") return `Tidak menjawab dalam ${TIMEOUT_MS / 1000} detik.`;
    return error.message;
  }
  return "Gagal menghubungi layanan.";
}

/**
 * Kedua sumber dijemput berbarengan, dan `allSettled` memastikan yang satu
 * tidak menjatuhkan yang lain — Beszel mati bukan alasan daftar monitor
 * ikut hilang.
 */
export async function getInfraStatus(): Promise<InfraStatus> {
  const [beszel, kuma] = await Promise.allSettled([fetchBeszel(), fetchKuma()]);

  return {
    beszel:
      beszel.status === "fulfilled"
        ? beszel.value
        : { state: "unreachable", systems: [], detail: describe(beszel.reason) },
    kuma:
      kuma.status === "fulfilled"
        ? kuma.value
        : { state: "unreachable", monitors: [], detail: describe(kuma.reason) },
  };
}

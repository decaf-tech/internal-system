import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const EVENT_TYPES = new Set(["pageview", "click"]);
const LANGS = new Set(["id", "en"]);

// Bot yang mengeksekusi JavaScript (headless scraper, alat SEO, preview
// link) memanggil route ini persis seperti browser sungguhan — filter di
// header User-Agent inilah yang mencegah lalu lintas mereka mencemari
// angka pengunjung.
const BOT_UA = /bot|crawl|spider|slurp|headless|preview|facebookexternalhit/i;

const ORGANIC_HOSTS = ["google.", "bing.", "yahoo.", "duckduckgo.", "yandex.", "baidu."];
const SOCIAL_HOSTS = [
  "facebook.",
  "instagram.",
  "twitter.",
  "x.com",
  "t.co",
  "linkedin.",
  "tiktok.",
  "threads.net",
  "pinterest.",
];

function classifySource(
  referrerHost: string | null,
  ownHost: string | null,
  utmSource: string | null,
) {
  if (utmSource) return "campaign";
  if (!referrerHost || referrerHost === ownHost) return "direct";
  if (ORGANIC_HOSTS.some((host) => referrerHost.includes(host))) return "organic";
  if (SOCIAL_HOSTS.some((host) => referrerHost.includes(host))) return "social";
  return "referral";
}

/**
 * Dipanggil oleh `AnalyticsBeacon` di situs publik. Sengaja lewat route
 * handler, bukan insert langsung dari klien lewat SDK Supabase: header
 * `Referer` cuma bisa dibaca di sini, dan itu satu-satunya cara
 * mengklasifikasi sumber kunjungan (organik/sosial/referral) yang tidak
 * bisa dipalsukan semudah field di body request.
 */
export async function POST(request: Request) {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (BOT_UA.test(userAgent)) return NextResponse.json({ ok: true });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { session_id, event_type, path, lang, click_label, utm_source } = body;

  if (
    typeof session_id !== "string" ||
    session_id.length < 8 ||
    session_id.length > 64 ||
    typeof event_type !== "string" ||
    !EVENT_TYPES.has(event_type) ||
    typeof path !== "string" ||
    path.length < 1 ||
    typeof lang !== "string" ||
    !LANGS.has(lang)
  ) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const ownHost = request.headers.get("host");
  const referrerHeader = request.headers.get("referer");
  let referrerHost: string | null = null;
  if (referrerHeader) {
    try {
      referrerHost = new URL(referrerHeader).host;
    } catch {
      referrerHost = null;
    }
  }

  const utmSource = typeof utm_source === "string" && utm_source ? utm_source.slice(0, 60) : null;
  const source = classifySource(referrerHost, ownHost, utmSource);

  const supabase = await createClient();
  // Titipan analitik terbaik-usaha: gagal insert (mis. migration 015
  // belum dijalankan) tidak boleh membuat beacon di browser pengunjung
  // melempar error yang terlihat.
  await supabase.from("visitor_events").insert({
    session_id,
    event_type,
    path: path.slice(0, 200),
    lang,
    click_label: typeof click_label === "string" ? click_label.slice(0, 60) : null,
    source,
    referrer_host: referrerHost && referrerHost !== ownHost ? referrerHost : null,
    utm_source: utmSource,
  });

  return NextResponse.json({ ok: true });
}

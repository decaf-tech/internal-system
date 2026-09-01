import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/page-header";
import { formatDateTime, todayJakarta } from "@/lib/format";

// Batas baris yang diambil per rentang waktu. Situs ini belum berskala
// jutaan kunjungan — batas ini sekadar pagar supaya satu halaman tidak
// diam-diam menarik ratusan ribu baris kalau suatu hari trafiknya
// melonjak jauh dari perkiraan.
const ROW_LIMIT = 5000;
const LOG_LIMIT = 200;
const DAY_OPTIONS = [7, 30, 90] as const;
const DEFAULT_DAYS = 30;

const SOURCE_LABEL: Record<string, string> = {
  direct: "Langsung",
  organic: "Pencarian (SEO)",
  social: "Sosial media",
  referral: "Tautan lain",
  campaign: "Kampanye (UTM)",
};

const SOURCE_COLOR: Record<string, string> = {
  direct: "var(--color-ink-subtle)",
  organic: "var(--color-forest)",
  social: "var(--color-accent)",
  referral: "var(--color-danger)",
  campaign: "var(--color-accent)",
};

type VisitorEvent = {
  id: string;
  created_at: string;
  session_id: string;
  event_type: "pageview" | "click";
  path: string;
  lang: string;
  click_label: string | null;
  source: string;
  referrer_host: string | null;
};

export default async function AnalyticsPage({
  searchParams,
}: PageProps<"/backoffice/admin/analytics">) {
  const current = await getCurrentUser();
  // Sama pagarnya dengan dashboard Admin: bukan cuma disembunyikan dari
  // menu, ditolak juga kalau alamatnya diketik langsung.
  if (!current?.profile?.is_super_admin) redirect("/backoffice");

  const params = await searchParams;
  const rawDays = Number(params.days);
  const days = DAY_OPTIONS.includes(rawDays as (typeof DAY_OPTIONS)[number])
    ? rawDays
    : DEFAULT_DAYS;

  const today = todayJakarta();
  const cutoffDay = daysAgo(today, days - 1);
  const cutoffIso = `${cutoffDay}T00:00:00+07:00`;

  const supabase = await createClient();
  const [eventsResult, discoveryResult] = await Promise.all([
    supabase
      .from("visitor_events")
      .select("id, created_at, session_id, event_type, path, lang, click_label, source, referrer_host")
      .gte("created_at", cutoffIso)
      .order("created_at", { ascending: false })
      .limit(ROW_LIMIT),
    supabase
      .from("discovery_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", cutoffIso),
  ]);

  // Kalau migration 015 belum dijalankan di database, tabelnya belum ada
  // — bukan alasan seluruh halaman Admin ikut pecah, jadi ditampilkan
  // sebagai keadaan kosong dengan pesan yang jelas.
  if (eventsResult.error) {
    return (
      <>
        <PageHeader
          eyebrow="Super Admin"
          title="Analitik Pengunjung"
          description="Data kunjungan situs publik (decaf.id) — dari mana orang datang dan apa yang mereka klik."
        />
        <EmptyState
          title="Tabel analitik belum ada"
          description={`Migration 015_analitik_pengunjung.sql belum dijalankan di database. (${eventsResult.error.message})`}
        />
      </>
    );
  }

  const events = (eventsResult.data ?? []) as VisitorEvent[];
  const pageviews = events.filter((event) => event.event_type === "pageview");
  const clicks = events.filter((event) => event.event_type === "click");
  const discoverySubmissions = discoveryResult.count ?? 0;

  const uniqueSessions = new Set(pageviews.map((event) => event.session_id)).size;

  const dailySeries = buildDailySeries(pageviews, cutoffDay, today);
  const peak = Math.max(1, ...dailySeries.map((day) => day.count));

  const sourceBreakdown = countBy(pageviews, (event) => event.source).sort(
    (a, b) => b.count - a.count,
  );

  const topReferrers = countBy(
    pageviews.filter((event) => event.referrer_host),
    (event) => event.referrer_host as string,
  )
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const topPages = countBy(pageviews, (event) => event.path)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const clickBreakdown = countBy(clicks, (event) => event.click_label ?? "(tanpa label)").sort(
    (a, b) => b.count - a.count,
  );

  return (
    <>
      <PageHeader
        eyebrow="Super Admin"
        title="Analitik Pengunjung"
        description="Data kunjungan situs publik (decaf.id) — dari mana orang datang dan apa yang mereka klik. Cuma kamu yang bisa lihat halaman ini."
        action={
          <div className="flex gap-1.5 font-mono text-xs">
            {DAY_OPTIONS.map((option) => (
              <Link
                key={option}
                href={`/backoffice/admin/analytics?days=${option}`}
                className={`rounded-md px-2.5 py-1.5 ${
                  option === days
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                }`}
              >
                {option} hari
              </Link>
            ))}
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total Pageview" value={pageviews.length.toLocaleString("id-ID")} />
        <Stat label="Kunjungan (sesi unik)" value={uniqueSessions.toLocaleString("id-ID")} />
        <Stat label="Klik CTA" value={clicks.length.toLocaleString("id-ID")} />
        <Stat
          label="Form Discovery Terkirim"
          value={discoverySubmissions.toLocaleString("id-ID")}
        />
      </div>

      <section className="card mb-5 p-4">
        <h2 className="mb-4 text-base">
          Tren Pageview · {days} Hari Terakhir
        </h2>

        {pageviews.length === 0 ? (
          <EmptyState
            title="Belum ada kunjungan tercatat"
            description="Beacon di situs publik baru mulai mencatat sejak migration 015 dijalankan. Coba buka decaf.id, lalu muat ulang halaman ini."
          />
        ) : (
          <div className="flex h-32 items-end gap-0.5 overflow-x-auto sm:gap-1">
            {dailySeries.map((day) => (
              <div
                key={day.date}
                role="img"
                aria-label={`${day.date}: ${day.count} pageview`}
                title={`${day.date}: ${day.count} pageview`}
                className="flex h-full min-w-[3px] flex-1 items-end"
              >
                <div
                  style={{
                    height: day.count === 0 ? "2px" : `${Math.max(4, (day.count / peak) * 100)}%`,
                    backgroundColor:
                      day.count === 0 ? "var(--color-line-strong)" : "var(--color-accent)",
                  }}
                  className="w-full rounded-t-sm"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-3 text-base">Dari Mana Pengunjung Datang</h2>
          {sourceBreakdown.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-subtle">Belum ada data.</p>
          ) : (
            <ul className="space-y-2.5">
              {sourceBreakdown.map((row) => {
                const percent = pageviews.length > 0 ? (row.count / pageviews.length) * 100 : 0;
                return (
                  <li key={row.key}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span>{SOURCE_LABEL[row.key] ?? row.key}</span>
                      <span className="font-mono text-ink-muted">
                        {row.count} · {percent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: SOURCE_COLOR[row.key] ?? "var(--color-ink-subtle)",
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {topReferrers.length > 0 && (
            <div className="mt-4 border-t border-line pt-3">
              <p className="mb-2 text-xs text-ink-subtle">Domain rujukan teratas</p>
              <ul className="divide-y divide-line">
                {topReferrers.map((row) => (
                  <li
                    key={row.key}
                    className="flex items-center justify-between py-1.5 text-xs"
                  >
                    <span className="truncate font-mono">{row.key}</span>
                    <span className="text-ink-muted">{row.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-base">Halaman & Klik Terpopuler</h2>
          <p className="mb-2 text-xs text-ink-subtle">Halaman paling banyak dibuka</p>
          {topPages.length === 0 ? (
            <p className="py-2 text-center text-sm text-ink-subtle">Belum ada data.</p>
          ) : (
            <ul className="mb-4 divide-y divide-line">
              {topPages.map((row) => (
                <li key={row.key} className="flex items-center justify-between py-1.5 text-xs">
                  <span className="truncate font-mono">{row.key}</span>
                  <span className="text-ink-muted">{row.count}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="mb-2 border-t border-line pt-3 text-xs text-ink-subtle">
            Yang paling banyak diklik
          </p>
          {clickBreakdown.length === 0 ? (
            <p className="py-2 text-center text-sm text-ink-subtle">Belum ada klik tercatat.</p>
          ) : (
            <ul className="divide-y divide-line">
              {clickBreakdown.map((row) => (
                <li key={row.key} className="flex items-center justify-between py-1.5 text-xs">
                  <span className="truncate font-mono">{row.key}</span>
                  <span className="text-ink-muted">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* `<details>` bawaan, bukan state React: log mentah ini yang paling
          jarang dibuka di halaman ini, jadi tidak butuh JavaScript untuk
          bisa dilipat — juga tetap bisa dibuka kalau JS gagal dimuat. */}
      <details className="card p-4">
        <summary className="cursor-pointer text-base select-none">
          Log Kunjungan Terbaru ({Math.min(events.length, LOG_LIMIT)})
        </summary>

        {events.length === 0 ? (
          <p className="mt-3 py-4 text-center text-sm text-ink-subtle">Belum ada kejadian tercatat.</p>
        ) : (
          <ul className="mt-3 max-h-[28rem] divide-y divide-line overflow-y-auto">
            {events.slice(0, LOG_LIMIT).map((event) => (
              <li key={event.id} className="py-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                  <span className="font-mono">
                    {event.event_type === "pageview"
                      ? event.path
                      : `klik · ${event.click_label ?? "(tanpa label)"}`}
                  </span>
                  <span className="font-mono text-[10px] text-ink-subtle">
                    {formatDateTime(event.created_at)}
                  </span>
                </div>
                <p className="mt-0.5 text-ink-subtle">
                  {SOURCE_LABEL[event.source] ?? event.source}
                  {event.referrer_host ? ` · ${event.referrer_host}` : ""} ·{" "}
                  {event.lang.toUpperCase()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </details>
    </>
  );
}

/** "2026-08-12" — `n` hari sebelum tanggal `base` (bentuk yyyy-MM-dd yang sama). */
function daysAgo(base: string, n: number): string {
  const date = new Date(`${base}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - n);
  return date.toISOString().slice(0, 10);
}

/**
 * Deret hari yang selalu utuh dari `from` sampai `to` — hari tanpa
 * kunjungan tetap muncul sebagai batang kosong, bukan celah yang membuat
 * dua hari jauh terlihat berdampingan. Sama alasannya dengan `lastMonths`
 * di halaman Keuangan.
 */
function buildDailySeries(pageviews: VisitorEvent[], from: string, to: string) {
  const counts = new Map<string, number>();
  for (const event of pageviews) {
    const day = jakartaDay(event.created_at);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  const result: { date: string; count: number }[] = [];
  let cursor = from;
  while (cursor <= to) {
    result.push({ date: cursor, count: counts.get(cursor) ?? 0 });
    cursor = daysAgo(cursor, -1);
  }
  return result;
}

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "2026-08-12" dalam jam dinding Jakarta — locale en-CA kebetulan memformat
 * persis urutan yyyy-mm-dd yang dipakai kolom tanggal di database. */
function jakartaDay(value: string): string {
  return dayFormatter.format(new Date(value));
}

function countBy<T>(rows: T[], key: (row: T) => string) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const k = key(row);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].map(([key, count]) => ({ key, count }));
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3 sm:p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-1.5 font-display text-lg tabular-nums sm:text-xl">{value}</p>
    </div>
  );
}

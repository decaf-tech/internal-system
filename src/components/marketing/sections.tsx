import { LogoMark } from "@/components/brand";
import { waLink } from "./content";
import { COPY, discoveryProps, type Lang, type Outcome } from "./copy";
import { DiscoveryButton } from "./discovery";
import { Container, Eyebrow, Lede, Section, SectionTitle } from "./shell";

/**
 * Semua seksi menerima `lang` dan mengambil teksnya sendiri dari `COPY`.
 *
 * Alternatifnya — meneruskan objek `copy` dari halaman ke tiap seksi —
 * mengubah tiap seksi jadi ikut memikul tipe seluruh situs di tanda
 * tangannya. Yang dipakai di sini cuma satu kata (`"id"` / `"en"`), dan
 * seksinya yang tahu cabang mana yang ia butuhkan.
 */

/* ================================================================== */
/* Hero                                                                */
/* ================================================================== */

/**
 * Layar pembuka — sengaja kosong.
 *
 * Satu wordmark, satu slogan, satu isyarat gulir. Tidak ada CTA, tidak ada
 * angka: itu semua datang satu gulir setelahnya, di `HeroBody`. Baris
 * pertama yang dibaca pengunjung menentukan bagaimana ia membaca sisa
 * halaman — dan yang paling lugas untuk dikatakan duluan adalah nama dan
 * prinsip kerjanya, bukan proposisi nilai.
 */
function HeroSplash({ lang }: { lang: Lang }) {
  const copy = COPY[lang].hero;

  return (
    // `splash` memasang view-timeline bernama --splash (globals.css);
    // seluruh gerakan di layar ini berpatokan pada seksi INI keluar dari
    // layar, bukan pada posisi masing-masing elemen di dalamnya.
    <section className="splash relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden border-b border-line bg-canvas px-6 text-center">
      {/* Dua bulatan kabur ini bergerak lebih lambat dari halaman saat
          digulir — satu-satunya parallax di situs, dan hanya karena
          keduanya memang bukan isi: tidak ada yang harus dibaca di
          dalamnya, jadi tidak ada yang terganggu kalau ia bergeser. */}
      <div
        aria-hidden
        className="splash-drift-far pointer-events-none absolute -top-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-accent-soft blur-3xl"
      />
      <div
        aria-hidden
        className="splash-drift-near pointer-events-none absolute -bottom-40 -left-24 h-[24rem] w-[24rem] rounded-full bg-accent-soft/60 blur-3xl"
      />

      {/* Dibungkus jadi satu supaya larutnya juga satu gerakan. Kalau
          tiap baris diberi animasinya sendiri, eyebrow akan menghilang
          duluan dan namanya menyusul — layar pembuka yang berantakan
          persis di saat ditinggalkan. */}
      <div className="splash-exit flex flex-col items-center">
        <p className="eyebrow text-accent">{copy.splashEyebrow}</p>
        {/* Layar pembuka adalah satu-satunya tempat di seluruh situs yang
            punya ruang untuk menampilkan lambangnya besar-besar, dan
            satu-satunya tempat yang tugasnya memang memperkenalkan nama.
            Di tempat lain lambangnya seukuran baris nav. */}
        <LogoMark className="mt-8 h-24 sm:h-32 lg:h-40" priority />
        <p className="wordmark mt-6 text-5xl text-ink sm:text-7xl lg:text-8xl">
          Decaf Tech
        </p>
        {/* Tagline brand — tidak diterjemahkan, sama seperti nama. Sama
            persis dengan yang muncul di bawah wordmark bilah nav
            (`LogoLockup` tagline di brand.tsx) dan di `logo-full-inverse.png`. */}
        <p
          lang="en"
          className="mt-6 font-mono text-xs tracking-[0.3em] text-ink-muted uppercase sm:text-sm"
        >
          Empowering Technologies
        </p>
      </div>

      <div className="scroll-cue absolute bottom-10 flex flex-col items-center gap-2 text-ink-subtle">
        <span className="font-mono text-[10px] tracking-[0.3em] uppercase">
          {copy.scroll}
        </span>
        {/* Garis dengan titik yang menyusurinya ke bawah — isyarat arah,
            bukan sekadar garis. Lihat .scroll-cue-track di globals.css
            untuk alasan kenapa yang satu ini berbasis waktu. */}
        <span aria-hidden className="scroll-cue-track h-10 w-px" />
      </div>
    </section>
  );
}

function HeroBody({ lang }: { lang: Lang }) {
  const copy = COPY[lang].hero;

  return (
    <section className="relative overflow-hidden border-b border-line bg-canvas">
      <Container className="relative py-20 sm:py-28 lg:py-36">
        {/* Satu `reveal` untuk seluruh blok ajakan, bukan satu per baris:
            ini kalimat pembuka situs, dan kalimat pembuka tidak boleh
            datang sepotong-sepotong. Angka di bawahnya yang dapat
            perlakuan berbeda. */}
        <div className="reveal">
          <p className="eyebrow">{copy.eyebrow}</p>

          <h1 className="display mt-5 text-[2.5rem] leading-[1.05] sm:text-6xl lg:text-7xl">
            {copy.title.line1}
            <br />
            {copy.title.line2}
            <span className="text-accent">{copy.title.accent}</span>
          </h1>

          <p className="mt-7 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
            {copy.lede.before}
            <strong className="font-semibold text-ink">
              {copy.lede.strong}
            </strong>
            {copy.lede.after}
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <DiscoveryButton {...discoveryProps(lang)} />
            <a href="#portfolio" className="btn btn-ghost px-5">
              {copy.ctaSecondary}
            </a>
          </div>
        </div>

        {/* Empat angka yang sama yang dipakai di seluruh halaman. Ditaruh di
            atas lipatan karena inilah yang membedakan halaman ini dari
            halaman jasa mana pun: klaimnya bisa dihitung. */}
        {/* `stagger` memberi keempatnya jeda gulir yang berbeda-beda, jadi
            angkanya menetas berurutan alih-alih menyala serentak seperti
            papan skor. */}
        <dl className="stagger mt-14 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-7 border-t border-line pt-8 sm:grid-cols-4">
          {copy.stats.map((stat) => (
            <div key={stat.label} className="reveal-pop">
              <dt className="display text-2xl text-accent sm:text-3xl">
                {stat.value}
              </dt>
              <dd className="mt-1.5 text-xs leading-snug text-ink-muted">
                {stat.label}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}

export function Hero({ lang }: { lang: Lang }) {
  return (
    <>
      <HeroSplash lang={lang} />
      <HeroBody lang={lang} />
    </>
  );
}

/* ================================================================== */
/* 01 · Filosofi                                                       */
/* ================================================================== */

export function Philosophy({ lang }: { lang: Lang }) {
  const copy = COPY[lang].philosophy;

  return (
    <Section id="filosofi" tone="canvas">
      <Eyebrow>{copy.eyebrow}</Eyebrow>
      <SectionTitle>{copy.title}</SectionTitle>

      <div className="mt-10 max-w-2xl">
        <p className="text-[0.9375rem] leading-relaxed text-ink-muted sm:text-base">
          {copy.body[0]}
        </p>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted sm:text-base">
          {copy.body[1]}
        </p>
      </div>

      <div className="stagger mt-8 grid gap-5 md:grid-cols-2">
        <div className="reveal rounded-lg bg-accent p-5 text-ink-inverse sm:p-6">
          <p className="display text-xl">{copy.empowering.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-white/85">
            {copy.empowering.body}
          </p>
        </div>

        <div className="reveal rounded-lg border border-line-strong bg-surface-muted p-5 sm:p-6">
          <p className="display text-xl">{copy.craft.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {copy.craft.body}
          </p>
        </div>
      </div>
    </Section>
  );
}

/* ================================================================== */
/* 02 · Layanan                                                        */
/* ================================================================== */

/**
 * Dua layanan, ditumpuk — bukan disandingkan.
 *
 * Sebelumnya keduanya berdiri berdampingan di kisi dua kolom, dan itu
 * membuat pengunjung membacanya sebagai menu: dua kotak yang harus
 * dibanding-bandingkan dalam satu pandangan, masing-masing terpotong
 * setengah lebar layar. Sekarang tiap kartu memakai lebar penuh dan
 * `position: sticky`: kartu pertama berhenti di bawah bilah nav dan
 * bertahan di sana sementara kartu berikutnya naik menimpanya. Yang
 * dibaca jadi satu layanan pada satu waktu, dengan ruang cukup untuk
 * menaruh isinya di dua kolom sendiri.
 *
 * Mekanismenya CSS murni — `top` bertingkat per kartu (tiap kartu
 * berhenti 1,25rem lebih rendah dari kartu sebelumnya, menyisakan bibir
 * tipis kartu di baliknya) plus `z-index` menaik supaya yang datang
 * belakangan menutupi. Tidak ada observer, tidak ada state; sama
 * anggarannya dengan `.reveal` di globals.css.
 *
 * Baru menempel dari `md` ke atas. Kartu yang lebih tinggi dari viewport
 * tidak bisa ditempelkan tanpa memotong bagian bawahnya — di layar
 * sempit isinya menumpuk vertikal dan tingginya melewati batas itu, jadi
 * di sana kartunya kembali jadi tumpukan biasa.
 *
 * Kartu di sini sengaja TIDAK memakai `.reveal` seperti kartu di seksi
 * lain: reveal menggeser elemen lewat `transform` sepanjang gulir, dan
 * pergeseran itu berlaku di atas posisi yang sudah ditahan `sticky` —
 * kartu yang seharusnya diam justru bergetar naik-turun mengikuti gulir.
 */
export function Services({ lang }: { lang: Lang }) {
  const copy = COPY[lang].services;

  return (
    <Section id="layanan" tone="night" className="py-16 sm:py-20">
      <Eyebrow tone="light">{copy.eyebrow}</Eyebrow>
      <SectionTitle>{copy.title}</SectionTitle>
      <Lede tone="light">{copy.lede}</Lede>

      {/* Tinggi tumpukan = jumlah tinggi kartu; itu yang memberi gulir
          ruang untuk memindahkan kartu berikutnya ke atas kartu yang
          sedang menempel. Karena itu jaraknya `mb-*` di kartu, bukan
          `gap` di sini. */}
      <div className="relative mt-8">
        {copy.tracks.map((track, index) => (
          <article
            key={track.title}
            style={{
              top: `calc(4.5rem + ${index * 1}rem)`,
              zIndex: index + 1,
            }}
            // min-h: kartu setinggi isinya, dijaga cukup tinggi supaya
            // tumpukannya masih terbaca sebelum tertimpa kartu berikutnya.
            className={`relative mb-4 flex flex-col justify-center overflow-hidden rounded-xl p-5 sm:p-7 md:sticky md:min-h-[18rem] lg:p-9 ${
              track.tone === "night"
                ? "bg-night-soft ring-1 ring-white/10"
                : "bg-forest ring-1 ring-white/10"
            }`}
          >
            {/* Nomor raksasa di latar — penanda urutan yang tetap terbaca
                sebagai tekstur, bukan sebagai teks. Disembunyikan dari
                pembaca layar; urutannya sudah ada di eyebrow. */}
            <span
              aria-hidden
              className="display pointer-events-none absolute -right-3 -bottom-8 text-[7rem] leading-none text-white/[0.05] select-none sm:-right-4 sm:text-[10rem]"
            >
              0{index + 1}
            </span>

            <div className="relative grid gap-6 lg:grid-cols-[minmax(0,18rem)_1fr] lg:gap-10">
              <div>
                <p
                  className={`eyebrow ${
                    track.tone === "night"
                      ? "text-accent-bright"
                      : "text-forest-soft"
                  }`}
                >
                  {track.eyebrow}
                </p>
                <h3 className="display mt-2 text-2xl text-ink-inverse sm:text-3xl">
                  {track.title}
                </h3>
                <p className="mt-1.5 text-sm text-ink-inverse-muted italic">
                  {track.subtitle}
                </p>

                <DiscoveryButton
                  {...discoveryProps(lang)}
                  className="btn mt-5 border-white/20 px-5 text-ink-inverse hover:bg-white/10"
                >
                  {copy.cta}
                </DiscoveryButton>
              </div>

              <div className="border-t border-white/12 pt-5 lg:border-t-0 lg:border-l lg:border-white/12 lg:pt-0 lg:pl-10">
                <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {track.rows.map((row) => (
                    <div key={row.label}>
                      <dt className="text-xs font-medium tracking-wide text-ink-inverse-muted uppercase">
                        {row.label}
                      </dt>
                      <dd className="mt-1 text-sm leading-snug text-ink-inverse">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                {/* Skema investasi — dulu seksi "06 · Investasi" berdiri
                    sendiri, sekarang jadi bagian kartu ini. */}
                <div className="mt-5 border-t border-white/12 pt-5">
                  <p className="text-xs font-medium tracking-wide text-ink-inverse-muted uppercase">
                    {copy.investmentLabel}
                  </p>
                  <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
                    {track.investment.map((point) => (
                      <li
                        key={point}
                        className="flex gap-2 text-sm leading-snug text-ink-inverse"
                      >
                        <span
                          aria-hidden
                          className={
                            track.tone === "night"
                              ? "text-accent-bright"
                              : "text-forest-soft"
                          }
                        >
                          ✓
                        </span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* ================================================================== */
/* Hasil per jalur                                                     */
/* ================================================================== */

function OutcomeGrid({
  items,
  accent,
}: {
  items: Outcome[];
  accent: "accent" | "forest";
}) {
  return (
    <div className="stagger grid gap-5 md:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.title}
          className="reveal card flex flex-col p-6 sm:p-7"
          // Garis warna di tepi atas — penanda jalur, meniru kartu di deck.
          style={{
            borderTop: `3px solid var(--color-${accent})`,
          }}
        >
          <p
            className={`display text-3xl sm:text-4xl ${
              accent === "accent" ? "text-accent" : "text-forest"
            }`}
          >
            {item.metric}
          </p>
          <p className="mt-2 text-xs text-ink-subtle italic">{item.caption}</p>
          <h3 className="mt-4 font-sans text-base font-semibold">
            {item.title}
          </h3>
          <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">
            {item.body}
          </p>
        </article>
      ))}
    </div>
  );
}

export function Outcomes({ lang }: { lang: Lang }) {
  const copy = COPY[lang].outcomes;

  return (
    <Section tone="muted">
      <Eyebrow>{copy.kitchen.eyebrow}</Eyebrow>
      <SectionTitle>{copy.kitchen.title}</SectionTitle>
      <div className="mt-10">
        <OutcomeGrid items={copy.kitchen.items} accent="accent" />
      </div>

      <div className="mt-20">
        <Eyebrow>{copy.storefront.eyebrow}</Eyebrow>
        <SectionTitle>{copy.storefront.title}</SectionTitle>
        <div className="mt-10">
          <OutcomeGrid items={copy.storefront.items} accent="forest" />
        </div>
      </div>
    </Section>
  );
}

/* ================================================================== */
/* 03 · Portfolio                                                      */
/* ================================================================== */

export function Proof({ lang }: { lang: Lang }) {
  const copy = COPY[lang].proof;

  return (
    <Section id="portfolio" tone="night">
      <Eyebrow tone="light">{copy.eyebrow}</Eyebrow>
      <SectionTitle>{copy.title}</SectionTitle>
      <Lede tone="light">{copy.lede}</Lede>

      <div className="stagger mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {copy.cases.map((item) => (
          <article
            key={item.no}
            className="reveal flex flex-col rounded-lg bg-night-soft p-6 ring-1 ring-white/10"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="display text-2xl text-ink-inverse-muted">
                {item.no}
              </span>
              <span
                className={`eyebrow ${
                  item.track === "kitchen"
                    ? "text-accent-bright"
                    : "text-forest-soft"
                }`}
              >
                {copy.trackLabel[item.track]}
              </span>
            </div>

            <h3 className="mt-3 font-sans text-lg leading-snug font-semibold text-ink-inverse">
              {item.name}
            </h3>
            <p className="mt-1 text-sm text-accent-bright">{item.kind}</p>
            {item.url && (
              <a
                href={`https://${item.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block w-fit font-mono text-xs text-forest-soft underline underline-offset-2 hover:text-ink-inverse"
              >
                {item.url} ↗
              </a>
            )}
            <p className="mt-3 font-mono text-[0.6875rem] leading-relaxed text-ink-inverse-muted">
              {item.meta}
            </p>

            <p className="mt-4 border-l-2 border-white/15 pl-3 text-xs leading-relaxed text-ink-inverse-muted italic">
              {item.before}
            </p>

            <dl className="mt-5 space-y-2.5 border-t border-white/12 pt-5">
              {item.stats.map((stat) => (
                <div key={stat.label} className="flex items-baseline gap-3">
                  <dt className="display shrink-0 text-base text-accent-bright">
                    {stat.value}
                  </dt>
                  <dd className="text-xs leading-snug text-ink-inverse-muted">
                    {stat.label}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* ================================================================== */
/* 04 · Proposisi nilai                                                */
/* ================================================================== */

export function ValueDoctrine({ lang }: { lang: Lang }) {
  const copy = COPY[lang].value;

  return (
    <Section tone="canvas">
      <Eyebrow>{copy.eyebrow}</Eyebrow>
      <SectionTitle>{copy.title}</SectionTitle>

      <blockquote className="reveal reveal-late mt-8 max-w-3xl border-l-2 border-accent pl-5 sm:pl-6">
        {/* Miring saja, tanpa berpindah keluarga huruf: sejak Lora
            dilepas, satu-satunya serif yang tersisa adalah serif bawaan
            sistem — dan Georgia yang nyempil di antara Sora dan Jakarta
            terbaca seperti kutipan yang tertempel dari dokumen lain. */}
        <p className="text-lg leading-relaxed italic sm:text-xl">
          &ldquo;{copy.quote}&rdquo;
        </p>
      </blockquote>

      {/* Pagar §4 brand doc, ditulis eksplisit di halaman. Tanpa kalimat
          ini, tiga kartu di bawahnya gampang terbaca sebagai isyarat bahwa
          harganya bisa ditawar — persis kebalikan maksudnya. */}
      <p className="mt-6 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-muted">
        {copy.note.before}
        <strong className="font-semibold text-ink">{copy.note.strong}</strong>
        {copy.note.after}
      </p>

      <div className="stagger mt-10 grid gap-5 md:grid-cols-3">
        {copy.items.map((item) => (
          <article key={item.no} className="reveal card p-6">
            <span className="display inline-flex h-10 w-10 items-center justify-center rounded bg-accent text-sm text-white">
              {item.no}
            </span>
            <h3 className="mt-4 font-sans text-lg font-semibold">
              {item.title}
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">
              {item.body}
            </p>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* ================================================================== */
/* 05 · Proses                                                         */
/* ================================================================== */

export function Process({ lang }: { lang: Lang }) {
  const copy = COPY[lang].process;

  return (
    <Section id="proses" tone="muted">
      <Eyebrow>{copy.eyebrow}</Eyebrow>
      <SectionTitle>{copy.title}</SectionTitle>
      <Lede>{copy.lede}</Lede>

      <ol className="stagger mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {copy.steps.map((step) => (
          <li key={step.no} className="reveal card flex flex-col p-5">
            <span className="display inline-flex h-9 w-9 items-center justify-center rounded bg-accent text-sm text-white">
              {step.no}
            </span>
            <h3 className="mt-4 font-sans text-base leading-snug font-semibold">
              {step.title}
            </h3>
            <p className="mt-3 text-xs leading-relaxed text-ink-muted">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* ================================================================== */
/* Tentang                                                             */
/* ================================================================== */

/**
 * Rekam jejak, bukan profil.
 *
 * Yang dulu berdiri di sini adalah kartu nama: nama lengkap, jabatan,
 * tautan portofolio pribadi. Sekarang yang tampil hasilnya saja — lihat
 * komentar `about` di copy-id.ts untuk alasannya. Karena itu pula
 * angka-angkanya naik dari kolom samping jadi kisi utama: mereka bukan
 * lagi lampiran dari sebuah profil, mereka isi seksinya.
 */
export function About({ lang }: { lang: Lang }) {
  const copy = COPY[lang].about;

  return (
    <Section tone="canvas" className="py-16 sm:py-20">
      <Eyebrow>{copy.eyebrow}</Eyebrow>
      <SectionTitle>{copy.title}</SectionTitle>
      <p className="mt-2 font-mono text-xs tracking-wide text-ink-subtle uppercase">
        {copy.location}
      </p>

      <div className="mt-6 max-w-2xl space-y-3">
        {copy.body.map((paragraph) => (
          <p
            key={paragraph}
            className="text-[0.9375rem] leading-relaxed text-ink-muted sm:text-base"
          >
            {paragraph}
          </p>
        ))}
      </div>

      {/* Deret angka rapat, bukan kisi tiga baris — pola "impact snapshot"
          yang sama dipakai di abiyyuhanief.id/#the-journey: satu baris
          padat di layar lebar, dibaca sebagai satu rekam jejak. */}
      <dl className="stagger mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-line pt-6 sm:grid-cols-3 lg:grid-cols-5">
        {copy.facts.map((fact) => (
          // `reveal-pop`, bukan `reveal`: sama seperti statistik hero,
          // ini angka — dan angka yang menetas terbaca sebagai capaian.
          <div key={fact.label} className="reveal-pop">
            <dt className="display text-2xl text-forest sm:text-3xl">
              {fact.value}
            </dt>
            <dd className="mt-1.5 text-xs leading-snug text-ink-muted">
              {fact.label}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

/* ================================================================== */
/* Kontak                                                              */
/* ================================================================== */

/**
 * Seksi penutup — sekarang murni satu ajakan.
 *
 * Sebelumnya ia berisi empat kartu kanal kontak dan dua tautan silang ke
 * seksi pendekatan. Enam pilihan di layar terakhir berarti enam
 * kesempatan untuk ragu; yang terjadi bukan pengunjung memilih dengan
 * lebih baik, melainkan tidak memilih sama sekali. Sekarang tinggal satu
 * tombol besar dan satu jalur cadangan untuk yang memang lebih suka
 * mengetik langsung.
 */
export function Contact({ lang }: { lang: Lang }) {
  const copy = COPY[lang].contact;

  return (
    <Section id="kontak" tone="night">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow tone="light">{copy.eyebrow}</Eyebrow>
        <SectionTitle className="text-4xl sm:text-5xl">
          {copy.title}
        </SectionTitle>
        <p className="reveal reveal-late mt-5 text-base leading-relaxed text-ink-inverse-muted">
          {copy.lede}
        </p>

        <div className="reveal reveal-late mt-9 flex flex-wrap justify-center gap-3">
          <DiscoveryButton {...discoveryProps(lang)} className="btn btn-accent px-6" />
          <a
            href={waLink(COPY[lang].waMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn border-white/20 px-6 text-ink-inverse hover:bg-white/5"
          >
            {copy.ctaSecondary}
          </a>
        </div>
      </div>
    </Section>
  );
}

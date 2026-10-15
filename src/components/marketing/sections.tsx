import Image from "next/image";
import cikoChill from "../../../public/brand/mascot/web/ciko-chill.webp";
import cikoExcited from "../../../public/brand/mascot/web/ciko-excited.webp";
import cikoThinking from "../../../public/brand/mascot/web/ciko-thinking.webp";
import dekoFront from "../../../public/brand/mascot/web/deko-front.webp";
import dekoPark from "../../../public/brand/mascot/web/deko-park.webp";
import dekoWink from "../../../public/brand/mascot/web/deko-wink.webp";
import sceneJalan from "../../../public/brand/mascot/web/scene-jalan.webp";
import sceneKasir from "../../../public/brand/mascot/web/scene-kasir.webp";
import sceneLaptop from "../../../public/brand/mascot/web/scene-laptop.webp";
import { COPY, discoveryProps, type Lang, type Track } from "./copy";
import { DiscoveryForm } from "./discovery";
import { Container, SiteNav } from "./shell";

/**
 * Semua seksi menerima `lang` dan mengambil teksnya sendiri dari `COPY`.
 *
 * Tata letaknya mengikuti canvas desain Oktober 2026 hampir piksel per
 * piksel, termasuk `flex-wrap` dan `auto-fit` yang membuat satu tata letak
 * yang sama berlaku dari 390px sampai 1440px tanpa breakpoint. Karena itu
 * banyak ukuran di sini ditulis sebagai nilai Tailwind arbitrer.
 *
 * Mascot (Ciko si burung, Deko si van) diimpor sebagai berkas supaya
 * ukuran aslinya ikut terbawa ke `next/image`. Setiap pose Deko sudah
 * memuat Ciko di atapnya, jadi tidak ada frame yang memasang keduanya
 * terpisah.
 */

/* ================================================================== */
/* Hero                                                                */
/* ================================================================== */

export function Hero({ lang }: { lang: Lang }) {
  const copy = COPY[lang];
  const hero = copy.hero;

  return (
    <header className="overflow-x-clip bg-night text-ink-inverse">
      <SiteNav lang={lang} />

      <Container className="flex flex-wrap items-center gap-[clamp(16px,3vw,40px)] pt-[clamp(28px,5vw,72px)]">
        <div id="top" className="hero-in min-w-0 flex-[1_1_400px]">
          <h1 className="m-0 text-[clamp(44px,5.6vw,78px)] leading-[1.02] tracking-[-0.025em]">
            {hero.title.before}
            <span className="text-accent-bright">{hero.title.accent}</span>
          </h1>
          <p className="mt-6 max-w-[34ch] text-[clamp(18px,1.5vw,21px)] leading-[1.55] text-[#c3cfdd]">
            {hero.lede.before}
            <strong className="text-white">{hero.lede.strong}</strong>
            {hero.lede.after}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <a
              href="#kontak"
              data-track="discovery_cta"
              className="site-btn min-h-14 px-[26px] py-4 text-[17px]"
            >
              {hero.cta}
            </a>
            <a
              href="#portfolio"
              className="py-3 font-bold text-ink-inverse underline decoration-accent-bright decoration-2 hover:text-accent-bright"
            >
              {hero.ctaSecondary}
            </a>
          </div>
        </div>
        {/* Menjorok 48px ke pita angka di bawahnya: van-nya "parkir" di
            atas jalan bergaris putus-putus itu. */}
        <div className="hero-van relative z-[1] -mb-12 min-w-0 flex-[1.15_1_480px]">
          <Image
            src={dekoPark}
            alt={copy.mascots.hero}
            priority
            sizes="(min-width: 1280px) 640px, (min-width: 900px) 52vw, 100vw"
            className="block h-auto w-full"
          />
        </div>
      </Container>

      <div className="relative bg-night-soft">
        <svg
          aria-hidden
          width="100%"
          height="8"
          className="absolute top-[34px] left-0 block"
        >
          <line
            className="hero-road"
            x1="0"
            y1="4"
            x2="100%"
            y2="4"
            stroke="#2b4f7f"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="28 22"
          />
        </svg>
        <Container className="relative">
          <dl className="stagger grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-8 gap-y-5 pt-[76px] pb-5">
            {hero.stats.map((stat) => (
              <div key={stat.label} className="reveal">
                <dt className="site-num text-[30px] text-accent-bright">
                  {stat.value}
                </dt>
                <dd className="mt-1 text-[14px] text-[#c3cfdd]">{stat.label}</dd>
              </div>
            ))}
            <div className="reveal">
              <dt className="text-[22px] leading-[1.25] font-extrabold text-accent-bright">
                {hero.ownership.title}
              </dt>
              <dd className="mt-1 text-[14px] text-[#c3cfdd]">
                {hero.ownership.body}
              </dd>
            </div>
          </dl>
          <p className="pb-6 text-[13px] text-ink-inverse-muted">
            {copy.footnote}
          </p>
        </Container>
      </div>
    </header>
  );
}

/* ================================================================== */
/* Filosofi                                                            */
/* ================================================================== */

export function Philosophy({ lang }: { lang: Lang }) {
  const copy = COPY[lang];
  const [craft, empower] = copy.philosophy.cards;

  return (
    <section
      id="filosofi"
      aria-label={copy.philosophy.label}
      className="pt-[clamp(80px,9vw,120px)] pb-[clamp(48px,6vw,80px)]"
    >
      <Container className="stagger grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
        <div className="reveal flex items-center gap-5 rounded-[22px] bg-accent-soft px-7 py-6">
          <Image
            src={cikoThinking}
            alt={copy.mascots.philosophy}
            sizes="112px"
            className="block h-auto w-28 flex-none"
          />
          <div>
            <h2 className="text-[24px] leading-[1.2]">{craft.title}</h2>
            <p className="mt-2 text-[16px] leading-[1.55] text-[#22344d]">
              {craft.body}
            </p>
          </div>
        </div>
        <div className="reveal flex flex-col justify-center rounded-[22px] bg-forest-soft px-7 py-6">
          <h2 className="text-[24px] leading-[1.2]">{empower.title}</h2>
          <p className="mt-2 text-[16px] leading-[1.55] text-[#1f3d33]">
            {empower.body}
          </p>
        </div>
      </Container>
    </section>
  );
}

/* ================================================================== */
/* Layanan                                                             */
/* ================================================================== */

/**
 * Warna per layanan. Kitchen di navy dengan aksen Electric Blue,
 * Storefront di hijau forest dengan aksen mint pucat. Keduanya dicek
 * kontrasnya di canvas: teks kecil di atas forest memakai #e3faf0, bukan
 * mint, karena mint di sana jatuh di bawah 4,5:1.
 */
const TRACK_TONE = {
  night: {
    card: "bg-night text-ink-inverse",
    chip: "bg-night-soft",
    label: "text-accent-bright",
    muted: "text-[#c3cfdd]",
    number: "text-accent-bright",
    rule: "border-[#1f4170]",
    list: "text-[#dbe4ee]",
    button: "site-btn",
  },
  forest: {
    card: "bg-forest text-white",
    chip: "bg-[#03664a]",
    label: "text-forest-soft",
    muted: "text-[#e3faf0]",
    number: "text-forest-soft",
    rule: "border-[#2f9473]",
    list: "text-[#ecfdf5]",
    button: "site-btn site-btn-dark",
  },
} as const;

function ServiceCard({
  track,
  image,
  alt,
  cta,
  detailsLabel,
  audienceLabel,
}: {
  track: Track;
  image: typeof sceneKasir;
  alt: string;
  cta: string;
  detailsLabel: string;
  audienceLabel: string;
}) {
  const tone = TRACK_TONE[track.tone];
  const headingId = `layanan-${track.tone}`;

  return (
    <article
      aria-labelledby={headingId}
      className={`reveal flex flex-col gap-[22px] rounded-[28px] p-[clamp(20px,3vw,32px)] ${tone.card}`}
    >
      <Image
        src={image}
        alt={alt}
        sizes="(min-width: 760px) 400px, 100vw"
        className="block h-auto w-full max-w-[400px] rounded-[18px]"
      />
      <div>
        <span className={`chip ${tone.chip} ${tone.label}`}>{track.label}</span>
        <h3
          id={headingId}
          className="mt-3 text-[clamp(28px,2.8vw,34px)] leading-[1.1]"
        >
          {track.title}
        </h3>
        <p className={`mt-2 text-[16px] ${tone.muted}`}>{track.subtitle}</p>
      </div>
      <ul aria-label={audienceLabel} className="flex flex-wrap gap-2">
        {track.audience.map((item) => (
          <li key={item} className={`chip ${tone.chip}`}>
            {item}
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-3 gap-3">
        {track.stats.map((stat) => (
          <div key={stat.label} className="min-w-0">
            <dt className={`site-num text-[24px] ${tone.number}`}>{stat.value}</dt>
            <dd className={`mt-0.5 text-[14px] ${tone.muted}`}>{stat.label}</dd>
          </div>
        ))}
      </dl>
      <details className={`site-more border-t pt-1.5 ${tone.rule}`}>
        <summary>
          {detailsLabel}
          <span aria-hidden className={`plus ${tone.label}`}>
            +
          </span>
        </summary>
        <ul
          className={`mt-1 mb-2 grid list-disc gap-1.5 pl-5 text-[15px] leading-[1.55] ${tone.list}`}
        >
          {track.details.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
      <a
        href="#kontak"
        data-track="discovery_cta"
        className={`mt-auto self-start ${tone.button}`}
      >
        {cta}
      </a>
    </article>
  );
}

export function Services({ lang }: { lang: Lang }) {
  const copy = COPY[lang];
  const services = copy.services;
  const [kitchen, storefront] = services.tracks;
  const shared = {
    cta: services.cta,
    detailsLabel: services.detailsLabel,
    audienceLabel: services.audienceLabel,
  };

  return (
    <section
      id="layanan"
      aria-labelledby="h-layanan"
      className="bg-cream-surface py-[clamp(72px,9vw,120px)]"
    >
      <Container>
        <h2 id="h-layanan" className="site-h2 reveal max-w-[16ch]">
          {services.title}
        </h2>
        <p className="reveal reveal-late mt-4 max-w-[44ch] text-[18px] leading-[1.6] text-ink-muted">
          {services.lede}
        </p>
        <div className="stagger mt-[clamp(36px,5vw,56px)] grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-6">
          <ServiceCard
            track={kitchen}
            image={sceneKasir}
            alt={copy.mascots.kitchen}
            {...shared}
          />
          <ServiceCard
            track={storefront}
            image={sceneLaptop}
            alt={copy.mascots.storefront}
            {...shared}
          />
        </div>
      </Container>
    </section>
  );
}

/* ================================================================== */
/* Rekam jejak                                                         */
/* ================================================================== */

export function Proof({ lang }: { lang: Lang }) {
  const copy = COPY[lang];
  const proof = copy.proof;

  return (
    <section
      id="portfolio"
      aria-labelledby="h-portfolio"
      className="pt-[clamp(80px,10vw,128px)] pb-[clamp(64px,8vw,104px)]"
    >
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <div className="reveal min-w-0 flex-[1_1_380px]">
            <h2 id="h-portfolio" className="site-h2 max-w-[15ch]">
              {proof.title}
            </h2>
            <p className="mt-4 max-w-[42ch] text-[18px] leading-[1.6] text-ink-muted">
              {proof.lede}
            </p>
          </div>
          <Image
            src={cikoExcited}
            alt={copy.mascots.proof}
            sizes="200px"
            className="reveal-pop -mb-4 block h-auto w-[clamp(130px,15vw,200px)]"
          />
        </div>

        <ul className="stagger mt-[clamp(32px,5vw,48px)] grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-5">
          {proof.cases.map((item) => (
            <li
              key={item.name}
              className="reveal flex flex-col gap-3.5 rounded-[22px] border border-cream-line bg-cream-surface p-6"
            >
              <span
                className={`chip self-start ${
                  item.track === "kitchen"
                    ? "bg-accent-soft text-accent-hover"
                    : "bg-forest-soft text-[#065f46]"
                }`}
              >
                {proof.trackLabel[item.track]}
              </span>
              {item.value ? (
                <div>
                  <div className="site-num text-[44px] leading-none">
                    {item.value}
                  </div>
                  <div className="mt-1.5 text-[15px] text-ink-muted">
                    {item.result}
                  </div>
                </div>
              ) : (
                <p className="text-[26px] leading-[1.2] font-extrabold">
                  {item.result}
                </p>
              )}
              <div>
                <h3 className="text-[18px]">{item.name}</h3>
                <p className="mt-0.5 text-[14px] text-ink-muted">
                  {item.meta}
                  {item.url && (
                    <>
                      {" · "}
                      <a
                        href={`https://${item.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {item.url}
                      </a>
                    </>
                  )}
                </p>
              </div>
              <details className="site-more mt-auto border-t border-cream-line">
                <summary>
                  {proof.storyLabel}
                  <span aria-hidden className="plus text-[22px] text-accent">
                    +
                  </span>
                </summary>
                <p className="mb-2 text-[14px] leading-[1.55] text-[#22344d]">
                  {item.story}
                </p>
              </details>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[13px] text-ink-muted">{copy.footnote}</p>
      </Container>
    </section>
  );
}

/* ================================================================== */
/* Nilai                                                               */
/* ================================================================== */

export function ValueDoctrine({ lang }: { lang: Lang }) {
  const copy = COPY[lang];
  const value = copy.value;

  return (
    <section
      aria-labelledby="h-nilai"
      className="bg-night py-[clamp(72px,9vw,112px)] text-ink-inverse"
    >
      <Container className="flex flex-wrap items-center gap-[clamp(28px,5vw,64px)]">
        <Image
          src={dekoWink}
          alt={copy.mascots.value}
          sizes="340px"
          className="reveal-pop block h-auto w-full max-w-[340px] min-w-0 flex-[0_1_340px]"
        />
        <div className="reveal reveal-late min-w-0 flex-[1_1_440px]">
          <h2 id="h-nilai" className="site-h2">
            {value.title}
          </h2>
          <blockquote className="mt-5 max-w-[30ch] text-[clamp(21px,2.1vw,27px)] leading-[1.35] font-semibold text-accent-bright">
            &ldquo;{value.quote}&rdquo;
          </blockquote>
          <ul className="mt-7 flex flex-wrap gap-2.5">
            {value.items.map((item) => (
              <li
                key={item}
                className="chip bg-night-soft px-4 py-2.5 text-[15px] text-ink-inverse"
              >
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-[18px] max-w-[50ch] text-[15px] leading-[1.6] text-[#c3cfdd]">
            {value.note}
          </p>
        </div>
      </Container>
    </section>
  );
}

/* ================================================================== */
/* Proses                                                              */
/* ================================================================== */

function StepNumber({ n, last }: { n: number; last: boolean }) {
  return (
    <span
      className={`site-num flex size-11 flex-none items-center justify-center rounded-full text-[18px] ${
        last ? "bg-mint text-ink" : "bg-night text-accent-bright"
      }`}
    >
      {n}
    </span>
  );
}

export function Process({ lang }: { lang: Lang }) {
  const copy = COPY[lang];
  const steps = copy.process.steps;

  return (
    <section
      id="proses"
      aria-labelledby="h-proses"
      className="bg-cream-surface pt-[clamp(80px,9vw,120px)] pb-[clamp(56px,7vw,88px)]"
    >
      <Container>
        <h2 id="h-proses" className="site-h2 reveal max-w-[16ch]">
          {copy.process.title}
        </h2>
        <div className="mt-[clamp(36px,5vw,56px)] flex flex-wrap items-end gap-7">
          <ol className="stagger grid min-w-0 flex-[1_1_720px] grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-5 gap-y-7">
            {steps.map((step, index) => {
              const last = index === steps.length - 1;
              return (
                <li key={step.title} className="reveal">
                  {last ? (
                    <StepNumber n={index + 1} last />
                  ) : (
                    <div className="flex items-center gap-2">
                      <StepNumber n={index + 1} last={false} />
                      {/* Garis putus-putus ke tahap berikutnya. Saat kisi
                          membungkus ke baris baru, garisnya tetap menunjuk
                          ke kanan, dan itu disengaja: urutannya tetap
                          dibaca dari angka, bukan dari garis. */}
                      <svg aria-hidden width="100%" height="6" className="block">
                        <line
                          x1="3"
                          y1="3"
                          x2="99%"
                          y2="3"
                          stroke="#93b4f5"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray="9 9"
                        />
                      </svg>
                    </div>
                  )}
                  <h3 className="mt-3.5 text-[17px] leading-[1.3]">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-[15px] leading-[1.5] text-ink-muted">
                    {step.body}
                  </p>
                </li>
              );
            })}
          </ol>
          <Image
            src={dekoFront}
            alt={copy.mascots.process}
            sizes="230px"
            className="reveal-pop block h-auto w-full max-w-[230px] min-w-0 flex-[0_1_230px]"
          />
        </div>
      </Container>
    </section>
  );
}

/* ================================================================== */
/* Tentang                                                             */
/* ================================================================== */

export function About({ lang }: { lang: Lang }) {
  const copy = COPY[lang];
  const about = copy.about;

  return (
    <section
      id="tentang"
      aria-labelledby="h-tentang"
      className="py-[clamp(72px,9vw,120px)]"
    >
      <Container>
        <div className="flex flex-wrap items-center gap-[clamp(28px,5vw,64px)]">
          <figure className="reveal m-0 min-w-0 flex-[1_1_340px]">
            <Image
              src={sceneJalan}
              alt={copy.mascots.about}
              sizes="(min-width: 760px) 500px, 100vw"
              className="block h-auto w-full max-w-[500px] rounded-[22px]"
            />
            <figcaption className="mt-2.5 text-[14px] text-ink-muted">
              {about.location}
            </figcaption>
          </figure>
          <div className="reveal reveal-late min-w-0 flex-[1.1_1_420px]">
            <h2 id="h-tentang" className="site-h2 max-w-[14ch]">
              {about.title}
            </h2>
            <p className="mt-[18px] max-w-[46ch] text-[18px] leading-[1.6] text-[#22344d]">
              {about.body}
            </p>
            <p className="mt-5 max-w-[30ch] text-[21px] leading-[1.35] font-extrabold text-forest">
              {about.measure}
            </p>
          </div>
        </div>
        <dl className="stagger mt-[clamp(40px,6vw,64px)] grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4">
          {about.facts.map((fact) => (
            <div
              key={fact.label}
              className="reveal rounded-[18px] border border-cream-line bg-cream-surface px-5 py-[18px]"
            >
              <dt className="site-num text-[24px]">{fact.value}</dt>
              <dd className="mt-1 text-[14px] leading-[1.45] text-ink-muted">
                {fact.label}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}

/* ================================================================== */
/* Kontak                                                              */
/* ================================================================== */

/**
 * Seksi penutup: form sesi discovery terpasang langsung, tanpa tombol
 * yang harus diklik dulu. Semua ajakan lain di halaman ini cuma jangkar
 * ke sini.
 */
export function Contact({ lang }: { lang: Lang }) {
  const copy = COPY[lang];

  return (
    <section
      id="kontak"
      aria-labelledby="h-kontak"
      className="bg-night py-[clamp(80px,9vw,120px)] text-ink-inverse"
    >
      <Container className="flex flex-wrap items-center gap-[clamp(32px,5vw,64px)]">
        <div className="reveal min-w-0 flex-[1_1_340px]">
          <h2
            id="h-kontak"
            className="site-h2 max-w-[12ch] text-[clamp(34px,4.4vw,56px)]"
          >
            {copy.contact.title}
          </h2>
          <p className="mt-[18px] max-w-[36ch] text-[18px] leading-[1.6] text-[#c3cfdd]">
            {copy.contact.lede}
          </p>
          <Image
            src={cikoChill}
            alt={copy.mascots.contact}
            sizes="200px"
            className="reveal-pop mt-6 block h-auto w-[clamp(140px,15vw,200px)]"
          />
        </div>
        <div className="reveal reveal-late min-w-0 flex-[1_1_420px] rounded-[28px] bg-cream-surface p-[clamp(24px,3.5vw,40px)] text-ink shadow-[0_14px_36px_-12px_rgba(0,0,0,0.5)]">
          <DiscoveryForm {...discoveryProps(lang)} />
        </div>
      </Container>
    </section>
  );
}

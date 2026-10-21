import Image from "next/image";
import cikoChill from "../../../public/brand/mascot/web/ciko-chill.webp";
import { TEAM } from "./content";
import { COPY, HOME, type Lang } from "./copy";
import { Container, SiteFooter, SiteNav } from "./shell";
import { SiteRoot } from "./site";

/**
 * Halaman tim (`/tim`, `/en/tim`), varian "potret besar" dari canvas
 * desain Oktober 2026: judul, satu kisi foto di atas navy yang menyambung
 * dari nav, lalu satu ajakan. Sengaja tanpa paragraf pengantar.
 *
 * Bidang warna di belakang foto diputar berurutan dari palet situs, bukan
 * acak per orang. Navy tidak ikut putaran karena latarnya sendiri navy.
 */
const TONES = ["bg-accent-soft", "bg-forest-soft", "bg-cream-line"] as const;

export function TeamPage({ lang }: { lang: Lang }) {
  const copy = COPY[lang];
  const team = copy.team;

  return (
    <SiteRoot lang={lang}>
      <header className="bg-night text-ink-inverse">
        <SiteNav lang={lang} page="team" />
      </header>

      <main className="flex-1 bg-cream">
        <section
          id="top"
          aria-labelledby="h-tim"
          className="bg-night pt-[clamp(40px,5vw,72px)] pb-[clamp(72px,8vw,104px)] text-ink-inverse"
        >
          <Container>
            <h1
              id="h-tim"
              className="hero-in m-0 text-[clamp(40px,5vw,64px)] leading-[1.05] tracking-[-0.025em]"
            >
              {team.title.before}
              <span className="text-accent-bright">{team.title.accent}</span>
            </h1>

            <ul
              aria-label={team.listLabel}
              className="stagger mt-[clamp(28px,4vw,44px)] grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5"
            >
              {TEAM.map((member, i) => {
                const role = team.roles[member.id];
                return (
                  <li key={member.id} className="reveal flex">
                    <a
                      href={member.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${member.name}, ${role}. ${team.linkHint}`}
                      className={`team-card relative flex aspect-square flex-1 overflow-hidden rounded-[28px] text-ink no-underline ${TONES[i % TONES.length]}`}
                    >
                      <Image
                        src={member.photo}
                        alt={`${team.photo} ${member.name}`}
                        sizes="(min-width: 1280px) 590px, (min-width: 660px) 50vw, 100vw"
                        className="team-photo absolute top-[11%] left-0 block h-auto w-full"
                      />
                      <div className="absolute inset-x-4 bottom-4 flex items-center gap-3.5 rounded-[18px] bg-cream-surface py-4 pr-4 pl-[22px]">
                        <div className="min-w-0 flex-1">
                          <h2 className="m-0 text-[24px] leading-[1.2]">
                            {member.name}
                          </h2>
                          <p className="mt-1 text-[16px] leading-[1.35] text-ink-muted">
                            {role}
                          </p>
                        </div>
                        <span
                          aria-hidden
                          className="team-arrow flex size-12 flex-none items-center justify-center rounded-full bg-night text-accent-bright"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M7 17 17 7" />
                            <path d="M8 7h9v9" />
                          </svg>
                        </span>
                      </div>
                    </a>
                  </li>
                );
              })}
            </ul>
          </Container>
        </section>

        <section
          aria-labelledby="h-ajak"
          className="py-[clamp(56px,7vw,88px)]"
        >
          <Container className="reveal flex flex-wrap items-center gap-x-8 gap-y-5">
            <Image
              src={cikoChill}
              alt={copy.mascots.contact}
              sizes="150px"
              className="block h-auto w-[clamp(110px,11vw,150px)]"
            />
            <h2
              id="h-ajak"
              className="site-h2 min-w-0 flex-[1_1_320px] text-[clamp(28px,3.2vw,40px)]"
            >
              {team.closing.title}
            </h2>
            <a
              href={`${HOME[lang]}#kontak`}
              data-track="discovery_cta"
              className="site-btn min-h-14 px-[26px] py-4 text-[17px]"
            >
              {copy.hero.cta}
            </a>
          </Container>
        </section>
      </main>

      <SiteFooter lang={lang} page="team" />
    </SiteRoot>
  );
}

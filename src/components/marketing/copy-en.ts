import type { SiteCopy } from "./copy";

/**
 * Versi bahasa Inggris situs publik — padanan `copy-id.ts`, bukan
 * terjemahan harfiahnya.
 *
 * Yang harfiah cuma angkanya. Kalimatnya ditulis ulang supaya berbunyi
 * seperti ditulis dalam bahasa Inggris sejak awal — termasuk memisahkan
 * kalimat panjang bahasa Indonesia yang kalau diterjemahkan kata per kata
 * jadi satu kalimat berputar-putar.
 *
 * Yang TIDAK diterjemahkan, dan alasannya:
 *   - **Angka & satuan** diadaptasi, tidak diterjemahkan: "30–50 mnt" jadi
 *     "30–50 min", "290 rb+" jadi "290k+", "Rp 11,8 jt" jadi "Rp 11.8M".
 *     Nilai rupiah tetap rupiah — mengonversinya ke dolar berarti memasang
 *     kurs yang akan basi, dan pembaca yang dituju halaman ini tetap
 *     berurusan dengan bisnis di Indonesia.
 *   - **Nama** (Decaf, The Kitchen, The Storefront, nama klien, nama kota)
 *     dan **istilah brand** (Empowering Technology, Craft First Tech
 *     Second) — sudah berbahasa Inggris sejak awal, dan mengubahnya akan
 *     membuat dua versi situs menyebut hal yang sama dengan nama berbeda.
 *   - **Jangkar seksi** (`#filosofi`, `#layanan`, …) — id elemen, bukan
 *     kalimat. Lihat komentar di `copy-id.ts`.
 *
 * Pagar isinya sama persis: angka dulu kata sifat belakangan, anti-hype,
 * dan yang belum selesai tidak dipajang.
 */

export const EN: SiteCopy = {
  meta: {
    title: "Decaf Tech — Digital Transformation That Puts People First",
    description:
      "Custom systems you own, not rent. Daily reconciliation down to one click, 0% recording errors, Rp 0/month in server costs.",
  },

  nav: {
    links: [
      { href: "#filosofi", label: "Value" },
      { href: "#layanan", label: "Services" },
      { href: "#portfolio", label: "Portfolio" },
      { href: "#proses", label: "Process" },
      { href: "#kontak", label: "Contact" },
    ],
    sections: "Page sections",
    home: "Decaf Tech — back to top",
    language: "Choose language",
    cta: "Free session",
  },

  hero: {
    splashEyebrow: "A digital studio, Made tech just for you",
    scroll: "Scroll",
    eyebrow: "Decaf Tech · Digital Systems Studio",
    title: {
      line1: "Digital transformation",
      line2: "that ",
      accent: "empowers people.",
    },
    lede: {
      before:
        "Technology was never meant to replace people — it exists to extend what they can already do. We build custom systems ",
      strong: "you own",
      after: " — not ones you rent forever.",
    },
    ctaSecondary: "See the real numbers",
    stats: [
      { value: "1 click", label: "replaces 30–50 min of daily reconciliation" },
      { value: "10–18×", label: "faster reconciliation" },
      { value: "55–65%", label: "prototype handoff efficiency" },
      { value: "6", label: "live systems you can verify" },
    ],
  },

  philosophy: {
    eyebrow: "01 · Philosophy",
    title: "Shifting the productivity curve",
    body: [
      "In conventional operations, accuracy costs hours of manual work. Every bit of extra precision is paid for with extra time — and the curve climbs slowly.",
      "The right digital system moves that curve: higher output, sharper decisions, in a fraction of the time.",
    ],
    empowering: {
      title: "Empowering Technology",
      body: "The right technology does not create a new dependency — it multiplies the capacity your team already possesses. As a result, it maximizes both variables at once: time and output, delivering better outcomes in less time.",
    },
    craft: {
      title: "Craft First, Tech Second",
      body: "Craft comes first — empathy and a genuine understanding of the problem, so the solution remains contextual as well. Tech comes second, as not every problem requires a technological solution — at times, the right approach alone suffices.",
    },
  },

  services: {
    eyebrow: "02 · Services",
    title: "Two services, one way of working",
    lede: "Not every business needs the same solution. Two services with opposite architectural characters, each optimal in its own context — both still built for you to own.",
    cta: "Start here",
    investmentLabel: "Investment model",
    tracks: [
      {
        eyebrow: "Service 01 · The Kitchen",
        title: "Business Operational",
        subtitle: "For the operational kitchen of your business",
        tone: "night",
        rows: [
          {
            label: "Best for",
            value: "Small businesses, cafés, retail stores, cashiers, warehouses",
          },
          {
            label: "Built for you",
            value:
              "Designed around your operations — not an off-the-shelf product everyone is made to fit",
          },
          {
            label: "Ownership",
            value: "Entirely yours from day one, with no monthly subscription",
          },
          { label: "Data", value: "100% under the physical control of your premises" },
        ],
        investment: [
          "One-time development cost",
          "No binding monthly subscription",
          "Runs directly on your own devices, with no reliance on outside services",
          "Data 100% under your physical control",
          "Can be monitored remotely whenever needed",
          "Upgrades & feature iterations as your needs change",
        ],
      },
      {
        eyebrow: "Service 02 · The Storefront",
        title: "Community & Branding",
        subtitle: "For the digital storefront of your identity",
        tone: "forest",
        rows: [
          {
            label: "Best for",
            value: "Company profiles, portfolios, communities, branding",
          },
          {
            label: "Built for you",
            value:
              "Designed around your business's story — not a template anyone else could use",
          },
          {
            label: "Ownership",
            value: "Entirely yours, with no binding subscription",
          },
          {
            label: "Reach",
            value: "Loads fast from anywhere, from the first day it goes live",
          },
        ],
        investment: [
          "One-time development cost",
          "No upfront hosting cost at ordinary traffic levels",
          "Scale up on your own terms as you grow",
          "Updates publish automatically on every change, with no manual step",
          "Loads fast from anywhere, from the first day it goes live",
          "Edit content without needing a developer",
        ],
      },
    ],
  },

  outcomes: {
    kitchen: {
      eyebrow: "Service 01 · Business operations",
      title: "What you get",
      items: [
        {
          metric: "1-Click",
          caption: "down from 30–50 min by hand",
          title: "Time You Get Back",
          body: "Daily financial reconciliation that used to take 30–50 minutes of manual work now finishes in a single click. That time comes back to you in full.",
        },
        {
          metric: "0%",
          caption: "recording & stock errors",
          title: "Reliability You Can Measure",
          body: "Errors in stock deduction are eliminated through atomic database transactions. No more overselling, no more mispriced entries.",
        },
        {
          metric: "Real-Time",
          caption: "financial insight & trends",
          title: "Clarity, Immediately",
          body: "Cash flow, sales trends, and reconciliation are available the moment you ask — no waiting for month-end, no multi-day manual process.",
        },
      ],
    },
    storefront: {
      eyebrow: "Service 02 · Community & branding",
      title: "A digital identity that speaks for you",
      items: [
        {
          metric: "Global CDN",
          caption: "your physical store is not the only thing open 24 hours",
          title: "Findable From Anywhere",
          body: "Your site is copied to hundreds of servers around the world, so someone in any city opens it just as fast — not only the people nearby. Distance stops limiting your reach.",
        },
        {
          metric: "~100",
          caption: "official Google speed score",
          title: "A First Impression That Holds",
          body: "People judge a business in the first seconds of opening its site. A slow or slapdash site loses prospective customers before they ever meet your product — a fast, well-made one gives them a reason to stay.",
        },
        {
          metric: "Self-CMS",
          caption: "no developer, no waiting in line",
          title: "Always Current, Without the Hassle",
          body: "Change prices, photos, or announcements yourself, whenever you like — no calling a developer, no waiting your turn. Everyone who fills in a form on your site is recorded automatically, so no prospect slips through.",
        },
      ],
    },
  },

  proof: {
    eyebrow: "03 · Track record",
    title: "Real numbers from systems in production",
    lede: "Every number below is a measured result from a running system — not a projection, not a marketing claim. All of it traces back to the code and the development documentation.",
    trackLabel: { kitchen: "Kitchen", storefront: "Storefront" },
    cases: [
      {
        no: "01",
        name: "Mammo's Home Bakery",
        kind: "POS & Business Management",
        meta: "Bukit Lawang, North Sumatra",
        before: "Records on paper & spreadsheets. Reconciliation took 30–50 min/day.",
        track: "kitchen",
        stats: [
          { value: "0%", label: "Stock deduction errors" },
          { value: "1-click", label: "Daily financial reconciliation" },
          { value: "0 cases", label: "Stock overselling" },
        ],
      },
      {
        no: "02",
        name: "Diversity of Sumatra Clothes",
        kind: "Multi-Location Inventory",
        meta: "Bukit Lawang, North Sumatra",
        before:
          "Stock scattered with no visibility. Staff sold items without knowing availability.",
        track: "kitchen",
        stats: [
          { value: "→ 0", label: "Stockouts after go-live" },
          { value: "< 2 min", label: "Recording time per transaction" },
          { value: "0%", label: "Revenue leakage from pricing" },
        ],
      },
      {
        no: "03",
        name: "CS Dashboard Siswamedia",
        kind: "Enterprise Monitoring Platform",
        meta: "Jakarta",
        before:
          "WhatsApp threads & Google Sheets. Financial discrepancies surfaced only at month-end.",
        track: "kitchen",
        stats: [
          { value: "10–18×", label: "Faster reconciliation" },
          { value: "< 60 sec", label: "AI analysis across 90 days of data" },
          { value: "55–65%", label: "Prototype handoff efficiency" },
        ],
      },
      {
        no: "04",
        name: "Sadewa (Sayap Dewantara)",
        kind: "Foundation Site + CMS + Analytics",
        meta: "Jakarta",
        before:
          "A static Wix site; 15 years of education programmes with no public record.",
        track: "storefront",
        url: "sadewaind.org",
        stats: [
          {
            value: "10 cohorts",
            label:
              "15 years of programme history is now public reading — no longer buried in internal PDF reports",
          },
          {
            value: "0 lines of code",
            label:
              "Foundation staff post news & programmes themselves, without waiting for a developer",
          },
          {
            value: "Rp0/month",
            label:
              "No monthly platform rent — the site belongs entirely to the foundation",
          },
        ],
      },
      {
        no: "05",
        name: "LAKSA Bogor",
        kind: "Tourism Directory + Government Backoffice",
        meta: "Bogor",
        before:
          "Tourism content buried inside a chatbot iframe — 0 pages Google could index.",
        track: "storefront",
        url: "laksabogor.info",
        stats: [
          {
            value: "76 pages",
            label:
              "Bogor's tourism now appears in Google search — previously 0 pages could be found at all",
          },
          {
            value: "0 lines of code",
            label:
              "Agency staff add and edit destination details themselves, without a developer",
          },
          {
            value: "250 facilities",
            label:
              "Residents & visitors find the nearest health facility straight from the site",
          },
        ],
      },
      {
        no: "06",
        name: "Gernas Tastaka",
        kind: "Site Migration & Modernisation",
        meta: "Literacy nonprofit",
        before: "An ageing WordPress, content mixed with junk, no English path.",
        track: "storefront",
        url: "gernastastaka.org",
        stats: [
          {
            value: "2 languages",
            label:
              "The site now reads for international partners & donors, not only local visitors",
          },
          {
            value: "24 blocks",
            label:
              "Non-technical staff assemble new pages themselves through an Indonesian-language dashboard",
          },
          {
            value: "123 photos",
            label:
              "The full programme documentation moved across intact, with nothing lost",
          },
        ],
      },
    ],
  },

  value: {
    eyebrow: "04 · Value proposition",
    title: "More than a transaction",
    quote:
      "I give value, and I receive value. The success of your system is my best portfolio.",
    note: {
      before: "This sits ",
      strong: "on top of",
      after:
        " a transparent development fee, it does not replace one. Beyond the figure we agree on, there are three things I am looking for in every engagement.",
    },
    items: [
      {
        no: "01",
        title: "Meaningful Networks",
        body: "Access to communities, business referrals, and a web of relationships that stays mutually useful over the long run.",
      },
      {
        no: "02",
        title: "Continuous Learning",
        body: "Every engagement teaches something new about your business context — and that learning is what makes the next solution sharper and better aimed.",
      },
      {
        no: "03",
        title: "Real Social Impact",
        body: "Work whose benefit reaches past the business itself — to the community, the environment, or the people around it.",
      },
    ],
  },

  process: {
    eyebrow: "05 · Execution process",
    title: "From problem to running product",
    lede: "Five stages every engagement goes through, in order. You always know which stage you are in — and what comes out of it.",
    steps: [
      {
        no: "01",
        title: "Discovery & Problem Mapping",
        body: "Identifying the root problem, not just its symptoms. The output is one problem statement we both agree on.",
      },
      {
        no: "02",
        title: "Specification & Prototyping",
        body: "Choosing the solution path, writing the requirements, estimating effort transparently. No cost surprises.",
      },
      {
        no: "03",
        title: "Execution Sprints",
        body: "Iterative. You watch the system take shape from day one — rather than waiting until it is finished.",
      },
      {
        no: "04",
        title: "Deployment & Handover",
        body: "Installation on your own devices, technical documentation, a training session. You are not dependent on us.",
      },
      {
        no: "05",
        title: "Post-Delivery Support",
        body: "A bug-fix guarantee and a clear line of communication for the next round of features.",
      },
    ],
  },

  about: {
    eyebrow: "What shaped this way of working",
    title: "It started in the field, not on a screen",
    location: "Bogor, West Java, Indonesia",
    body: [
      "Before this was a studio, the work was running empowerment programmes in the field: sitting with small business owners, teachers, and community organisers — people whose system was not a dashboard but a notebook and a WhatsApp group nobody ever finishes reading.",
      "That is where the habit formed: map the problem where it happens first, then decide what needs building. Often the answer turns out to be fewer features, not more.",
      "The measure of success shifted with it. Not that the system shipped on time, but that the person using it every day is still using it three months later — with nobody sitting beside them.",
    ],
    facts: [
      {
        value: "Rp 200M",
        label:
          "Business grants managed through to disbursement for 70 entrepreneurs across 5 locations",
      },
      {
        value: "6,117 users",
        label: "Served through school systems across 15+ schools",
      },
      {
        value: "Rp 11.8M",
        label:
          "Public donations raised in a single month during the National Children's Day campaign",
      },
      {
        value: "290k+",
        label:
          "Audience reached across two campaign collaborations, 130k+ impressions — including the campaign that raised Rp 11.8M in public donations",
      },
      {
        value: "20+ sessions",
        label: "Testing with real users before any feature was called finished",
      },
    ],
  },

  contact: {
    eyebrow: "Next step",
    title: "Let's design the solution together",
    lede: "The first discovery session is free and commits you to nothing. Fill in three short fields and our team will reach out — we start by understanding the problem, not by selling a solution.",
    ctaSecondary: "Message us directly",
  },

  footer: {
    tagline: "Empowering people, impact first.",
    backoffice: "Team login",
  },

  discovery: {
    cta: "Free discovery session",
    title: "Free discovery session",
    intro:
      "Fill in the three fields below. Our team will contact you — there is no cost and no commitment.",
    fields: {
      phone: {
        label: "Phone / WhatsApp number",
        placeholder: "+62 812xxxxxxxx",
        hint: "This is where our team will reach you.",
      },
      business: {
        label: "Field or type of business",
        placeholder: "Café, 2 branches · Hardware store · Education foundation",
      },
      interest: {
        label: "Tell us about your business/project right now?",
        placeholder:
          "For example: a café with 2 branches, stock is still tracked by hand and often drifts.",
      },
    },
    honeypot: "Leave this empty",
    submit: "Send & wait for our call",
    pending: "Sending…",
    close: "Close",
    successTitle: "Sent. Thank you!",
    successBody:
      "Our team will contact you on the number you gave, within one working day. There is nothing you need to prepare — the first conversation is for understanding the problem.",
    fallback: "Prefer to talk right away?",
    fallbackLink: "Message us on WhatsApp",
    errors: {
      empty: "All three fields are still required.",
      phone: "That phone number looks incomplete — please check it again.",
      business: "Tell us a little more clearly what field your business is in.",
      interest: "Tell us a bit about your business or project.",
      failed:
        "Sorry, sending failed. Please try once more, or message us directly on WhatsApp.",
    },
  },

  waMessage:
    "Hello, I found Decaf Tech through your website. I'd like to talk about my business operations.",
};

import type { SiteCopy } from "./copy";

/**
 * Versi bahasa Inggris situs publik, padanan `copy-id.ts`, bukan
 * terjemahan harfiahnya.
 *
 * Yang harfiah cuma angkanya. Kalimatnya ditulis ulang supaya berbunyi
 * seperti ditulis dalam bahasa Inggris sejak awal.
 *
 * Yang TIDAK diterjemahkan, dan alasannya:
 *   - **Angka & satuan** diadaptasi, tidak diterjemahkan: "290 rb+" jadi
 *     "290k+", "Rp 11,8 jt" jadi "Rp 11.8M". Nilai rupiah tetap rupiah:
 *     mengonversinya ke dolar berarti memasang kurs yang akan basi.
 *   - **Nama** (Decaf, The Kitchen, The Storefront, nama klien, nama kota),
 *     supaya dua versi situs tidak menyebut hal yang sama dengan nama
 *     berbeda.
 *   - **Jangkar seksi** (`#layanan`, …), id elemen, bukan kalimat.
 *
 * Pagar isinya sama persis: angka dulu kata sifat belakangan, anti-hype,
 * tanpa em dash, dan yang belum selesai tidak dipajang.
 */

export const EN: SiteCopy = {
  meta: {
    title: "Decaf Tech | Digital Transformation That Puts People First",
    description:
      "Custom systems you own, not rent. Point of sale, finance, stock, and websites with a CMS, built specifically for your business.",
  },

  nav: {
    links: [
      { href: "#layanan", label: "Services" },
      { href: "#portfolio", label: "Portfolio" },
      { href: "#proses", label: "Process" },
      { href: "#tentang", label: "About" },
    ],
    sections: "Page sections",
    home: "Decaf Tech, back to top",
    language: "Choose language",
    cta: "Free session",
  },

  mascots: {
    hero: "Deko, Decaf's blue crocheted van, parked with its awning open: inside are a laptop, a server rack, and plants. Ciko the bird sits on the roof.",
    philosophy: "Ciko the crocheted bird thinking, wing on chin.",
    kitchen:
      "Inside Deko: a cash register with a receipt printer, Ciko standing beside it.",
    storefront:
      "Inside Deko: a laptop showing a web page, Ciko standing beside it.",
    proof: "Ciko the crocheted bird jumping happily with wings spread.",
    value: "Deko the crocheted van winking, Ciko on its roof.",
    process:
      "Deko the crocheted van seen from the front with its lights on, Ciko on its roof.",
    about:
      "Deko driving down a highway at sunset, Ciko on the roof with the luggage.",
    contact: "Ciko the crocheted bird sitting relaxed with eyes closed.",
  },

  footnote: "*Measured methodologically.",

  hero: {
    title: { before: "Digital transformation that ", accent: "puts people first." },
    lede: { before: "Custom systems ", strong: "you own", after: "" },
    cta: "Free discovery session",
    ctaSecondary: "See the real numbers",
    stats: [
      { value: "45%*", label: "more efficient transactions and reporting" },
      { value: "10-18×", label: "faster reconciliation" },
    ],
    ownership: {
      title: "Entirely yours",
      body: "Made just for you",
    },
  },

  philosophy: {
    label: "Philosophy",
    cards: [
      {
        title: "Craft first, tech second",
        body: "We study the problem in its own context before anything else. Not every problem needs technology.",
      },
      {
        title: "Strengthen your team, don't replace it",
        body: "The right technology multiplies what your team can already do, without creating a new dependency.",
      },
    ],
  },

  services: {
    title: "Two services, one way of working",
    lede: "Both are built specifically for you, and both are entirely yours.",
    cta: "Start here",
    detailsLabel: "Details & pricing model",
    audienceLabel: "Best for",
    tracks: [
      {
        label: "The Kitchen",
        title: "Business Operational",
        subtitle: "Point of sale, finance, and stock. Runs on your own devices.",
        tone: "night",
        audience: ["Small businesses", "Cafés", "Retail stores", "Checkout counters", "Warehouses"],
        stats: [
          { value: "45%*", label: "more efficient transactions & reports" },
          { value: "10-18×", label: "faster reconciliation" },
          { value: "Real-Time", label: "cash flow & trends" },
        ],
        details: [
          "One-time development cost, no monthly subscription",
          "Your data stays 100% on your premises",
          "Runs on your own devices, without depending on outside services",
          "Remote monitoring whenever you need it",
          "Upgrades and new features as your needs change",
        ],
      },
      {
        label: "The Storefront",
        title: "Community & Branding",
        subtitle: "A website + CMS you edit yourself, no developer needed.",
        tone: "forest",
        audience: ["Company profiles", "Portfolios", "Communities", "Branding"],
        stats: [
          { value: "~100", label: "Google speed score" },
          { value: "Global", label: "fast from any city" },
          { value: "Self-CMS", label: "no developer queue" },
        ],
        details: [
          "One-time development cost, no lock-in subscription",
          "No upfront hosting cost at typical scale",
          "Upgrade on your own as you grow",
          "Every form a visitor submits is saved automatically",
          "Update content without a developer",
        ],
      },
    ],
  },

  proof: {
    title: "Results from systems already in use",
    lede: "Every one of these is a running system, not a projection.",
    trackLabel: { kitchen: "Kitchen", storefront: "Storefront" },
    storyLabel: "Before & after",
    cases: [
      {
        name: "Mammo's Home Bakery",
        track: "kitchen",
        value: "45%*",
        result: "more efficient transactions and reporting",
        meta: "POS & business management · North Sumatra",
        story:
          "Before: paper & spreadsheets, 30-50 minutes of reconciliation a day. Now transactions and reports live in one system, with no overselling.",
      },
      {
        name: "Diversity of Sumatra Clothes",
        track: "kitchen",
        result: "Stock visible across every location",
        meta: "Multi-location inventory · North Sumatra",
        story:
          "Before: staff sold items without knowing if they were in stock. Now every location's stock is recorded in one system.",
      },
      {
        name: "CS Dashboard Siswamedia",
        track: "kitchen",
        value: "10-18×",
        result: "faster reconciliation",
        meta: "Monitoring platform · Jakarta",
        story:
          "Before: WhatsApp & Google Sheets, with discrepancies found only at month-end. Now 90 days of data can be analysed in under 60 seconds.",
      },
      {
        name: "Sadewa (Sayap Dewantara)",
        track: "storefront",
        result: "Staff update the site themselves",
        meta: "Foundation website",
        url: "sadewaind.org",
        story:
          "Before: a static Wix site, and 15 years of programme history with no public record. Now that history is public, with no platform rental fee.",
      },
      {
        name: "LAKSA Bogor",
        track: "storefront",
        result: "Bogor tourism now shows up on Google",
        meta: "Local government tourism directory",
        url: "laksabogor.info",
        story:
          "Before: tourism content was buried inside a chatbot. Now agency staff edit destination info themselves, and residents can find the nearest health facility.",
      },
      {
        name: "Gernas Tastaka",
        track: "storefront",
        result: "A bilingual site for international partners",
        meta: "Literacy nonprofit · no-code self-CMS",
        url: "gernastastaka.org",
        story:
          "Before: an ageing WordPress site with no English path. Now the site has a self-CMS: non-technical staff build pages themselves from 24 ready-made blocks in an Indonesian-language dashboard, without writing a line of code. The activity archive moved over intact.",
      },
    ],
  },

  value: {
    title: "More than a transaction",
    quote: "The success of your system is my best portfolio.",
    items: ["Meaningful networks", "Continuous learning", "Real social impact"],
    note: "All three come on top of a transparent development fee, never in place of it.",
  },

  process: {
    title: "From problem to working product",
    steps: [
      { title: "Discovery", body: "Find the root cause, not the symptom." },
      {
        title: "Specification & prototype",
        body: "Transparent estimates, no surprise costs.",
      },
      {
        title: "Execution sprints",
        body: "Watch the system grow from day one.",
      },
      {
        title: "Deployment & handover",
        body: "Installed, documented, and your team trained.",
      },
      {
        title: "Post-delivery support",
        body: "A bug-fix warranty and a path to the next iteration.",
      },
    ],
  },

  about: {
    title: "It started in the field, not on a screen",
    location: "Bogor, West Java",
    body: "Before we were a studio, we sat with business owners, teachers, and community organisers whose systems were still notebooks and WhatsApp groups.",
    measure:
      "Our measure of success: still in use three months later, without anyone holding their hand.",
    facts: [
      { value: "Rp 200M", label: "in grants disbursed to 70 entrepreneurs" },
      { value: "6,117", label: "system users across 15+ schools" },
      { value: "Rp 11.8M", label: "raised in a one-month campaign" },
      { value: "290k+", label: "people reached through two campaign collaborations" },
      { value: "20+ sessions", label: "of testing with real users" },
    ],
  },

  contact: {
    title: "Let's design the solution together",
    lede: "The first session is free, with no commitment. Fill in the form and our team will get in touch.",
  },

  footer: {
    tagline: "Strengthening people, putting impact first.",
    otherLang: "Versi Indonesia",
    backoffice: "Team login",
  },

  discovery: {
    title: "Free discovery session",
    fields: {
      phone: {
        label: "Phone / WhatsApp number",
        placeholder: "+62 812xxxxxxxx",
      },
      business: {
        label: "Type of business",
        placeholder: "Café with 2 branches, hardware store, foundation…",
      },
      interest: {
        label: "Tell us about your business problem",
        placeholder: "Example: stock is still recorded by hand and often doesn't add up.",
      },
    },
    optional: "(optional)",
    honeypot: "Leave this empty",
    submit: "Send & we'll get in touch",
    pending: "Sending…",
    successTitle: "Sent. Thank you!",
    successBody:
      "Our team will contact you on that number within one working day. You don't need to prepare anything.",
    reset: "Fill in the form again",
    fallback: "Prefer to talk directly?",
    fallbackLink: "Message us on LinkedIn",
    errors: {
      empty: "Please fill in your phone number and type of business.",
      phone: "That number looks incomplete. Please check it again.",
      business: "Please describe your type of business in a little more detail.",
      interest: "Tell us a little more, or leave it empty.",
      failed:
        "Sorry, that didn't go through. Please try again, or message us on LinkedIn.",
    },
  },
};

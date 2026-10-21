import type { SiteCopy } from "./copy";

/**
 * Seluruh teks situs publik dalam bahasa Indonesia, versi bawaan.
 *
 * Sejak redesign Oktober 2026 acuannya canvas desain yang disetujui
 * pemilik, bukan lagi pitch deck: satu kalimat per seksi, rinciannya
 * dilipat di `<details>`. Kalimat yang tidak ada di canvas tidak masuk.
 *
 * Aturan yang mengikat isi berkas ini (dan padanannya di `copy-en.ts`):
 *   - **Angka dulu, kata sifat belakangan.** Angka yang ditonjolkan cuma
 *     dua: 45%* dan 10-18×. Angka lain tinggal di rekam jejak.
 *   - **Anti-hype.** "revolusioner", "canggih", "cutting-edge",
 *     "game-changer" haram di seluruh berkas ini.
 *   - **Tanpa em dash.** Kalimat yang butuh jeda dipecah jadi dua.
 *   - **Yang belum selesai tidak dipajang.** `cases` cuma memuat sistem
 *     yang sudah berjalan.
 *
 * Jangkar seksi (`#layanan`, `#portfolio`, …) sengaja tetap berbahasa
 * Indonesia di kedua versi. Ia id elemen, bukan kalimat: menerjemahkannya
 * berarti dua set id untuk seksi yang sama.
 */

export const ID: SiteCopy = {
  meta: {
    title: "Decaf Tech | Transformasi Digital yang Memanusiakan",
    description:
      "Sistem custom yang Anda miliki, bukan Anda sewa. Kasir, keuangan, stok, dan situs dengan CMS, dibangun khusus untuk bisnis Anda.",
  },

  nav: {
    links: [
      { href: "#layanan", label: "Layanan" },
      { href: "#portfolio", label: "Portfolio" },
      { href: "#proses", label: "Proses" },
      { href: "#tentang", label: "Tentang" },
    ],
    sections: "Bagian halaman",
    home: "Decaf Tech, ke atas halaman",
    homePage: "Decaf Tech, ke beranda",
    language: "Pilih bahasa",
    cta: "Sesi gratis",
    team: "Tim",
  },

  mascots: {
    hero: "Deko, van rajutan biru Decaf, parkir dengan tenda terbuka: di dalamnya laptop, rak server, dan tanaman. Ciko si burung duduk di atap.",
    philosophy: "Ciko si burung rajutan sedang berpikir, sayap di dagu.",
    kitchen:
      "Di dalam Deko: mesin kasir dengan printer struk, Ciko berdiri di sebelahnya.",
    storefront:
      "Di dalam Deko: laptop menampilkan halaman situs, Ciko berdiri di sebelahnya.",
    proof: "Ciko si burung rajutan melompat gembira dengan sayap terbuka.",
    value: "Deko si van rajutan mengedipkan satu mata, Ciko di atapnya.",
    process:
      "Deko si van rajutan tampak depan dengan lampu menyala, Ciko di atapnya.",
    about:
      "Deko melaju di jalan raya saat matahari terbenam, Ciko di atap bersama barang bawaan.",
    contact: "Ciko si burung rajutan duduk santai dengan mata terpejam.",
  },

  footnote: "*Diukur secara metodologis.",

  hero: {
    title: { before: "Transformasi digital yang ", accent: "memanusiakan." },
    lede: { before: "Sistem custom yang ", strong: "Anda miliki", after: "" },
    cta: "Sesi discovery gratis",
    ctaSecondary: "Lihat angka nyatanya",
    stats: [
      { value: "45%*", label: "efisiensi proses transaksi dan laporan" },
      { value: "10-18×", label: "rekonsiliasi lebih cepat" },
    ],
    ownership: {
      title: "Milik Anda sepenuhnya",
      body: "Dibuat hanya untuk anda",
    },
  },

  philosophy: {
    label: "Filosofi",
    cards: [
      {
        title: "Craft dulu, teknologi kemudian",
        body: "Pahami konteks masalahnya dulu. Tidak semua masalah butuh solusi teknologi.",
      },
      {
        title: "Memperkuat, bukan menggantikan",
        body: "Teknologi yang tepat melipatgandakan kapasitas tim Anda, tanpa ketergantungan baru.",
      },
    ],
  },

  services: {
    title: "Dua layanan, satu cara kerja",
    lede: "Keduanya dibangun khusus untuk Anda, dan sepenuhnya jadi milik Anda.",
    cta: "Mulai dari sini",
    detailsLabel: "Detail & skema investasi",
    audienceLabel: "Cocok untuk",
    tracks: [
      {
        label: "The Kitchen",
        title: "Business Operational",
        subtitle: "Kasir, keuangan, dan stok. Berjalan di perangkat Anda sendiri.",
        tone: "night",
        audience: ["UMKM", "Kafe", "Toko ritel", "Kasir", "Gudang"],
        stats: [
          { value: "45%*", label: "efisiensi transaksi & laporan" },
          { value: "10-18×", label: "rekonsiliasi lebih cepat" },
          { value: "Real-Time", label: "arus kas & tren" },
        ],
        details: [
          "Satu kali biaya pengembangan, tanpa langganan bulanan",
          "Data 100% di kendali fisik lokasi bisnis",
          "Berjalan di perangkat Anda, tanpa bergantung pada layanan luar",
          "Bisa dipantau dari jarak jauh kapan pun dibutuhkan",
          "Upgrade & iterasi fitur sesuai kebutuhan",
        ],
      },
      {
        label: "The Storefront",
        title: "Community & Branding",
        subtitle: "Situs + CMS yang Anda ubah sendiri, tanpa developer.",
        tone: "forest",
        audience: ["Company profile", "Portofolio", "Komunitas", "Branding"],
        stats: [
          { value: "~100", label: "skor kecepatan Google" },
          { value: "Global", label: "cepat dari kota mana pun" },
          { value: "Self-CMS", label: "tanpa antre developer" },
        ],
        details: [
          "Satu kali biaya pengembangan, tanpa langganan yang mengikat",
          "Tanpa biaya awal untuk skala kebutuhan umum",
          "Upgrade mandiri saat skala tumbuh",
          "Setiap form yang diisi pengunjung otomatis tercatat",
          "Iterasi konten tanpa perlu developer",
        ],
      },
    ],
  },

  proof: {
    title: "Hasil nyata dari sistem yang aktif",
    lede: "Semuanya sistem yang sedang berjalan, bukan proyeksi.",
    trackLabel: { kitchen: "Kitchen", storefront: "Storefront" },
    storyLabel: "Sebelum & sesudah",
    cases: [
      {
        name: "Mammo's Home Bakery",
        track: "kitchen",
        value: "45%*",
        result: "efisiensi proses transaksi dan laporan",
        meta: "POS & manajemen bisnis · Sumatera Utara",
        story:
          "Dulu kertas & spreadsheet, rekap 30-50 menit/hari. Kini transaksi dan laporan tercatat di satu sistem, tanpa overselling.",
      },
      {
        name: "Diversity of Sumatra Clothes",
        track: "kitchen",
        result: "Stok terlihat di semua lokasi",
        meta: "Inventaris multi-lokasi · Sumatera Utara",
        story:
          "Dulu staf menjual barang tanpa tahu ketersediaannya. Kini stok tiap lokasi tercatat di satu sistem.",
      },
      {
        name: "CS Dashboard Siswamedia",
        track: "kitchen",
        value: "10-18×",
        result: "rekonsiliasi lebih cepat",
        meta: "Platform monitoring · Jakarta",
        story:
          "Dulu WhatsApp & Google Sheets, selisih baru ketahuan akhir bulan. Kini analisis data 90 hari < 60 detik.",
      },
      {
        name: "Sadewa (Sayap Dewantara)",
        track: "storefront",
        result: "Pengurus update situs sendiri",
        meta: "Situs yayasan",
        url: "sadewaind.org",
        story:
          "Dulu situs Wix statis dan rekam jejak 15 tahun program tidak terdokumentasi publik. Kini bisa dibaca siapa saja, tanpa biaya sewa platform.",
      },
      {
        name: "LAKSA Bogor",
        track: "storefront",
        result: "Wisata Bogor kini ditemukan di Google",
        meta: "Direktori wisata Pemda",
        url: "laksabogor.info",
        story:
          "Dulu konten wisata terkubur di dalam chatbot. Kini staf Dinas mengubah info destinasi sendiri, dan warga bisa mencari faskes terdekat.",
      },
      {
        name: "Gernas Tastaka",
        track: "storefront",
        result: "Situs dua bahasa untuk mitra internasional",
        meta: "Nonprofit literasi · self-CMS tanpa kode",
        url: "gernastastaka.org",
        story:
          "Dulu WordPress lama tanpa jalur bahasa Inggris. Kini situsnya punya self-CMS: staf non-teknis menyusun halaman sendiri dari 24 blok siap pakai lewat dasbor berbahasa Indonesia, tanpa menulis satu baris kode. Dokumentasi kegiatan dipindah utuh.",
      },
    ],
  },

  value: {
    title: "Lebih dari sekadar transaksi",
    quote: "Keberhasilan sistem Anda adalah portofolio terbaik saya.",
    items: [
      "Jejaring bermakna",
      "Pembelajaran berkelanjutan",
      "Dampak sosial nyata",
    ],
    // Pagar §4 brand doc, ditulis eksplisit di halaman. Tanpa kalimat ini,
    // tiga chip di atasnya gampang terbaca sebagai isyarat bahwa harganya
    // bisa ditawar, persis kebalikan maksudnya.
    note: "Ketiganya berdiri di atas biaya pengembangan yang transparan, bukan menggantikannya.",
  },

  process: {
    title: "Dari masalah ke produk berjalan",
    steps: [
      { title: "Discovery", body: "Cari akar masalah, bukan gejalanya." },
      {
        title: "Spesifikasi & prototipe",
        body: "Estimasi transparan, tanpa kejutan biaya.",
      },
      {
        title: "Sprint eksekusi",
        body: "Lihat sistemnya tumbuh sejak hari pertama.",
      },
      {
        title: "Deployment & handover",
        body: "Dipasang, didokumentasikan, tim dilatih.",
      },
      {
        title: "Dukungan pasca-delivery",
        body: "Garansi bug dan jalur iterasi berikutnya.",
      },
    ],
  },

  /**
   * Angkanya dari kerja lapangan sebelum studio ini ada, bukan dari proyek
   * klien di `proof.cases`. Dua hal berbeda, dan menggabungkan keduanya
   * akan membuat keduanya sama-sama sulit dipercaya.
   */
  about: {
    title: "Bermula dari lapangan, bukan dari layar",
    location: "Bogor, Jawa Barat",
    body: "Sebelum jadi studio, kami duduk bersama pemilik usaha, guru, dan pengurus komunitas yang sistemnya masih buku tulis dan grup WhatsApp.",
    measure:
      "Ukurannya: masih dipakai tiga bulan kemudian, tanpa perlu ditemani.",
    facts: [
      { value: "Rp 200 jt", label: "hibah cair untuk 70 wirausaha" },
      { value: "6.117", label: "pengguna sistem di 15+ sekolah" },
      { value: "Rp 11,8 jt", label: "donasi dalam satu bulan kampanye" },
      { value: "290 rb+", label: "audiens dari dua kolaborasi kampanye" },
      { value: "20+ sesi", label: "uji coba dengan pengguna sungguhan" },
    ],
  },

  contact: {
    title: "Mari rancang solusinya bersama",
    lede: "Sesi pertama gratis dan tidak mengikat. Isi formnya, tim kami yang menghubungi Anda.",
  },

  team: {
    meta: {
      title: "Tim | Decaf Tech",
      description:
        "Kenali orang-orang di balik Decaf Tech, studio sistem custom dari Bogor.",
    },
    title: { before: "Tim ", accent: "Decaf" },
    listLabel: "Anggota tim",
    roles: {
      abi: "Founder · Product & Tech",
      fauzan: "Co-Founder · Operational & Sales",
    },
    photo: "Foto",
    linkHint: "Profil LinkedIn, buka di tab baru",
    closing: { title: "Ngobrol langsung dengan kami" },
  },

  footer: {
    tagline: "Memperkuat manusia, mengutamakan dampak.",
    otherLang: "English version",
    backoffice: "Masuk tim",
  },

  /**
   * Dua kolom wajib (nomor, bidang bisnis) dan satu cerita opsional. Tidak
   * satu pun menanyakan hal yang bisa ditunda ke percakapan pertama
   * (anggaran, jumlah karyawan, jadwal).
   */
  discovery: {
    title: "Sesi discovery gratis",
    fields: {
      phone: {
        label: "Nomor telepon / WhatsApp",
        placeholder: "0812xxxxxxxx",
      },
      business: {
        label: "Bidang atau jenis bisnis",
        placeholder: "Kafe 2 cabang, toko bangunan, yayasan…",
      },
      interest: {
        label: "Ceritakan masalah bisnis Anda",
        placeholder: "Contoh: stok masih dicatat manual dan sering selisih.",
      },
    },
    optional: "(opsional)",
    honeypot: "Jangan diisi",
    submit: "Kirim & tunggu dihubungi",
    pending: "Mengirim…",
    successTitle: "Terkirim. Terima kasih!",
    successBody:
      "Tim kami menghubungi Anda lewat nomor tadi, paling lambat 1×24 jam kerja. Tidak perlu menyiapkan apa pun.",
    reset: "Isi ulang form",
    fallback: "Lebih suka langsung?",
    fallbackLink: "Sapa kami di LinkedIn",
    errors: {
      empty: "Nomor telepon dan bidang bisnis masih harus diisi.",
      phone: "Nomornya sepertinya belum lengkap. Coba cek lagi.",
      business: "Sebutkan bidang bisnisnya sedikit lebih jelas.",
      interest: "Ceritakan sedikit lebih panjang, atau kosongkan saja.",
      failed:
        "Maaf, pengirimannya gagal. Coba sekali lagi, atau sapa kami di LinkedIn.",
    },
  },
};
